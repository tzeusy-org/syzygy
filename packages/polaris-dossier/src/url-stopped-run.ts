import * as fs from 'node:fs';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { decodeUtf8, deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { RUN_ID } from './state-directory.js';
import type { UrlFrozenProductHistory } from './url-run-artifacts.js';
import { isUrlRunMachineClosedHistory, type UrlRunMachineClosedHistory } from './url-run-machine.js';
import type { UrlRunSessionsSummary } from './url-run-sessions.js';
import type { UrlSessionAuditHistoryExpected } from './url-session-audit-history.js';
import type { UrlSourceStore } from './url-source-reader.js';

const FORMAT = 'polaris-url-stopped-boundary/1';
const LIMITS = { maxBytes: 262_144, maxNodes: 32_768, maxDepth: 16 };
const HEX = /^[a-f0-9]{64}$/u;
const GENERATION = /^[a-f0-9]{32}$/u;

interface StoppedRunSubject {
  readonly run: string; readonly runId: string; readonly generation: string;
  readonly coreSha256: string; readonly declarationSha256: string;
  readonly sourcePin: string; readonly sourceStore: UrlSourceStore; readonly deadline: number;
}
interface StoppedRunBoundary extends StoppedRunSubject {
  readonly format: typeof FORMAT;
  readonly attempt: string;
  readonly stoppedAt: number;
  readonly audit: UrlSessionAuditHistoryExpected;
  readonly machine: UrlRunMachineClosedHistory;
  readonly products: UrlFrozenProductHistory;
  readonly spend: Pick<UrlRunSessionsSummary['budget'], 'requestReservations' | 'completeUsageReports' | 'reportedTokens'>;
}

const SHA_PIN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const ATTEMPT = /^attempt-[a-zA-Z0-9]{6}$/u;
const MODES = fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK;
const DESCRIPTOR = fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | MODES;
const whole = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const exact = (value: unknown, fields: readonly string[]): value is Record<string, unknown> =>
  isRecord(value) && Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));

function privateDirectory(stat: fs.BigIntStats): boolean {
  return stat.isDirectory() && stat.uid === BigInt(process.getuid?.() ?? -1) && (stat.mode & 0o077n) === 0n;
}

function sameIdentity(a: fs.BigIntStats, b: fs.BigIntStats): boolean {
  return a.dev === b.dev && a.ino === b.ino && a.uid === b.uid && a.mode === b.mode;
}

function namesBound(root: string, run: string, runId: string): boolean {
  return path.isAbsolute(root) && path.resolve(root) === root && fs.realpathSync(root) === root
    && path.isAbsolute(run) && path.resolve(run) === run && fs.realpathSync(run) === run
    && path.basename(run) === runId && RUN_ID.test(runId)
    && run !== root && !run.startsWith(`${root}/`) && !root.startsWith(`${run}/`);
}

function checkedRoot(root: string, fd: number, stat: fs.BigIntStats): boolean {
  return privateDirectory(stat) && sameIdentity(stat, fs.fstatSync(fd, { bigint: true }))
    && sameIdentity(stat, fs.lstatSync(root, { bigint: true })) && fs.realpathSync(root) === root;
}

function stopSlot(rootFd: number, run: string): string {
  return `/proc/self/fd/${rootFd}/${sha256(run)}.stopped.json`;
}

function ownedSlot(stat: fs.BigIntStats, parent: fs.BigIntStats): boolean {
  return stat.isFile() && stat.uid === parent.uid && stat.nlink === 1n
    && (stat.mode & 0o7777n) === 0o600n && stat.size > 0n && stat.size <= BigInt(LIMITS.maxBytes);
}

function sameSlot(before: fs.BigIntStats, after: fs.BigIntStats): boolean {
  return sameIdentity(before, after) && before.nlink === after.nlink && before.size === after.size
    && before.mtimeNs === after.mtimeNs && before.ctimeNs === after.ctimeNs;
}

/** Retain an immutable host-only observation after the caller has established
 * clean operator stop. It carries no authority to resume or replay a request. */
