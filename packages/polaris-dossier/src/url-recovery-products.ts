import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { isColdUrlRunMachineHistory, type ColdUrlRunMachineHistory } from './url-machine-cold-history.js';
import { readVerifiedUrlAuditLaunches, type VerifiedUrlSessionAuditHistory } from './url-session-audit-history.js';
import { URL_HELPER_LAUNCH_FILES, isUrlHelperLaunchFile, type UrlLaunchHistoryRole } from './url-launch-history.js';
import { readUrlStoppedBoundary, readUrlStoppedBoundaryChain } from './url-stopped-run.js';
import { verifyUrlFrozenProductHistory, type UrlFrozenProductHistory } from './url-frozen-product-history.js';

const BOUNDS = { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 };
const same = (a: unknown, b: unknown): boolean => encodeCanonicalJson(a, BOUNDS) === encodeCanonicalJson(b, BOUNDS);
const auditSubject = (value: NonNullable<ReturnType<typeof readVerifiedUrlAuditLaunches>>) => ({
  runId: value.runId, sourceBindingSha256: value.sourceBindingSha256, basePolicySha256: value.basePolicySha256,
  originPolicySha256: value.originPolicySha256, pin: value.pin, principal: value.principal,
});
declare const productBrand: unique symbol;
/** Fresh proof of independently checked historical products, never a process,
 * provider, machine-client or live-effect grant. No object shape issues one. */
export interface UrlVerifiedRecoveryProducts { readonly [productBrand]: true }
export interface UrlRecoveryProductsOptions {
  readonly hostRoot: string;
  readonly expected: Parameters<typeof readUrlStoppedBoundary>[1];
  readonly boundarySha256: string;
  readonly machine: ColdUrlRunMachineHistory;
  readonly audits?: readonly VerifiedUrlSessionAuditHistory[];
  readonly now: () => number;
  readonly current: () => boolean;
}
interface Verified {
  readonly input: UrlRecoveryProductsOptions;
  readonly history: UrlFrozenProductHistory;
  readonly launches: Readonly<Partial<Record<UrlLaunchHistoryRole, string>>>;
  readonly auditSubject: ReturnType<typeof readVerifiedUrlAuditLaunches>;
  consumed: boolean;
}
const issued = new WeakMap<UrlVerifiedRecoveryProducts, Verified>();
function auditedLaunches(input: UrlRecoveryProductsOptions, history: UrlFrozenProductHistory) {
  const roles = Object.keys(URL_HELPER_LAUNCH_FILES) as UrlLaunchHistoryRole[];
  const retained = history.records.filter(record => roles.some(role => isUrlHelperLaunchFile(role, record.path)));
  if (input.audits === undefined) {
    if (retained.length !== 0) return null;
    return { launches: Object.freeze({}) as Readonly<Partial<Record<UrlLaunchHistoryRole, string>>>, subject: null };
  }
  const cuts = readUrlStoppedBoundaryChain(input.hostRoot, input.expected, input.now());
  if (!cuts || cuts.length !== input.audits.length) return null;
  let subject: ReturnType<typeof readVerifiedUrlAuditLaunches> = null;
  const launches: Partial<Record<UrlLaunchHistoryRole, string>> = {};
  for (const [index, cut] of cuts.entries()) {
    const audit = input.audits[index]!, observed = readVerifiedUrlAuditLaunches(audit);
    if (!observed || audit.records !== cut.record.audit.durableRecords || audit.bytes !== cut.record.audit.durableBytes
      || audit.tipSha256 !== cut.record.audit.tipSha256 || observed.runId !== input.expected.runId || observed.pin !== input.expected.sourcePin
      || input.machine.clients.some(client => client.context.policySha256 !== observed.originPolicySha256)
      || (subject !== null && (!same(auditSubject(subject), auditSubject(observed))))) return null;
    subject = observed;
    for (const role of roles) {
      const file = observed.helperLaunchFiles[role];
      if (file === undefined) continue;
      if (!isUrlHelperLaunchFile(role, file) || !cut.record.products.records.some(record => record.path === file)
        || !retained.some(record => record.path === file)) return null;
      launches[role] = file;
    }
  }
  // A retained physical launch must have an independently observed history in
  // the sealed generation chain. Filenames and generation hashes choose none.
  for (const record of retained) {
    if (!input.audits.some(audit => Object.values(readVerifiedUrlAuditLaunches(audit)!.helperLaunchFiles).includes(record.path))) return null;
  }
  return { launches: Object.freeze(launches), subject };
}
function recheck(input: UrlRecoveryProductsOptions, history?: UrlFrozenProductHistory) {
  if (input.current() !== true || !isColdUrlRunMachineHistory(input.machine) || input.now() < input.machine.observedAt) return null;
  const boundary = readUrlStoppedBoundary(input.hostRoot, input.expected, input.now());
  if (!boundary || boundary.sha256 !== input.boundarySha256
    || boundary.record.machine.identitySha256 !== input.machine.identitySha256
    || !same(boundary.record.machine.binding, input.machine.binding)
    || !same(boundary.record.machine.clients, input.machine.clients)
    || (history !== undefined && !same(history, boundary.record.products))
    || verifyUrlFrozenProductHistory(input.expected.run, boundary.record.products, input.current) === null
    || input.current() !== true) return null;
  const audit = auditedLaunches(input, boundary.record.products);
  if (!audit || input.current() !== true) return null;
  return { history: boundary.record.products, ...audit };
}
/** The host calls this only after its separate policy/source/audit/budget
 * verification. This helper itself authenticates the protected seal, genuine
 * cold machine observation and exact frozen file/provenance populations. */
