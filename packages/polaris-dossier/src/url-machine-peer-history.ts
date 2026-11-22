import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { readUrlMachineClient, URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientContext, type UrlMachineClientRead } from './url-machine-instance.js';
import { identifyUrlMachineLifecycleRecord } from './url-machine-lifecycle.js';
import type { UrlMachinePeerAudit } from './url-machine-peer.js';
import { readUrlMachineStoreHistory, type UrlMachineStore, type UrlMachineStoreHistory } from './url-machine-store.js';

export interface UrlMachinePeerHistoryOptions {
  readonly store: UrlMachineStore;
  /** Independently retained/reopened store identity and exact latest head. */
  readonly expectedIdentitySha256: string;
  readonly expectedHead: UrlMachineStoreHistory['head'];
  readonly context: UrlMachineClientContext;
  /** Already integrity-verified audit payload, supplied independently. Matching
   * nonsecret fingerprints alone never establishes that this row was captured. */
  readonly row: UrlMachinePeerAudit;
  /** Optional legacy candidate, checked against the exact protected revision
   * hash. New stores supply archived bytes; old unarchived prefixes remain
   * unavailable unless the independently retained exact candidate is supplied. */
  readonly revisionBytes?: Uint8Array;
}
export type UrlMachinePeerHistoryResult = {
  readonly ok: true; readonly kind: 'matched-historical-machine-record'; readonly auditCapture: 'independent-proof-required';
  readonly authorization: 'none'; readonly effectCompletion: 'Unknown'; readonly replay: 'forbidden';
  readonly clientId: string; readonly instanceId: string; readonly revision: number; readonly recordSha256: string;
  readonly storeIdentitySha256: string; readonly lifecycleAuditSha256: string; readonly observedAt: number;
} | { readonly ok: false; readonly code: 'input' | 'store-unavailable' | 'revision-bytes-unavailable' | 'revision' | 'binding' | 'time' };
const canonical = (v: unknown): string => encodeCanonicalJson(v, URL_MACHINE_CLIENT_LIMITS);
const equal = (a: unknown, b: unknown): boolean => canonical(a) === canonical(b);
const hex = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const count = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const exact = (v: unknown, keys: readonly string[]): v is Record<string, unknown> => isRecord(v)
  && Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
const refused = (code: Extract<UrlMachinePeerHistoryResult, { ok: false }>['code']): UrlMachinePeerHistoryResult => ({ ok: false, code });

export type UrlMachinePeerHistoryBinding = Pick<UrlMachinePeerHistoryOptions, 'store' | 'expectedIdentitySha256' | 'expectedHead' | 'context'>;
export interface UrlMachinePeerHistorySnapshot {
  readonly kind: 'protected-machine-history-snapshot'; readonly authorization: 'none'; readonly replay: 'forbidden';
  readonly clientId: string; readonly storeIdentitySha256: string; readonly revision: number;
  readonly recordSha256: string; readonly lifecycleAuditSha256: string; readonly observedAt: number;
}
type Refusal = Extract<UrlMachinePeerHistoryResult, { ok: false }>;
export type UrlMachinePeerHistorySnapshotResult = { readonly ok: true; readonly snapshot: UrlMachinePeerHistorySnapshot } | Refusal;
interface SnapshotState {
  readonly context: UrlMachineClientContext;
  readonly expectedHead: UrlMachineStoreHistory['head'];
  readonly history: UrlMachineStoreHistory;
  readonly latest: UrlMachineClientRead;
  readonly events: ReadonlyMap<number, UrlMachineStoreHistory['events'][number]>;
  readonly revisions: ReadonlyMap<number, Uint8Array>;
  readonly records: Map<number, UrlMachineClientRead>;
  readonly historyChecks: Map<string, 'binding' | 'time' | null>;
}
const snapshots = new WeakMap<UrlMachinePeerHistorySnapshot, SnapshotState>();
const matchedRows = new WeakMap<object, string>();

/** Captures one exact protected historical cut for repeated cold checks. The
 * snapshot proves its retained store/head read only. Every row still needs the
 * semantic checker below; neither object supplies current authority. Capture
 * requires the independently retained original context deadline to remain live;
 * it never extends the deadline or proves its provenance from these files. */
