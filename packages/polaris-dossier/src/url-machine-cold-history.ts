import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord } from '@syzygy/support';
import { readUrlMachineClient } from './url-machine-instance.js';
import { captureUrlMachinePeerHistory, isUrlMachinePeerHistorySnapshotFor, type UrlMachinePeerHistorySnapshot } from './url-machine-peer-history.js';
import { openUrlMachineStore, readUrlMachineStoreHistory, URL_MACHINE_STORE_LIMITS, type UrlMachineStore } from './url-machine-store.js';
import type { UrlRunMachineClosedHistory } from './url-run-machine.js';
import { URL_ROLES } from './url-run-record.js';
import type { ViewRole } from './session-view.js';

export interface ColdUrlRunMachineExpected {
  readonly identitySha256: string;
  readonly binding: UrlRunMachineClosedHistory['binding'];
  readonly runId: string; readonly sourcePin: string; readonly originPolicySha256: string;
  readonly profiles: Readonly<Record<ViewRole, string>>;
  readonly deadline: number;
}
export interface ColdUrlRunMachineOptions {
  readonly governanceRoot: string; readonly protectedRoot: string;
  /** Independently authenticated clean-close seal input, never learned from
   * this store or an unverified supervisor JSON object. This module does not
   * establish the seal's provenance or decode a new persistence format. */
  readonly sealed: UrlRunMachineClosedHistory;
  readonly expected: ColdUrlRunMachineExpected;
  readonly now: () => number;
  /** Also maintains the clean-stop exclusion: no concurrent controller writer.
   * Per-client exact observations do not claim an atomic all-client snapshot. */
  readonly current: () => boolean;
}
export interface ColdUrlRunMachineHistory {
  readonly kind: 'verified-cold-url-machine-history'; readonly authorization: 'none'; readonly replay: 'forbidden';
  readonly observation: 'per-client-protected-cuts'; readonly identitySha256: string;
  readonly closedAt: number; readonly observedAt: number;
  readonly clients: UrlRunMachineClosedHistory['clients'];
  readonly snapshots: readonly UrlMachinePeerHistorySnapshot[];
}
// One open plus at most two protected operations per each of eight clients.
export const COLD_URL_MACHINE_HISTORY_LIMITS = Object.freeze({ clients: 8, maxBytes: 262_144, maxNodes: 32_768, maxDepth: 24,
  milliseconds: 17 * URL_MACHINE_STORE_LIMITS.operationMilliseconds });
const JSON_LIMITS = { maxBytes: COLD_URL_MACHINE_HISTORY_LIMITS.maxBytes, maxNodes: COLD_URL_MACHINE_HISTORY_LIMITS.maxNodes,
  maxDepth: COLD_URL_MACHINE_HISTORY_LIMITS.maxDepth };
const encode = (value: unknown) => encodeCanonicalJson(value, JSON_LIMITS);
const same = (left: unknown, right: unknown) => encode(left) === encode(right);
const hex = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const clock = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= 8_640_000_000_000_000;
const exact = (v: unknown, keys: readonly string[]): boolean => isRecord(v)
  && Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
const issued = new WeakSet<ColdUrlRunMachineHistory>();
export function isColdUrlRunMachineHistory(value: unknown): value is ColdUrlRunMachineHistory {
  return isRecord(value) && issued.has(value as unknown as ColdUrlRunMachineHistory);
}
function fail(): never { throw new Error('url-machine-cold-history-unavailable'); }

/** Read-only historical reconstruction under the original deadline. The returned
 * snapshots are genuine issued objects, not deserialized success assertions.
 * No allocation, publication, credential, replay or subsequent live grant is
 * available here. Privileged whole-store rollback remains outside this proof. */
