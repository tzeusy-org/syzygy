import * as fs from 'node:fs';
import path from 'node:path';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, sha256 } from '@syzygy/support';
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

function privateDirectory(stat: fs.BigIntStats): boolean {
  return stat.isDirectory() && stat.uid === BigInt(process.getuid?.() ?? -1) && (stat.mode & 0o7777n) === 0o700n;
}

function sameIdentity(a: fs.BigIntStats, b: fs.BigIntStats): boolean {
  return a.dev === b.dev && a.ino === b.ino && a.uid === b.uid && a.mode === b.mode;
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
      || !path.isAbsolute(root) || path.resolve(root) !== root || fs.realpathSync(root) !== root
      || !path.isAbsolute(subject.run) || path.resolve(subject.run) !== subject.run || fs.realpathSync(subject.run) !== subject.run
      || path.basename(subject.run) !== subject.runId || subject.run.startsWith(`${root}/`) || root.startsWith(`${subject.run}/`)
      || !GENERATION.test(subject.generation) || !HEX.test(subject.coreSha256) || !HEX.test(subject.declarationSha256)
      || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(subject.sourcePin)
      || !/^attempt-[a-zA-Z0-9]{6}$/u.test(attempt) || auditDirectory !== path.join(root, 'acquisitions', attempt)
      || fs.realpathSync(auditDirectory) !== auditDirectory || !privateDirectory(fs.lstatSync(auditDirectory, { bigint: true }))
      || machine.clients.some(client => client.context.runId !== subject.runId || client.context.deadline !== subject.deadline
        || client.context.sourcePin !== subject.sourcePin)) return false;
    const stoppedAt = now();
    const authority = (): boolean => current() && Number.isSafeInteger(stoppedAt)
      && stoppedAt >= machine.observedAt && now() >= stoppedAt && now() < subject.deadline;
    if (!authority()) return false;
    rootFd = fs.openSync(root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const directoryFd = rootFd, stat = fs.fstatSync(rootFd, { bigint: true });
    const rootCurrent = (): boolean => privateDirectory(stat) && sameIdentity(stat, fs.fstatSync(directoryFd, { bigint: true }))
      && sameIdentity(stat, fs.lstatSync(root, { bigint: true })) && fs.realpathSync(root) === root && authority();
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
    const slot = `/proc/self/fd/${rootFd}/${sha256(subject.run)}.stopped.json`;
    slotFd = fs.openSync(slot, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK, 0o600);
    fs.writeFileSync(slotFd, text);
    fs.fsyncSync(slotFd);
    const written = fs.fstatSync(slotFd, { bigint: true }), named = fs.lstatSync(slot, { bigint: true });
    if (!written.isFile() || written.uid !== stat.uid || written.nlink !== 1n || (written.mode & 0o7777n) !== 0o600n
      || written.size !== BigInt(length) || !sameIdentity(written, named) || named.size !== written.size
      || named.mtimeNs !== written.mtimeNs || named.ctimeNs !== written.ctimeNs || !rootCurrent()) return false;
    fs.fsyncSync(rootFd);
    return rootCurrent();
  } catch { return false; }
  finally {
    try { if (slotFd !== undefined) fs.closeSync(slotFd); }
    finally { if (rootFd !== undefined) fs.closeSync(rootFd); }
  }
}