export function verifyUrlRecoveryProducts(given: UrlRecoveryProductsOptions): UrlVerifiedRecoveryProducts | null {
  try {
    const input = Object.freeze({ ...given, expected: Object.freeze({ ...given.expected }),
      ...(given.audits === undefined ? {} : { audits: Object.freeze([...given.audits]) }) });
    const verified = recheck(input);
    if (verified === null) return null;
    const capability = Object.freeze({}) as UrlVerifiedRecoveryProducts;
    issued.set(capability, { input, history: verified.history, launches: verified.launches, auditSubject: verified.subject, consumed: false });
    return capability;
  } catch { return null; }
}
/** Inspection changes no state. The transfer may happen after the supervisor
 * moves from stopped exclusion to its exclusive live claim; the caller must
 * supply that fresh authority independently. The protected seal remains exact. */
export function inspectUrlRecoveryProducts(capability: UrlVerifiedRecoveryProducts, expected: {
  readonly run: string; readonly coreSha256: string; readonly declarationSha256: string;
  readonly runId: string; readonly sourcePin: string; readonly originPolicySha256: string;
  readonly sourceBindingSha256: string; readonly basePolicySha256: string;
  readonly current: () => boolean;
}): UrlFrozenProductHistory {
  const value = isRecord(capability) ? issued.get(capability) : undefined;
  if (!value || value.consumed || expected.current() !== true || value.input.expected.run !== expected.run
    || value.history.coreSha256 !== expected.coreSha256 || value.history.declarationSha256 !== expected.declarationSha256
    || value.input.expected.runId !== expected.runId || value.input.expected.sourcePin !== expected.sourcePin
    || value.input.machine.clients.some(client => client.context.policySha256 !== expected.originPolicySha256)
    || (value.auditSubject !== null && (value.auditSubject.sourceBindingSha256 !== expected.sourceBindingSha256
      || value.auditSubject.basePolicySha256 !== expected.basePolicySha256))
    || recheck({ ...value.input, current: expected.current }, value.history) === null) throw new Error('url-recovery-products-unavailable');
  return value.history;
}
/** Atomically transfer before any import await or receipt issuance. A second
 * bridge cannot race the same historical proof into another live ledger. */
export function takeUrlRecoveryProducts(capability: UrlVerifiedRecoveryProducts,
  expected: Parameters<typeof inspectUrlRecoveryProducts>[1]) {
  const history = inspectUrlRecoveryProducts(capability, expected), value = issued.get(capability)!;
  value.consumed = true;
  return Object.freeze({ history, launches: value.launches, deadline: value.input.expected.deadline, revalidate: (): void => {
    if (expected.current() !== true || recheck({ ...value.input, current: expected.current }, history) === null)
      throw new Error('url-recovery-products-unavailable');
  } });
}