export async function reconstructColdUrlRunMachineHistory(given: ColdUrlRunMachineOptions): Promise<ColdUrlRunMachineHistory | null> {
  let active = true, timer: ReturnType<typeof setTimeout> | undefined, lastNow = 0;
  const until = performance.now() + COLD_URL_MACHINE_HISTORY_LIMITS.milliseconds;
  const { governanceRoot, protectedRoot, now, current } = given;
  let deadline = 0;
  const check = (): number => {
    const at = now();
    if (!active || !clock(at) || at < lastNow || at >= deadline || performance.now() >= until || current() !== true) fail();
    lastNow = at; return at;
  };
  const work = (async () => {
    const { expected, sealed } = deepFreeze(parseBoundedJson(encode({ expected: given.expected, sealed: given.sealed }), JSON_LIMITS)) as unknown as
      Pick<ColdUrlRunMachineOptions, 'expected' | 'sealed'>;
    if (!exact(expected, ['identitySha256', 'binding', 'runId', 'sourcePin', 'originPolicySha256', 'profiles', 'deadline'])
      || !hex(expected.identitySha256) || !hex(expected.originPolicySha256)
      || !/^run-[a-f0-9]{32}$/u.test(expected.runId) || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(expected.sourcePin)
      || !exact(expected.binding, ['controllerSha256', 'parentBindingSha256']) || !hex(expected.binding.controllerSha256) || !hex(expected.binding.parentBindingSha256)
      || !exact(expected.profiles, URL_ROLES) || Object.values(expected.profiles).some(value => !hex(value)) || !clock(expected.deadline)
      || !exact(sealed, ['kind', 'authorization', 'replay', 'identitySha256', 'binding', 'observedAt', 'clients'])
      || sealed.kind !== 'closed-url-run-machine-history' || sealed.authorization !== 'none' || sealed.replay !== 'forbidden'
      || sealed.identitySha256 !== expected.identitySha256 || !same(sealed.binding, expected.binding)
      || !clock(sealed.observedAt) || sealed.observedAt >= expected.deadline || !Array.isArray(sealed.clients)
      || sealed.clients.length !== COLD_URL_MACHINE_HISTORY_LIMITS.clients) fail();
    deadline = expected.deadline;
    if (sealed.observedAt > check()) fail();
    const clients = sealed.clients as UrlRunMachineClosedHistory['clients'];
    const clientIds = new Set<string>(), endpoints = new Set<string>();
    for (const client of clients) {
      if (!exact(client, ['context', 'terminal'])) fail();
      const c = client.context;
      if (!exact(c, ['clientId', 'policySha256', 'sourcePin', 'runId', 'role', 'kind', 'allowedScopes', 'profileSha256', 'now', 'deadline'])
        || !hex(c.clientId) || clientIds.has(c.clientId) || c.policySha256 !== expected.originPolicySha256 || c.sourcePin !== expected.sourcePin
        || c.runId !== expected.runId || !URL_ROLES.includes(c.role) || c.profileSha256 !== expected.profiles[c.role]
        || !['mcp-shim', 'inference-bridge'].includes(c.kind) || c.deadline !== deadline || !clock(c.now) || c.now > sealed.observedAt
        || !Array.isArray(c.allowedScopes) || c.allowedScopes.length < 1 || c.allowedScopes.length > 4
        || new Set(c.allowedScopes).size !== c.allowedScopes.length || c.allowedScopes.some(scope =>
          !(c.kind === 'inference-bridge' ? ['inference-forward'] : ['source_read', 'artifact_read', 'artifact_write', 'dossier_step']).includes(scope))
        || endpoints.has(`${c.role}/${c.kind}`)) fail();
      if (client.terminal.kind === 'never-issued') {
        if (!exact(client.terminal, ['kind', 'clientId', 'witnessSha256']) || client.terminal.clientId !== c.clientId || !hex(client.terminal.witnessSha256)) fail();
      } else if (client.terminal.kind !== 'revoked' || !exact(client.terminal, ['kind', 'head']) || !same(client.terminal.head.binding, expected.binding)) fail();
      clientIds.add(c.clientId); endpoints.add(`${c.role}/${c.kind}`);
    }
    let store: UrlMachineStore | null = null;
    const snapshots: UrlMachinePeerHistorySnapshot[] = [];
    try {
      check();
      store = await openUrlMachineStore({ governanceRoot, protectedRoot, deadline, now, current: () => { try { check(); return true; } catch { return false; } } }, expected.identitySha256);
      check(); if (store === null) fail();
      for (const { context, terminal } of clients) {
        check();
        if (terminal.kind === 'never-issued') {
          let matched = false;
          const verified = await store.exclusive(context.clientId, deadline, async lease => {
            const actual = await lease.read();
            matched = lease.current() && actual !== null && same(actual.anchor, terminal)
              && actual.canonical === null && actual.projection === null && actual.audit === null;
          });
          check(); if (!verified || !matched) fail();
        } else {
          const history = await readUrlMachineStoreHistory(store, context.clientId, terminal.head, deadline);
          check(); if (history === null) fail();
          const actual = readUrlMachineClient(history.canonical, { ...context, now: history.observedAt });
          if (!actual.ok || actual.record.revokedAt === null || Date.parse(actual.record.revokedAt) > sealed.observedAt
            || !same(actual.record.scopes, context.allowedScopes) || history.events.some(event => event.at > sealed.observedAt)) fail();
          const captured = await captureUrlMachinePeerHistory({ store, expectedIdentitySha256: expected.identitySha256, expectedHead: terminal.head, context });
          check();
          if (!captured.ok || !isUrlMachinePeerHistorySnapshotFor(captured.snapshot, { projectId: 'project:syzygy', policySha256: expected.originPolicySha256,
            profileSha256: expected.profiles[context.role], sourcePin: expected.sourcePin, runId: expected.runId, role: context.role })) fail();
          snapshots.push(captured.snapshot);
        }
      }
    } finally { await store?.close(); }
    const result: ColdUrlRunMachineHistory = Object.freeze({ kind: 'verified-cold-url-machine-history', authorization: 'none', replay: 'forbidden',
      observation: 'per-client-protected-cuts', identitySha256: expected.identitySha256, closedAt: sealed.observedAt, observedAt: check(),
      clients: sealed.clients, snapshots: Object.freeze(snapshots) });
    issued.add(result); return result;
  })();
  void work.catch(() => {});
  try {
    const result = await Promise.race([work, new Promise<null>(resolve => { timer = setTimeout(() => { active = false; resolve(null); },
      Math.min(COLD_URL_MACHINE_HISTORY_LIMITS.milliseconds, Math.max(1, deadline - now()))); })]);
    if (result !== null) check();
    return result;
  } catch { return null; }
  finally { active = false; clearTimeout(timer); }
}