export function retainUrlStoppedBoundary(input: {
  readonly root: string; readonly auditDirectory: string; readonly subject: StoppedRunSubject;
  readonly settled: UrlRunSessionsSummary; readonly now: () => number; readonly current: () => boolean;
  readonly capture: () => UrlFrozenProductHistory;
}): boolean {
  const { root, auditDirectory, subject, settled, now, current, capture } = input;
  const audit = settled.closedAuditHistory, machine = settled.closedMachineHistory, budget = settled.budget;
  const attempt = path.basename(auditDirectory);
  let rootFd: number | undefined, slotFd: number | undefined;
  try {
    if (settled.failure !== null || budget.reason !== null || budget.heldDesignTurns !== 0 || budget.pendingRoles.length !== 0
      || !audit || !isUrlRunMachineClosedHistory(machine) || machine.identitySha256 !== settled.machine?.identitySha256
      || !namesBound(root, subject.run, subject.runId)
      || !GENERATION.test(subject.generation) || !HEX.test(subject.coreSha256) || !HEX.test(subject.declarationSha256)
      || !SHA_PIN.test(subject.sourcePin) || !ATTEMPT.test(attempt) || auditDirectory !== path.join(root, 'acquisitions', attempt)
      || (subject.sourceStore !== 'owned-loose' && subject.sourceStore !== 'supplied')
      || fs.realpathSync(auditDirectory) !== auditDirectory || !privateDirectory(fs.lstatSync(auditDirectory, { bigint: true }))
      || machine.clients.some(client => client.context.runId !== subject.runId || client.context.deadline !== subject.deadline
        || client.context.sourcePin !== subject.sourcePin)) return false;
    const stoppedAt = now();
    const authority = (): boolean => current() && Number.isSafeInteger(stoppedAt)
      && stoppedAt >= machine.observedAt && now() >= stoppedAt && now() < subject.deadline;
    if (!authority()) return false;
    rootFd = fs.openSync(root, DESCRIPTOR);
    const directoryFd = rootFd, stat = fs.fstatSync(rootFd, { bigint: true });
    const rootCurrent = (): boolean => checkedRoot(root, directoryFd, stat) && authority();
    if (!rootCurrent()) return false;
    const products = capture();
    if (products.runId !== subject.runId || products.coreSha256 !== subject.coreSha256 || products.declarationSha256 !== subject.declarationSha256) return false;
    const { requestReservations, completeUsageReports, reportedTokens } = budget;
    const record: StoppedRunBoundary = deepFreeze({ ...subject, format: FORMAT, attempt, stoppedAt, audit, machine,
      products, spend: { requestReservations, completeUsageReports, reportedTokens } });
    const canonical = encodeCanonicalJson(record, LIMITS);
    const text = `${encodeCanonicalJson({ record, sha256: sha256(canonical) }, LIMITS)}\n`;
    const length = Buffer.byteLength(text);
    if (length > LIMITS.maxBytes || !rootCurrent()) return false;
    const slot = stopSlot(rootFd, subject.run);
    slotFd = fs.openSync(slot, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | MODES, 0o600);
    fs.writeFileSync(slotFd, text);
    fs.fsyncSync(slotFd);
    const written = fs.fstatSync(slotFd, { bigint: true }), named = fs.lstatSync(slot, { bigint: true });
    if (!ownedSlot(written, stat) || written.size !== BigInt(length) || !sameSlot(written, named) || !rootCurrent()) return false;
    fs.fsyncSync(rootFd);
    return rootCurrent();
  } catch { return false; }
  finally {
    try { if (slotFd !== undefined) fs.closeSync(slotFd); }
    finally { if (rootFd !== undefined) fs.closeSync(rootFd); }
  }
}

type StopExpected = Omit<StoppedRunSubject, 'sourceStore'>;

function matchesSubject(value: unknown, expected: StopExpected, asOf: number): value is StoppedRunBoundary {
  if (!exact(value, ['format', 'run', 'runId', 'generation', 'coreSha256', 'declarationSha256', 'sourcePin', 'sourceStore',
    'deadline', 'attempt', 'stoppedAt', 'audit', 'machine', 'products', 'spend']) || value.format !== FORMAT
    || value.run !== expected.run || value.runId !== expected.runId || value.generation !== expected.generation
    || value.coreSha256 !== expected.coreSha256 || value.declarationSha256 !== expected.declarationSha256
    || value.sourcePin !== expected.sourcePin || value.deadline !== expected.deadline
    || (value.sourceStore !== 'owned-loose' && value.sourceStore !== 'supplied') || typeof value.attempt !== 'string'
    || !ATTEMPT.test(value.attempt) || !whole(value.stoppedAt) || !whole(asOf) || value.stoppedAt > asOf || asOf >= expected.deadline
    || !isRecord(value.audit) || !isRecord(value.machine) || !isRecord(value.products)
    || !exact(value.spend, ['requestReservations', 'completeUsageReports', 'reportedTokens'])) return false;
  const { requestReservations, completeUsageReports, reportedTokens } = value.spend;
  return whole(requestReservations) && whole(completeUsageReports) && completeUsageReports <= requestReservations
    && (completeUsageReports === 0 ? reportedTokens === 'Unknown' : whole(reportedTokens));
}

/** Load only the supervisor-owned expected checkpoint. Audit, machine, source
 * and product evidence are independently reverified before any new grant. */
export function readUrlStoppedBoundary(root: string, expected: StopExpected, asOf: number):
  { readonly record: StoppedRunBoundary; readonly sha256: string } | null {
  try {
    if (!namesBound(root, expected.run, expected.runId) || !SHA_PIN.test(expected.sourcePin) || !GENERATION.test(expected.generation)
      || !HEX.test(expected.coreSha256) || !HEX.test(expected.declarationSha256)) return null;
    const rootFd = fs.openSync(root, DESCRIPTOR);
    try {
      const rootStat = fs.fstatSync(rootFd, { bigint: true });
      if (!checkedRoot(root, rootFd, rootStat)) return null;
      const slot = stopSlot(rootFd, expected.run);
      const fd = fs.openSync(slot, fs.constants.O_RDONLY | MODES);
      try {
        const before = fs.fstatSync(fd, { bigint: true });
        if (!ownedSlot(before, rootStat)) return null;
        const bytes = Buffer.alloc(Number(before.size) + 1);
        let length = 0;
        while (length < bytes.length) {
          const read = fs.readSync(fd, bytes, length, bytes.length - length, length);
          if (read === 0) break;
          length += read;
        }
        if (length !== Number(before.size) || bytes[length - 1] !== 10) return null;
        const text = decodeUtf8(bytes.subarray(0, length - 1));
        if (text === undefined) return null;
        const value = parseBoundedJson(text, LIMITS);
        if (!exact(value, ['record', 'sha256']) || typeof value.sha256 !== 'string' || !matchesSubject(value.record, expected, asOf)
          || value.sha256 !== sha256(encodeCanonicalJson(value.record, LIMITS)) || text !== encodeCanonicalJson(value, LIMITS)) return null;
        if (!sameSlot(before, fs.fstatSync(fd, { bigint: true })) || !sameSlot(before, fs.lstatSync(slot, { bigint: true }))
          || !checkedRoot(root, rootFd, rootStat)) return null;
        return deepFreeze({ record: value.record, sha256: value.sha256 });
      } finally { fs.closeSync(fd); }
    } finally { fs.closeSync(rootFd); }
  } catch { return null; }
}