export async function captureUrlMachinePeerHistory(given: UrlMachinePeerHistoryBinding): Promise<UrlMachinePeerHistorySnapshotResult> {
  try {
    const { store, expectedIdentitySha256 } = given;
    const { context, expectedHead } = deepFreeze(parseBoundedJson(canonical({ context: given.context,
      expectedHead: given.expectedHead }), URL_MACHINE_CLIENT_LIMITS)) as unknown as Pick<UrlMachinePeerHistoryOptions, 'context' | 'expectedHead'>;
    if (!hex(expectedIdentitySha256) || expectedIdentitySha256 !== store.identitySha256) return { ok: false, code: 'input' };
    const history = await readUrlMachineStoreHistory(store, context.clientId, expectedHead, context.deadline);
    if (history === null || history.identitySha256 !== expectedIdentitySha256) return { ok: false, code: 'store-unavailable' };
    const snapshot: UrlMachinePeerHistorySnapshot = Object.freeze({ kind: 'protected-machine-history-snapshot', authorization: 'none', replay: 'forbidden',
      clientId: context.clientId, storeIdentitySha256: history.identitySha256, revision: history.head.record.revision,
      recordSha256: history.head.record.sha256, lifecycleAuditSha256: history.head.auditSha256, observedAt: history.observedAt });
    snapshots.set(snapshot, { context, expectedHead, history,
      latest: readUrlMachineClient(history.canonical, { ...context, now: history.observedAt }),
      events: new Map(history.events.map(event => [event.next.revision, event])),
      revisions: new Map(history.revisions.map(value => [value.revision, value.canonical])), records: new Map(), historyChecks: new Map() });
    return Object.freeze({ ok: true, snapshot });
  } catch { return { ok: false, code: 'input' }; }
}

export function isUrlMachinePeerHistorySnapshot(value: unknown): value is UrlMachinePeerHistorySnapshot {
  return isRecord(value) && snapshots.has(value as unknown as UrlMachinePeerHistorySnapshot);
}
export type UrlMachinePeerHistorySubject = Pick<UrlMachineClientContext, 'policySha256' | 'profileSha256' | 'sourcePin' | 'runId' | 'role'>
  & { readonly projectId: string };
/** Compare a genuine historical cut to the independent cold audit subject.
 * Supplying the expected values does not itself establish their provenance. */
export function isUrlMachinePeerHistorySnapshotFor(value: unknown, binding: UrlMachinePeerHistorySubject): value is UrlMachinePeerHistorySnapshot {
  try {
    if (!isUrlMachinePeerHistorySnapshot(value)) return false;
    const state = snapshots.get(value)!;
    if (!state.latest.ok || !exact(binding, ['projectId', 'policySha256', 'profileSha256', 'sourcePin', 'runId', 'role'])) return false;
    const record = state.latest.record;
    return equal(binding, { projectId: record.projectId, policySha256: record.policySha256,
      profileSha256: record.instances[0]!.verifier.profileSha256, sourcePin: record.sourcePin, runId: record.runId, role: record.role });
  } catch { return false; }
}
/** A success-shaped copy cannot replace an issued match, and an issued match
 * for another captured row cannot be substituted, even in the same revision. */
export function isUrlMachinePeerHistoryMatch(value: unknown, row: unknown): value is Extract<UrlMachinePeerHistoryResult, { ok: true }> {
  try { return isRecord(value) && matchedRows.get(value) === sha256(canonical(row)); } catch { return false; }
}

function rowInput(row: UrlMachinePeerAudit, bytes: Uint8Array | undefined): boolean {
  return exact(row, ['event', 'clientId', 'instanceId', 'revision', 'runId', 'role', 'operation', 'processIdentitySha256', 'channelIdentitySha256', 'at'])
    && row.event === 'machine-peer-effect' && hex(row.clientId) && hex(row.instanceId) && count(row.revision) && row.revision >= 1
    && count(row.at) && hex(row.processIdentitySha256) && hex(row.channelIdentitySha256)
    && (bytes === undefined || bytes instanceof Uint8Array && bytes.byteLength > 0 && bytes.byteLength <= URL_MACHINE_CLIENT_LIMITS.maxBytes);
}

/** Pure repeated row verification: no filesystem, lifecycle update, replay or
 * live grant. Only a genuinely captured snapshot reaches the semantic join. */
