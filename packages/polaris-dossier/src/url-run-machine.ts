import { randomBytes } from 'node:crypto';
import { mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { setImmediate as yieldToPoll } from 'node:timers/promises';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import type { UrlSessionProcess } from './session-launch.js';
import { createSessionMachineTransport, type SessionMachineTransport } from './session-machine-transport.js';
import { isOrderedDesignSessionProfile } from './session-profile.js';
import type { UrlMachineLifecycleResult, UrlMachineLifecycleSnapshot } from './url-machine-lifecycle.js';
import { readUrlMachineClient, type UrlMachineClientContext, type UrlMachineClientKind, type UrlMachineClientRecord, type UrlMachineOperation } from './url-machine-instance.js';
import { captureUrlMachinePeer, closeUrlMachinePeer, prepareUrlMachineListenerAsync, waitForUrlMachinePeerPublication,
  type UrlMachinePeer, type UrlMachinePeerAudit } from './url-machine-peer.js';
import { initializeUrlMachineStore, openUrlMachineStore } from './url-machine-store.js';
import { isColdUrlRunMachineHistory, type ColdUrlRunMachineHistory } from './url-machine-cold-history.js';
import { isPreparedUrlRolePlan, type UrlRolePlan } from './url-role-plan.js';
import type { UrlParentAdoption } from './url-parent-adoption.js';
import { urlMachineReaderProgram, type UrlRuntime } from './url-runtime.js';
import type { ViewRole } from './session-view.js';
import { URL_ORIGIN_POLICY_PATH, URL_ROLES } from './url-run-record.js';

const BOUNDS = { maxBytes: 65_536, maxNodes: 4096, maxDepth: 16 };
const canonical = (value: unknown): Buffer => Buffer.from(encodeCanonicalJson(value, BOUNDS));
const opaque = (): string => randomBytes(32).toString('hex');
const refuse = (): Error => new Error('url-run-machine-unavailable');
const scopes = (role: ViewRole, kind: UrlMachineClientKind): readonly UrlMachineOperation[] => kind === 'inference-bridge'
  ? ['inference-forward'] : role === 'author' ? ['source_read', 'artifact_read', 'artifact_write', 'dossier_step']
    : role === 'inventory' ? ['source_read', 'artifact_read', 'dossier_step'] : ['artifact_read', 'dossier_step'];
type Head = Extract<UrlMachineLifecycleResult, { ok: true }>['receipt'];
type NeverIssued = Extract<UrlMachineLifecycleSnapshot['anchor'], { kind: 'never-issued' }>;
type Terminal = { readonly kind: 'revoked'; readonly head: Head } | NeverIssued;
interface Client {
  readonly witnessSha256: string;
  readonly context: UrlMachineClientContext;
  record: UrlMachineClientRecord | null;
  head: Head | null;
}
export interface UrlRunMachineOptions {
  readonly governanceRoot: string;
  readonly protectedRoot: string;
  readonly parent: UrlParentAdoption;
  readonly originPolicySha256: string;
  readonly pin: string;
  readonly runId: string;
  readonly runtime: UrlRuntime;
  readonly plans: readonly UrlRolePlan[];
  /** Ordered unique subset with an exact genuinely prepared plan per role.
   * An empty subset initializes no fresh endpoint scope. Default: four roles. */
  readonly requiredRoles?: readonly ViewRole[];
  /** Independently held exclusive continuation claim. This does not obtain or
   * persist a claim and never falls back to initialization of another store. */
  readonly resume?: {
    readonly history: ColdUrlRunMachineHistory;
    readonly identitySha256: string;
    readonly current: () => boolean;
    readonly currentAsync?: () => Promise<boolean>;
    readonly waitForDesignActivation?: (launch: UrlSessionProcess) => Promise<boolean>;
  };
  readonly deadline: number;
  readonly now: () => number;
  readonly current: () => boolean;
  /** Live effect authority; parent authority remains separate for retirement. */
  readonly effectCurrent?: () => boolean;
  readonly reverify: () => boolean | Promise<boolean>;
  readonly launch: (role: ViewRole) => UrlSessionProcess | undefined;
  readonly audit: (event: UrlMachinePeerAudit) => void | Promise<void>;
  readonly chargeNativeCpuMicroseconds?: (capacity: number) => void;
}

export interface UrlRunMachineClosedHistory {
  readonly kind: 'closed-url-run-machine-history'; readonly authorization: 'none'; readonly replay: 'forbidden';
  readonly identitySha256: string; readonly binding: Head['binding']; readonly observedAt: number;
  readonly clients: readonly { readonly context: UrlMachineClientContext; readonly terminal: Terminal }[];
}
const closedHistories = new WeakMap<object, UrlRunMachineClosedHistory>();
const issuedHistories = new WeakSet<UrlRunMachineClosedHistory>();
/** Only the exact successfully closed producer result can retrieve this data.
 * It records historical retirement, never authority for a subsequent effect. */
export function readUrlRunMachineClosedHistory(value: unknown): UrlRunMachineClosedHistory | null {
  return isRecord(value) ? closedHistories.get(value) ?? null : null;
}
export function isUrlRunMachineClosedHistory(value: unknown): value is UrlRunMachineClosedHistory {
  return isRecord(value) && issuedHistories.has(value as unknown as UrlRunMachineClosedHistory);
}

/** The supervisor allocates endpoint identities before launch. The first actual
 * accepted peer supplies its independently attested verifier; no process tuple
 * from a role, prompt, saved report or socket path can issue an instance. */
export async function createUrlRunMachine(input: UrlRunMachineOptions) {
  input = Object.freeze({ ...input, plans: Object.freeze([...input.plans]),
    requiredRoles: Object.freeze([...(input.requiredRoles ?? URL_ROLES)]),
    ...(input.resume === undefined ? {} : { resume: Object.freeze({ ...input.resume }) }) });
  const requiredRoles = input.requiredRoles!;
  const parentCurrent = (): boolean => input.current() && (input.resume === undefined || input.resume.current() === true);
  const reader = urlMachineReaderProgram(input.runtime);
  if (reader === null || new Set(requiredRoles).size !== requiredRoles.length
    || requiredRoles.some((role, index) => !URL_ROLES.includes(role) || (index > 0 && URL_ROLES.indexOf(role) <= URL_ROLES.indexOf(requiredRoles[index - 1]!)))
    || input.plans.length !== requiredRoles.length
    || input.plans.some((plan, index) => !isPreparedUrlRolePlan(plan) || plan.role !== requiredRoles[index]
      || plan.profile.input.binding.run !== input.runId || plan.profile.input.binding.role !== plan.role)
    || input.parent.subjects.find(subject => subject.path === URL_ORIGIN_POLICY_PATH)?.sha256 !== input.originPolicySha256
    || !parentCurrent() || (input.effectCurrent !== undefined && input.effectCurrent() !== true)
    || !(await input.reverify()) || !parentCurrent()
    || (input.effectCurrent !== undefined && input.effectCurrent() !== true)) throw refuse();
  const canonicalRoot = path.join(input.governanceRoot, 'governance/policies/dossier-machine-clients');
  // Preserve the shared checkout's reviewer access. Namespace exclusion, not
  // tightening the governance directory's ACL, protects it from role clients.
  if (input.resume === undefined) await mkdir(canonicalRoot, { recursive: true, mode: 0o770 });
  if (await realpath(canonicalRoot) !== canonicalRoot || !parentCurrent()) throw refuse();
  const resumed = input.resume;
  if (resumed !== undefined && (!isColdUrlRunMachineHistory(resumed.history)
    || resumed.identitySha256 !== resumed.history.identitySha256 || input.now() < resumed.history.observedAt || !resumed.current())) throw refuse();
  const claimCurrentAsync = resumed?.currentAsync;
  const storeOptions = { governanceRoot: input.governanceRoot, protectedRoot: input.protectedRoot,
    deadline: input.deadline, now: input.now, current: parentCurrent,
    ...(claimCurrentAsync === undefined ? {} : { currentAsync: async () =>
      input.current() && await claimCurrentAsync() === true && input.current() }) };
  const store = resumed === undefined ? await initializeUrlMachineStore(storeOptions)
    : await openUrlMachineStore(storeOptions, resumed.identitySha256);
  if (store === null) throw refuse();
  const binding = Object.freeze({ controllerSha256: input.runtime.inputTreeSha256,
    parentBindingSha256: sha256(canonical({ rowId: input.parent.rowId, landedCommit: input.parent.landedCommit,
      tagObject: input.parent.tagObject, subjects: input.parent.subjects })) });
  const retained = resumed?.history.clients ?? [];
  const clients = new Map<string, Client>(), peers = new Set<UrlMachinePeer>();
  let stopped = false, closing = false;
  let mutations: Promise<unknown> = Promise.resolve();
  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = mutations.then(operation);
    mutations = result.catch(() => undefined);
    return result;
  };
  const effectCurrent = (): boolean => input.effectCurrent === undefined || input.effectCurrent() === true;
  const current = (): boolean => !stopped && !closing && parentCurrent()
    && effectCurrent() && input.now() < input.deadline;
  const verifyTerminal = async (context: UrlMachineClientContext, terminal: Terminal): Promise<number | null> => {
    let confirmedAt: number | null = null;
    const verified = await store.exclusive(context.clientId, input.deadline, async lease => {
      const snapshot = await lease.read();
      if (!snapshot) return;
      const now = lease.sampleCurrent();
      if (now === null) return;
      if (terminal.kind === 'never-issued') {
        if (snapshot.anchor.kind !== 'never-issued' || !canonical(snapshot.anchor).equals(canonical(terminal))
          || snapshot.canonical !== null || snapshot.projection !== null || snapshot.audit !== null) return;
      } else {
        if (snapshot.anchor.kind !== 'committed' || snapshot.canonical === null
          || !canonical(snapshot.anchor.head).equals(canonical(terminal.head))
          || !canonical(snapshot.audit).equals(canonical(terminal.head))
          || !canonical(snapshot.projection).equals(canonical(terminal.head.record))) return;
        const read = readUrlMachineClient(snapshot.canonical, { ...context, now });
        if (!read.ok || read.record.revokedAt === null || read.sha256 !== terminal.head.record.sha256) return;
      }
      confirmedAt = lease.sampleCurrent();
    });
    return verified ? confirmedAt : null;
  };
  let closed: Promise<{ readonly lifecycle: 'retired' | 'Unknown' }> | undefined;
  const close = (): Promise<{ readonly lifecycle: 'retired' | 'Unknown' }> => {
    if (closed !== undefined) return closed;
    closing = true;
    // Revoke synchronous effect boundaries before waiting for durable writes.
    // The store's parent authority remains live solely to publish retirement.
    for (const peer of peers) closeUrlMachinePeer(peer);
    return closed = serialize(async () => {
      let retired = clients.size === requiredRoles.length * 2, confirmedAt = 0;
      const history: { readonly context: UrlMachineClientContext; readonly terminal: Terminal }[] = [];
      // Retained clients are immutable terminal history, never reissued or
      // silently replaced by the new role allocation set.
      for (const client of retained) {
        try {
          const at = await verifyTerminal(client.context, client.terminal);
          if (at === null) retired = false;
          else { confirmedAt = Math.max(confirmedAt, at); history.push(client); }
        } catch { retired = false; }
      }
      // The parent authority remains alive for retirement and protected
      // readback. Live effect authority was already withdrawn synchronously.
      for (const client of clients.values()) {
        if (client.record !== null) {
          try {
            const now = input.now(), previous = client.record;
            const next = { ...previous, revision: previous.revision + 1, revokedAt: new Date(now).toISOString() };
            const result = await store.publish({ context: { ...client.context, now }, binding,
              expected: { revision: previous.revision, sha256: client.head!.record.sha256 }, next: canonical(next) });
            if (!result.ok) retired = false;
            else { client.record = next; client.head = result.receipt; }
          } catch { retired = false; }
        }
        const terminal: Terminal | undefined = client.record === null
          ? { kind: 'never-issued', clientId: client.context.clientId, witnessSha256: client.witnessSha256 }
          : client.head === null ? undefined : { kind: 'revoked', head: client.head };
        try {
          const at = terminal === undefined ? null : await verifyTerminal(client.context, terminal);
          if (at === null || terminal === undefined) retired = false;
          else { confirmedAt = Math.max(confirmedAt, at); history.push({ context: client.context, terminal }); }
        } catch { retired = false; }
      }
      stopped = true;
      try { await store.close(); } catch { retired = false; }
      let observedAt = 0;
      try {
        observedAt = input.now();
        if (!parentCurrent() || !Number.isSafeInteger(observedAt) || observedAt < confirmedAt || observedAt >= input.deadline) retired = false;
      } catch { retired = false; }
      if (history.length !== retained.length + requiredRoles.length * 2) retired = false;
      const result = Object.freeze({ lifecycle: retired ? 'retired' as const : 'Unknown' as const });
      if (retired) {
        const evidence = deepFreeze({ kind: 'closed-url-run-machine-history' as const, authorization: 'none' as const, replay: 'forbidden' as const,
          identitySha256: store.identitySha256, binding, observedAt, clients: history });
        issuedHistories.add(evidence); closedHistories.set(result, evidence);
      }
      return result;
    });
  };
  try {
    if (resumed !== undefined) {
      if (!current() || store.identitySha256 !== resumed.identitySha256
        || !canonical(resumed.history.binding).equals(canonical(binding)) || retained.length > 16
        || retained.length + requiredRoles.length * 2 > 16) throw refuse();
      const ids = new Set<string>();
      for (const { context, terminal } of retained) {
        const plan = input.plans.find(value => value.role === context.role);
        if (ids.has(context.clientId) || context.runId !== input.runId || context.sourcePin !== input.pin
          || context.policySha256 !== input.originPolicySha256 || context.deadline !== input.deadline
          || (plan !== undefined && context.profileSha256 !== plan.profile.digest)
          || (terminal.kind === 'revoked' && !canonical(terminal.head.binding).equals(canonical(binding)))
          || await verifyTerminal(context, terminal) === null || !current()) throw refuse();
        ids.add(context.clientId);
      }
      // No saved context is a plan: only the independently prepared selected
      // plans below can allocate a fresh role endpoint.
      if (!(await input.reverify()) || !current()) throw refuse();
    }
    const transports = new Map<string, SessionMachineTransport>();
    const kinds = ['mcp-shim', 'inference-bridge'] as const;
    const resumedSlots = resumed === undefined || input.plans.length === 0 ? []
      : await store.allocateClients(input.plans.length * kinds.length, input.deadline);
    if (resumedSlots === null) throw refuse();
    let slotIndex = 0;
    for (const plan of input.plans) for (const kind of kinds) {
      const slot = resumed === undefined ? await store.allocateClient(input.deadline) : resumedSlots[slotIndex++] ?? null;
      if (slot === null || !current()) throw refuse();
      const context: UrlMachineClientContext = deepFreeze({ clientId: slot.clientId, policySha256: input.originPolicySha256,
        sourcePin: input.pin, runId: input.runId, role: plan.role, kind, allowedScopes: scopes(plan.role, kind),
        profileSha256: plan.profile.digest, now: input.now(), deadline: input.deadline });
      const client: Client = { context, witnessSha256: slot.witnessSha256, record: null, head: null };
      const key = `${plan.role}/${kind}`;
      if (clients.has(key)) throw refuse();
      clients.set(key, client);
      let listener: Awaited<ReturnType<typeof prepareUrlMachineListenerAsync>> = null;
      const transport = createSessionMachineTransport({
        prepare: async server => {
          if (!current()) return false;
          listener = await prepareUrlMachineListenerAsync(server, reader, input.chargeNativeCpuMicroseconds);
          return listener !== null && current();
        },
        accept: async socket => {
          const until = Math.min(input.deadline, input.now() + 5000);
          let launch = input.launch(plan.role);
          while (launch === undefined && current() && input.now() < until) { await yieldToPoll(); launch = input.launch(plan.role); }
          if (launch === undefined || listener === null || !current()) return null;
          // Capture checks the fresh parent after the live sample and before
          // invoking either native verifier.
          const support = isOrderedDesignSessionProfile(plan.profile) ? plan.profile.transcript.supportSha256 : input.runtime.supportSha256;
          const name = kind === 'mcp-shim' ? 'session-mcp.js' : 'session-bridge.js';
          const selectedLaunch = launch;
          return captureUrlMachinePeer({ socket, listener, launch: selectedLaunch, profile: plan.profile, context,
            store, binding, programs: { peer: input.runtime.peerProgram, reader },
            installed: { executable: input.runtime.worker.node, sha256: input.runtime.worker.nodeSha256,
              script: path.join(plan.view.supportDirectory, name), scriptSha256: support[name] },
            protectedPaths: [...plan.view.protectedPaths, input.governanceRoot, input.protectedRoot], now: input.now,
            current: async () => current() && await selectedLaunch.waitForSample()
              && await input.reverify() === true && current(),
            effectCurrent: current, readImageCurrent: () => !stopped && !closing && effectCurrent(), audit: input.audit,
            chargeNativeCpuMicroseconds: input.chargeNativeCpuMicroseconds });
        },
        authorize: async (peer, stillOpening) => {
          const authority = (): boolean => !stopped && !closing && stillOpening() && effectCurrent();
          if (!authority()) return false;
          peers.add(peer);
          let permitted = false;
          try {
            const waitForActivation = resumed?.waitForDesignActivation;
            // The raw socket stays paused while the exact resumed attempt
            // registers its launch and activates. Hold no publication lock.
            if (plan.role === 'design' && waitForActivation !== undefined
              && !(await waitForUrlMachinePeerPublication(peer, waitForActivation, authority))) return false;
            permitted = await serialize(async () => {
              if (!authority() || !current()) return false;
              const now = input.now(), old = client.record, stamp = new Date(now).toISOString();
              const instance = { instanceId: opaque(), generation: (old?.instances.length ?? 0) + 1, issuedAt: stamp,
                expiresAt: new Date(input.deadline).toISOString(), retiredAt: null, revokedAt: null, verifier: peer.verifier };
              const next: UrlMachineClientRecord = old === null
                ? { format: 'polaris-dossier-local-machine-client/1', clientId: slot.clientId, issuanceId: opaque(),
                  policySha256: context.policySha256, revision: 1, projectId: 'project:syzygy', sourcePin: input.pin,
                  runId: input.runId, role: plan.role, kind, scopes: context.allowedScopes, issuedAt: stamp,
                  expiresAt: new Date(input.deadline).toISOString(), revokedAt: null, instances: [instance] }
                : { ...old, revision: old.revision + 1,
                  instances: [...old.instances.map((value, index) => index === old.instances.length - 1 ? { ...value, retiredAt: stamp } : value), instance] };
              const published = await store.publish({ context: { ...context, now }, binding,
                expected: old === null ? null : { revision: old.revision, sha256: client.head!.record.sha256 }, next: canonical(next) }, authority);
              if (!published.ok) return false;
              client.record = next; client.head = published.receipt;
              return authority() && current();
            });
          } finally {
            if (!permitted) { peers.delete(peer); closeUrlMachinePeer(peer); }
          }
          return permitted;
        },
      });
      if (transport === null) throw refuse();
      transports.set(key, transport);
    }
    return Object.freeze({ identitySha256: store.identitySha256, current,
      transport: (role: ViewRole, kind: 'mcp-shim' | 'inference-bridge'): SessionMachineTransport => {
        const selected = transports.get(`${role}/${kind}`); if (!current() || selected === undefined) throw refuse(); return selected;
      }, close });
  } catch { await close(); throw refuse(); }
}
