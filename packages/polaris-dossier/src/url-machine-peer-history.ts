import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { readUrlMachineClient, URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientContext } from './url-machine-instance.js';
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
  /** Old canonical bytes are not archived by the store. A supplied candidate
   * is accepted only if it matches that exact revision's protected audit hash.
   * Omitting them is supported only for the latest canonical revision. */
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

/** Join already captured history only. This does not authenticate an old process
 * as current, revive a revoked client or establish that its effect completed.
 * A new mediated act still needs fresh kernel/channel and lifecycle checks. */
export async function verifyUrlMachinePeerHistory(given: UrlMachinePeerHistoryOptions): Promise<UrlMachinePeerHistoryResult> {
  try {
    const { store, expectedIdentitySha256 } = given;
    const { context, row, expectedHead } = deepFreeze(parseBoundedJson(canonical({ context: given.context, row: given.row,
      expectedHead: given.expectedHead }), URL_MACHINE_CLIENT_LIMITS)) as unknown as Pick<UrlMachinePeerHistoryOptions, 'context' | 'row' | 'expectedHead'>;
    if (given.revisionBytes !== undefined && (!(given.revisionBytes instanceof Uint8Array)
      || given.revisionBytes.byteLength < 1 || given.revisionBytes.byteLength > URL_MACHINE_CLIENT_LIMITS.maxBytes)) return refused('input');
    const candidate = given.revisionBytes === undefined ? undefined : Uint8Array.from(given.revisionBytes);
    if (!hex(expectedIdentitySha256) || expectedIdentitySha256 !== store.identitySha256
      || !exact(row, ['event', 'clientId', 'instanceId', 'revision', 'runId', 'role', 'operation', 'processIdentitySha256', 'channelIdentitySha256', 'at'])
      || row.event !== 'machine-peer-effect' || !hex(row.clientId) || !hex(row.instanceId) || !count(row.revision) || row.revision < 1
      || !count(row.at) || !hex(row.processIdentitySha256) || !hex(row.channelIdentitySha256)
      || candidate !== undefined && (candidate.length < 1 || candidate.length > URL_MACHINE_CLIENT_LIMITS.maxBytes)) return refused('input');
    const history = await readUrlMachineStoreHistory(store, context.clientId, expectedHead, context.deadline);
    if (history === null || history.identitySha256 !== expectedIdentitySha256) return refused('store-unavailable');
    const event = history.events.find(value => value.next.revision === row.revision);
    const next = history.events.find(value => value.next.revision === row.revision + 1);
    if (event === undefined) return refused('revision');
    const bytes = candidate ?? (row.revision === history.head.record.revision ? history.canonical : undefined);
    if (bytes === undefined) return refused('revision-bytes-unavailable');
    const atRead = { ...context, now: history.observedAt };
    const decoded = readUrlMachineClient(bytes, atRead);
    const latest = readUrlMachineClient(history.canonical, atRead);
    if (!decoded.ok || !latest.ok || !equal(identifyUrlMachineLifecycleRecord(decoded.record, decoded.sha256), event.next)
      || !equal(identifyUrlMachineLifecycleRecord(latest.record, latest.sha256), history.head.record)) return refused('revision');
    const record = decoded.record, active = record.instances.at(-1)!;
    const expectedMetadata = { projectId: record.projectId, policySha256: context.policySha256, profileSha256: context.profileSha256,
      sourcePin: context.sourcePin, runId: context.runId, role: context.role, kind: context.kind, scopes: record.scopes };
    let previousTime = -Infinity;
    for (const audit of history.events) {
      const actual = { projectId: audit.projectId, policySha256: audit.policySha256, profileSha256: audit.profileSha256,
        sourcePin: audit.sourcePin, runId: audit.runId, role: audit.role, kind: audit.kind, scopes: audit.scopes };
      if (!equal(actual, expectedMetadata) || !equal(audit.binding, expectedHead.binding)) return refused('binding');
      if (audit.at < previousTime || audit.at > history.observedAt) return refused('time');
      previousTime = audit.at;
    }
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
    return deepFreeze({ ok: true, kind: 'matched-historical-machine-record', auditCapture: 'independent-proof-required', authorization: 'none', effectCompletion: 'Unknown', replay: 'forbidden',
      clientId: row.clientId, instanceId: row.instanceId, revision: row.revision, recordSha256: decoded.sha256,
      storeIdentitySha256: history.identitySha256, lifecycleAuditSha256: sha256(canonical(event)), observedAt: history.observedAt });
  } catch { return refused('input'); }
}