export function verifyUrlMachinePeerHistoryRow(snapshot: UrlMachinePeerHistorySnapshot, givenRow: UrlMachinePeerAudit,
  revisionBytes?: Uint8Array): UrlMachinePeerHistoryResult {
  try {
    const state = snapshots.get(snapshot); if (!state) return refused('input');
    const row = deepFreeze(parseBoundedJson(canonical(givenRow), URL_MACHINE_CLIENT_LIMITS)) as unknown as UrlMachinePeerAudit;
    if (!rowInput(row, revisionBytes)) return refused('input');
    const candidate = revisionBytes === undefined ? undefined : Uint8Array.from(revisionBytes);
    const { context, expectedHead, history } = state;
    const event = state.events.get(row.revision);
    const next = state.events.get(row.revision + 1);
    if (event === undefined) return refused('revision');
    const bytes = candidate ?? state.revisions.get(row.revision) ?? (row.revision === history.head.record.revision ? history.canonical : undefined);
    if (bytes === undefined) return refused('revision-bytes-unavailable');
    const atRead = { ...context, now: history.observedAt };
    // Only the one exact protected hash can populate this bounded cache.
    if (sha256(bytes) !== event.next.sha256) return refused('revision');
    let decoded = state.records.get(row.revision);
    if (decoded === undefined) { decoded = readUrlMachineClient(bytes, atRead); state.records.set(row.revision, decoded); }
    const latest = state.latest;
    if (!decoded.ok || !latest.ok || !equal(identifyUrlMachineLifecycleRecord(decoded.record, decoded.sha256), event.next)
      || !equal(identifyUrlMachineLifecycleRecord(latest.record, latest.sha256), history.head.record)) return refused('revision');
    const record = decoded.record, active = record.instances.at(-1)!;
    const expectedMetadata = { projectId: record.projectId, policySha256: context.policySha256, profileSha256: context.profileSha256,
      sourcePin: context.sourcePin, runId: context.runId, role: context.role, kind: context.kind, scopes: record.scopes };
    const metadataKey = canonical(expectedMetadata);
    let historyFailure = state.historyChecks.get(metadataKey);
    if (historyFailure === undefined) {
      historyFailure = null; let previousTime = -Infinity;
      for (const audit of history.events) {
        const actual = { projectId: audit.projectId, policySha256: audit.policySha256, profileSha256: audit.profileSha256,
          sourcePin: audit.sourcePin, runId: audit.runId, role: audit.role, kind: audit.kind, scopes: audit.scopes };
        if (!equal(actual, expectedMetadata) || !equal(audit.binding, expectedHead.binding)) { historyFailure = 'binding'; break; }
        if (audit.at < previousTime || audit.at > history.observedAt) { historyFailure = 'time'; break; }
        previousTime = audit.at;
      }
      state.historyChecks.set(metadataKey, historyFailure);
    }
    if (historyFailure !== null) return refused(historyFailure);
    if (row.clientId !== context.clientId || row.runId !== context.runId || row.role !== context.role
      || row.instanceId !== active.instanceId || row.revision !== record.revision
      || !record.scopes.includes(row.operation) || !context.allowedScopes.includes(row.operation)
      || (context.kind !== 'mcp-shim' && context.kind !== 'inference-bridge')
      || (row.operation === 'inference-forward') !== (context.kind === 'inference-bridge')
      || active.verifier.profileSha256 !== context.profileSha256
      || row.processIdentitySha256 !== active.verifier.processIdentitySha256
      || row.channelIdentitySha256 !== active.verifier.channelIdentitySha256) return refused('binding');
    const until = Math.min(context.deadline, Date.parse(record.expiresAt), Date.parse(active.expiresAt),
      record.revokedAt === null ? Infinity : Date.parse(record.revokedAt), active.retiredAt === null ? Infinity : Date.parse(active.retiredAt),
      active.revokedAt === null ? Infinity : Date.parse(active.revokedAt), next?.at ?? Infinity);
    // Equal-timestamp adjacent revisions cannot be ordered by this captured
    // clock. Refuse that ambiguity instead of guessing which revision applied.
    if (row.at < event.at || row.at < Date.parse(record.issuedAt) || row.at < Date.parse(active.issuedAt)
      || row.at >= until || row.at > history.observedAt) return refused('time');
    const result: Extract<UrlMachinePeerHistoryResult, { ok: true }> = deepFreeze({ ok: true, kind: 'matched-historical-machine-record', auditCapture: 'independent-proof-required', authorization: 'none', effectCompletion: 'Unknown', replay: 'forbidden',
      clientId: row.clientId, instanceId: row.instanceId, revision: row.revision, recordSha256: decoded.sha256,
      storeIdentitySha256: history.identitySha256, lifecycleAuditSha256: sha256(canonical(event)), observedAt: history.observedAt });
    matchedRows.set(result, sha256(canonical(row)));
    return result;
  } catch { return refused('input'); }
}

/** Join captured history only. The single-row API preserves its input and
 * refusal labels and delegates to the same genuine snapshot/row machinery. */
export async function verifyUrlMachinePeerHistory(given: UrlMachinePeerHistoryOptions): Promise<UrlMachinePeerHistoryResult> {
  try {
    const { context, row, expectedHead } = deepFreeze(parseBoundedJson(canonical({ context: given.context, row: given.row,
      expectedHead: given.expectedHead }), URL_MACHINE_CLIENT_LIMITS)) as unknown as Pick<UrlMachinePeerHistoryOptions, 'context' | 'row' | 'expectedHead'>;
    if (!rowInput(row, given.revisionBytes)) return refused('input');
    const candidate = given.revisionBytes === undefined ? undefined : Uint8Array.from(given.revisionBytes);
    const captured = await captureUrlMachinePeerHistory({ store: given.store, expectedIdentitySha256: given.expectedIdentitySha256, context, expectedHead });
    return captured.ok ? verifyUrlMachinePeerHistoryRow(captured.snapshot, row, candidate) : captured;
  } catch { return refused('input'); }
}
