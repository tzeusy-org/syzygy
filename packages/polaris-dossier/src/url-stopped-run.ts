import * as fs from 'node:fs';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { decodeUtf8, deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { RUN_ID } from './state-directory.js';
import type { UrlFrozenProductHistory } from './url-frozen-product-history.js';
import { isUrlRunMachineClosedHistory, type UrlRunMachineClosedHistory } from './url-run-machine.js';
import type { UrlRunSessionsSummary } from './url-run-sessions.js';
import type { UrlSessionAuditHistoryExpected } from './url-session-audit-history.js';
import type { UrlSourceStore } from './url-source-reader.js';
import { captureUrlRolePlans, type UrlRetainedRolePlan, type UrlRolePlan } from './url-role-plan.js';

const FORMAT = 'polaris-url-stopped-boundary/2';
export const URL_STOPPED_HISTORY_LIMIT = 64;
// The frozen provenance graph has a 2 MiB bound of its own. The enclosing
// immutable machine/profile/stop observation must fit alongside that graph.
const LIMITS = { maxBytes: 4_194_304, maxNodes: 131_072, maxDepth: 40 };
const HEX = /^[a-f0-9]{64}$/u;
const GENERATION = /^[a-f0-9]{32}$/u;

interface StoppedRunSubject {
  readonly run: string; readonly runId: string; readonly generation: string;
  readonly coreSha256: string; readonly declarationSha256: string;
  readonly sourcePin: string; readonly sourceStore: UrlSourceStore; readonly deadline: number;
}
export interface StoppedRunBoundary extends StoppedRunSubject {
  readonly format: typeof FORMAT;
  readonly attempt: string;
  readonly machineAttempt: string;
  readonly predecessor: { readonly generation: string; readonly sha256: string } | null;
  readonly roles: readonly UrlRetainedRolePlan[];
  readonly stoppedAt: number;
  readonly audit: UrlSessionAuditHistoryExpected;
  readonly machine: UrlRunMachineClosedHistory;
  readonly products: UrlFrozenProductHistory;
  readonly spend: Pick<UrlRunSessionsSummary['budget'], 'requestReservations' | 'completeUsageReports' | 'reportedTokens'>;
}
export interface UrlStoppedBoundary {
  readonly record: StoppedRunBoundary;
  readonly sha256: string;
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

function stopSlot(rootFd: number, run: string, generation: string): string {
  return `/proc/self/fd/${rootFd}/${sha256(run)}.${generation}.stopped.json`;
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
  readonly plans: readonly UrlRolePlan[];
  readonly predecessor?: UrlStoppedBoundary;
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
    const roles = captureUrlRolePlans(input.plans);
    let prior = input.predecessor;
    if (prior !== undefined) {
      const history = readUrlStoppedBoundaryChain(root, { ...subject, generation: prior.record.generation }, stoppedAt);
      const anchored = history?.at(-1);
      if (!history || history.length >= URL_STOPPED_HISTORY_LIMIT || !anchored || anchored.sha256 !== prior.sha256) return false;
      prior = anchored;
      if (prior.record.generation === subject.generation || prior.record.stoppedAt > stoppedAt
        || prior.record.machine.identitySha256 !== machine.identitySha256
        || prior.record.sourceStore !== subject.sourceStore
        || encodeCanonicalJson(prior.record.roles, LIMITS) !== encodeCanonicalJson(roles, LIMITS)
        || budget.requestReservations < prior.record.spend.requestReservations
        || budget.completeUsageReports < prior.record.spend.completeUsageReports
        || (typeof prior.record.spend.reportedTokens === 'number'
          && (typeof budget.reportedTokens !== 'number' || budget.reportedTokens < prior.record.spend.reportedTokens))) return false;
    }
    const { requestReservations, completeUsageReports, reportedTokens } = budget;
    const record: StoppedRunBoundary = deepFreeze({ ...subject, format: FORMAT, attempt,
      machineAttempt: prior?.record.machineAttempt ?? attempt,
      predecessor: prior === undefined ? null : { generation: prior.record.generation, sha256: prior.sha256 },
      roles, stoppedAt, audit, machine,
      products, spend: { requestReservations, completeUsageReports, reportedTokens } });
    const canonical = encodeCanonicalJson(record, LIMITS);
    const text = `${encodeCanonicalJson({ record, sha256: sha256(canonical) }, LIMITS)}\n`;
    const length = Buffer.byteLength(text);
    if (length > LIMITS.maxBytes || !rootCurrent()) return false;
    const slot = stopSlot(rootFd, subject.run, subject.generation);
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

export type StopExpected = Omit<StoppedRunSubject, 'sourceStore'>;

function matchesSubject(value: unknown, expected: StopExpected, asOf: number): value is StoppedRunBoundary {
  if (!exact(value, ['format', 'run', 'runId', 'generation', 'coreSha256', 'declarationSha256', 'sourcePin', 'sourceStore',
    'deadline', 'attempt', 'machineAttempt', 'predecessor', 'roles', 'stoppedAt', 'audit', 'machine', 'products', 'spend']) || value.format !== FORMAT
    || value.run !== expected.run || value.runId !== expected.runId || value.generation !== expected.generation
    || value.coreSha256 !== expected.coreSha256 || value.declarationSha256 !== expected.declarationSha256
    || value.sourcePin !== expected.sourcePin || value.deadline !== expected.deadline
    || (value.sourceStore !== 'owned-loose' && value.sourceStore !== 'supplied') || typeof value.attempt !== 'string'
    || !ATTEMPT.test(value.attempt) || typeof value.machineAttempt !== 'string' || !ATTEMPT.test(value.machineAttempt)
    || (value.predecessor !== null && (!exact(value.predecessor, ['generation', 'sha256'])
      || typeof value.predecessor.generation !== 'string' || !GENERATION.test(value.predecessor.generation)
      || typeof value.predecessor.sha256 !== 'string' || !HEX.test(value.predecessor.sha256)
      || value.predecessor.generation === value.generation))
    || !Array.isArray(value.roles) || value.roles.length !== 4
    || !whole(value.stoppedAt) || !whole(asOf) || value.stoppedAt > asOf || asOf >= expected.deadline
    || !isRecord(value.audit) || !isRecord(value.machine) || !isRecord(value.products)
    || !exact(value.spend, ['requestReservations', 'completeUsageReports', 'reportedTokens'])) return false;
  const { requestReservations, completeUsageReports, reportedTokens } = value.spend;
  return whole(requestReservations) && whole(completeUsageReports) && completeUsageReports <= requestReservations
    && (completeUsageReports === 0 ? reportedTokens === 'Unknown' : whole(reportedTokens));
}

/** The visitor remains inside the fresh descriptor/name/root bracket. No
 * caller may substitute a retained stat or authorize from a prior read. */
function withStoppedBoundaryBytes<T>(root: string, expected: StopExpected, visit: (bytes: Buffer) => T | null): T | null {
  try {
    if (!namesBound(root, expected.run, expected.runId) || !SHA_PIN.test(expected.sourcePin) || !GENERATION.test(expected.generation)
      || !HEX.test(expected.coreSha256) || !HEX.test(expected.declarationSha256)) return null;
    const rootFd = fs.openSync(root, DESCRIPTOR);
    try {
      const rootStat = fs.fstatSync(rootFd, { bigint: true });
      if (!checkedRoot(root, rootFd, rootStat)) return null;
      const slot = stopSlot(rootFd, expected.run, expected.generation);
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
        const result = visit(bytes.subarray(0, length));
        if (result === null || !sameSlot(before, fs.fstatSync(fd, { bigint: true })) || !sameSlot(before, fs.lstatSync(slot, { bigint: true }))
          || !checkedRoot(root, rootFd, rootStat)) return null;
        return result;
      } finally { fs.closeSync(fd); }
    } finally { fs.closeSync(rootFd); }
  } catch { return null; }
}
function decodeStoppedBoundary(bytes: Buffer, expected: StopExpected, asOf: number): UrlStoppedBoundary | null {
  const text = decodeUtf8(bytes.subarray(0, bytes.length - 1));
  if (text === undefined) return null;
  const value = parseBoundedJson(text, LIMITS);
  if (!exact(value, ['record', 'sha256']) || typeof value.sha256 !== 'string' || !matchesSubject(value.record, expected, asOf)
    || value.sha256 !== sha256(encodeCanonicalJson(value.record, LIMITS)) || text !== encodeCanonicalJson(value, LIMITS)) return null;
  return { record: value.record, sha256: value.sha256 };
}
/** Load only the supervisor-owned expected checkpoint. Audit, machine, source
 * and product evidence are independently reverified before any new grant. */
export function readUrlStoppedBoundary(root: string, expected: StopExpected, asOf: number): UrlStoppedBoundary | null {
  const result = withStoppedBoundaryBytes(root, expected, bytes => decodeStoppedBoundary(bytes, expected, asOf));
  return result === null ? null : deepFreeze(result);
}

/** Chronological immutable observations. This verifies linkage and immutable
 * subjects only. Every attempt's audit/machine evidence still needs the cold
 * verifier, and no member of this array is a grant. */
export function readUrlStoppedBoundaryChain(root: string, expected: StopExpected, asOf: number): readonly UrlStoppedBoundary[] | null {
  const history: UrlStoppedBoundary[] = [], generations = new Set<string>(), attempts = new Set<string>();
  let next = expected.generation, linked: string | null = null;
  for (let count = 0; count < URL_STOPPED_HISTORY_LIMIT; count++) {
    if (generations.has(next)) return null;
    generations.add(next);
    const boundary = readUrlStoppedBoundary(root, { ...expected, generation: next }, asOf);
    if (!boundary || (linked !== null && boundary.sha256 !== linked)) return null;
    if (attempts.has(boundary.record.attempt)) return null;
    attempts.add(boundary.record.attempt);
    const newer = history.at(-1);
    if (newer && (boundary.record.stoppedAt > newer.record.stoppedAt
      || boundary.record.machineAttempt !== newer.record.machineAttempt
      || boundary.record.sourceStore !== newer.record.sourceStore
      || boundary.record.machine.identitySha256 !== newer.record.machine.identitySha256
      || encodeCanonicalJson(boundary.record.roles, LIMITS) !== encodeCanonicalJson(newer.record.roles, LIMITS))) return null;
    history.push(boundary);
    if (boundary.record.predecessor === null) {
      if (boundary.record.machineAttempt !== boundary.record.attempt) return null;
      return Object.freeze(history.reverse());
    }
    next = boundary.record.predecessor.generation;
    linked = boundary.record.predecessor.sha256;
  }
  return null;
}

export interface UrlRecoveryClaim {
  /** True only after durable consumption, while the held OS lease and exact
   * original stopped subject are current. Holding a lease alone is no grant. */
  readonly current: () => boolean;
  /** Recheck policy asynchronously, then recheck the exact consumed subject. */
  readonly currentAsync: () => Promise<boolean>;
  /** Commit one-way consumption before issuing any fresh process authority. */
  readonly consume: () => boolean;
  /** Cleanup only. A consumed generation can never be claimed again. A crash
   * retains its directory lock; no timeout/PID guess silently steals it. */
  readonly release: () => boolean;
}
const claims = new WeakSet<UrlRecoveryClaim>();
export function isUrlRecoveryClaim(value: unknown): value is UrlRecoveryClaim {
  return isRecord(value) && claims.has(value as unknown as UrlRecoveryClaim);
}

/** Protected cross-process exclusion, separate from writable supervisor JSON.
 * The cold verifier is the caller: acquisition itself proves no audit/source
 * validity and cannot authorize a process without consume and fresh mediation. */
export function acquireUrlRecoveryClaim(input: {
  readonly root: string; readonly expected: StopExpected; readonly sha256: string;
  readonly now: () => number; readonly current: () => boolean;
  readonly policy: { readonly current: () => boolean; readonly currentAsync: () => Promise<boolean> };
}): UrlRecoveryClaim | null {
  let rootFd: number | undefined, lockFd: number | undefined;
  try {
    input = Object.freeze({ ...input, expected: Object.freeze({ ...input.expected }), policy: Object.freeze({ ...input.policy }) });
    const authorityCurrent = (): boolean => input.current() && input.policy.current();
    const key = sha256(input.expected.run);
    if (!exact(input.expected, ['run', 'runId', 'generation', 'coreSha256', 'declarationSha256', 'sourcePin', 'deadline'])
      || !HEX.test(input.sha256) || !namesBound(input.root, input.expected.run, input.expected.runId)
      || !GENERATION.test(input.expected.generation) || !authorityCurrent()) return null;
    rootFd = fs.openSync(input.root, DESCRIPTOR);
    const directoryFd = rootFd, rootStat = fs.fstatSync(directoryFd, { bigint: true });
    if (!checkedRoot(input.root, directoryFd, rootStat)) return null;
    const base = `/proc/self/fd/${directoryFd}`, lock = `${base}/${key}.recovery.lock`, consumed = `${base}/${key}.${input.expected.generation}.resumed.json`;
    // mkdir is the atomic OS primitive. Neither copied JSON nor a PID/clock
    // assertion can obtain or replace a currently held directory.
    fs.mkdirSync(lock, { mode: 0o700 });
    lockFd = fs.openSync(lock, DESCRIPTOR);
    const heldFd = lockFd, lockStat = fs.fstatSync(heldFd, { bigint: true });
    let released = false, releaseResult = false, consumedStat: fs.BigIntStats | undefined;
    let retained: { readonly bytes: Buffer; readonly boundary: UrlStoppedBoundary } | undefined;
    const own = (): boolean => {
      try { return !released && checkedRoot(input.root, directoryFd, rootStat) && privateDirectory(lockStat)
        && sameIdentity(lockStat, fs.fstatSync(heldFd, { bigint: true }))
        && sameIdentity(lockStat, fs.lstatSync(lock, { bigint: true })) && fs.readdirSync(lock).length === 0; }
      catch { return false; }
    };
    const unconsumed = (): boolean => {
      try { fs.lstatSync(consumed); return false; }
      catch (error) { return (error as NodeJS.ErrnoException).code === 'ENOENT'; }
    };
    const markerCurrent = (): boolean => {
      try { return consumedStat === undefined ? unconsumed() : sameSlot(consumedStat, fs.lstatSync(consumed, { bigint: true })); }
      catch { return false; }
    };
    const boundaryCurrent = (): boolean => {
      const asOf = input.now(), previous = retained;
      if (previous !== undefined) return withStoppedBoundaryBytes(input.root, input.expected, bytes =>
        previous.bytes.equals(bytes) && matchesSubject(previous.boundary.record, input.expected, asOf) ? true : null) === true;
      const first = withStoppedBoundaryBytes(input.root, input.expected, bytes => {
        const boundary = decodeStoppedBoundary(bytes, input.expected, asOf);
        return boundary?.sha256 === input.sha256 ? { boundary, bytes: Buffer.from(bytes) } : null;
      });
      if (first === null) return false;
      // Retain only deterministic decoding of these exact bounded bytes.
      // Every later callback still reads them afresh and checks live authority.
      retained = { boundary: deepFreeze(first.boundary), bytes: first.bytes };
      return true;
    };
    const heldCurrent = (): boolean => {
      try { return own() && authorityCurrent() && markerCurrent() && boundaryCurrent(); }
      catch { return false; }
    };
    const ownsConsumedBoundary = (): boolean => consumedStat !== undefined && own() && markerCurrent();
    const recheckConsumedBoundary = (): boolean => ownsConsumedBoundary() && boundaryCurrent() && input.current() === true;
    const current = (): boolean => {
      try {
        // Check the live run record at release, after the blocking policy
        // probe and the fresh read of the consumed stop boundary.
        return ownsConsumedBoundary() && input.policy.current() === true && recheckConsumedBoundary();
      } catch { return false; }
    };
    const currentAsync = async (): Promise<boolean> => {
      try {
        if (!ownsConsumedBoundary() || input.current() !== true || await input.policy.currentAsync() !== true) return false;
        // The policy check may suspend. Recheck the lease, marker and exact
        // stopped bytes before admitting the freshly checked run record.
        return recheckConsumedBoundary();
      } catch { return false; }
    };
    if (!heldCurrent()) {
      if (own()) { fs.rmdirSync(lock); fs.fsyncSync(directoryFd); }
      return null;
    }
    fs.fsyncSync(directoryFd);
    const claim: UrlRecoveryClaim = Object.freeze({ current, currentAsync,
      consume: (): boolean => {
        if (consumedStat !== undefined) return heldCurrent();
        if (!heldCurrent()) return false;
        let fd: number | undefined;
        try {
          fd = fs.openSync(consumed, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | MODES, 0o600);
          const text = `${encodeCanonicalJson({ format: 'url-stopped-boundary-consumption/1', ...input.expected,
            boundarySha256: input.sha256 }, LIMITS)}\n`;
          fs.writeFileSync(fd, text); fs.fsyncSync(fd);
          const stat = fs.fstatSync(fd, { bigint: true });
          if (!ownedSlot(stat, rootStat) || stat.size !== BigInt(Buffer.byteLength(text))
            || !sameSlot(stat, fs.lstatSync(consumed, { bigint: true })) || !own()) return false;
          fs.fsyncSync(directoryFd); consumedStat = stat;
          return heldCurrent();
        } catch { return false; }
        finally { if (fd !== undefined) fs.closeSync(fd); }
      },
      release: (): boolean => {
        if (released) return releaseResult;
        try {
          if (!own() || !markerCurrent()) return false;
          fs.rmdirSync(lock); fs.fsyncSync(directoryFd);
          return releaseResult = true;
        } catch { return false; }
        finally {
          // Unknown replacement locks are retained; this holder's fds can
          // still close without making an inconsistent recovery reusable.
          released = true; retained = undefined;
          fs.closeSync(heldFd); fs.closeSync(directoryFd);
        }
      },
    });
    claims.add(claim);
    rootFd = undefined; lockFd = undefined;
    return claim;
  } catch { return null; }
  finally {
    // Failure after obtaining a lease retains it unless the validated path
    // above explicitly removed it. No uncertain operation can be retried as
    // if no owner had acquired the boundary.
    if (lockFd !== undefined) fs.closeSync(lockFd);
    if (rootFd !== undefined) fs.closeSync(rootFd);
  }
}
