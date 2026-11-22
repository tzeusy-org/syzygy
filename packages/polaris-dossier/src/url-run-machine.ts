import { randomBytes } from 'node:crypto';
import { mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { setImmediate as yieldToPoll } from 'node:timers/promises';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import type { UrlSessionProcess } from './session-launch.js';
import { createSessionMachineTransport, type SessionMachineTransport } from './session-machine-transport.js';
import { isOrderedDesignSessionProfile } from './session-profile.js';
import { publishUrlMachineLifecycle } from './url-machine-lifecycle.js';
import type { UrlMachineClientContext, UrlMachineClientKind, UrlMachineClientRecord, UrlMachineOperation } from './url-machine-instance.js';
import { captureUrlMachinePeer, closeUrlMachinePeer, prepareUrlMachineListener,
  type UrlMachinePeer, type UrlMachinePeerAudit } from './url-machine-peer.js';
import { initializeUrlMachineStore } from './url-machine-store.js';
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
interface Client {
  readonly context: UrlMachineClientContext;
  record: UrlMachineClientRecord | null;
  digest: string | null;
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

/** The supervisor allocates endpoint identities before launch. The first actual
 * accepted peer supplies its independently attested verifier; no process tuple
 * from a role, prompt, saved report or socket path can issue an instance. */
export async function createUrlRunMachine(input: UrlRunMachineOptions) {
  input = Object.freeze({ ...input, plans: Object.freeze([...input.plans]) });
  const reader = urlMachineReaderProgram(input.runtime);
  if (reader === null || input.plans.length !== URL_ROLES.length
    || input.plans.some((plan, index) => !isPreparedUrlRolePlan(plan) || plan.role !== URL_ROLES[index]
      || plan.profile.input.binding.run !== input.runId || plan.profile.input.binding.role !== plan.role)
    || input.parent.subjects.find(subject => subject.path === URL_ORIGIN_POLICY_PATH)?.sha256 !== input.originPolicySha256
    || !input.current() || (input.effectCurrent !== undefined && input.effectCurrent() !== true)
    || !(await input.reverify()) || !input.current()
    || (input.effectCurrent !== undefined && input.effectCurrent() !== true)) throw refuse();
  const canonicalRoot = path.join(input.governanceRoot, 'governance/policies/dossier-machine-clients');
  // Preserve the shared checkout's reviewer access. Namespace exclusion, not
  // tightening the governance directory's ACL, protects it from role clients.
  await mkdir(canonicalRoot, { recursive: true, mode: 0o770 });
  if (await realpath(canonicalRoot) !== canonicalRoot || !input.current()) throw refuse();
  const store = await initializeUrlMachineStore({ governanceRoot: input.governanceRoot, protectedRoot: input.protectedRoot,
    deadline: input.deadline, now: input.now, current: input.current });
  if (store === null) throw refuse();
  const binding = Object.freeze({ controllerSha256: input.runtime.inputTreeSha256,
    parentBindingSha256: sha256(canonical({ rowId: input.parent.rowId, landedCommit: input.parent.landedCommit,
      tagObject: input.parent.tagObject, subjects: input.parent.subjects })) });
  const clients = new Map<string, Client>(), peers = new Set<UrlMachinePeer>();
  let stopped = false, closing = false;
  let mutations: Promise<unknown> = Promise.resolve();
  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = mutations.then(operation);
    mutations = result.catch(() => undefined);
    return result;
  };
  const current = (): boolean => !stopped && !closing && input.current()
    && (input.effectCurrent === undefined || input.effectCurrent() === true) && input.now() < input.deadline;
  let closed: Promise<{ readonly lifecycle: 'retired' | 'Unknown' }> | undefined;
  const close = (): Promise<{ readonly lifecycle: 'retired' | 'Unknown' }> => {
    if (closed !== undefined) return closed;
    closing = true;
    // Revoke synchronous effect boundaries before waiting for durable writes.
    // The store's parent authority remains live solely to publish retirement.
    for (const peer of peers) closeUrlMachinePeer(peer);
    return closed = serialize(async () => {
    let retired = true;
    // Keep the trusted parent checks alive until each one-way retirement is
    // durable. A failed/expired publication never becomes a successful close.
    for (const client of clients.values()) if (client.record !== null) {
      try {
      const now = input.now(), previous = client.record;
      const next = { ...previous, revision: previous.revision + 1, revokedAt: new Date(now).toISOString() };
      const result = await publishUrlMachineLifecycle({ context: { ...client.context, now }, binding,
        expected: { revision: previous.revision, sha256: client.digest! }, next: canonical(next) }, store);
      if (!result.ok) retired = false;
      else { client.record = next; client.digest = result.receipt.record.sha256; }
      } catch { retired = false; }
    }
    stopped = true;
    try { await store.close(); } catch { retired = false; }
    return { lifecycle: retired ? 'retired' : 'Unknown' };
    });
  };
  try {
    const transports = new Map<string, SessionMachineTransport>();
    for (const plan of input.plans) for (const kind of ['mcp-shim', 'inference-bridge'] as const) {
      const slot = await store.allocateClient(input.deadline);
      if (slot === null || !current()) throw refuse();
      const context: UrlMachineClientContext = Object.freeze({ clientId: slot.clientId, policySha256: input.originPolicySha256,
        sourcePin: input.pin, runId: input.runId, role: plan.role, kind, allowedScopes: scopes(plan.role, kind),
        profileSha256: plan.profile.digest, now: input.now(), deadline: input.deadline });
      const client: Client = { context, record: null, digest: null };
      const key = `${plan.role}/${kind}`;
      if (clients.has(key)) throw refuse();
      clients.set(key, client);
      let listener: ReturnType<typeof prepareUrlMachineListener> = null;
      const transport = createSessionMachineTransport({
        prepare: server => { if (!current()) return false; listener = prepareUrlMachineListener(server, reader, input.chargeNativeCpuMicroseconds); return listener !== null; },
        accept: async socket => {
          const until = Math.min(input.deadline, input.now() + 5000);
          let launch = input.launch(plan.role);
          while (launch === undefined && current() && input.now() < until) { await yieldToPoll(); launch = input.launch(plan.role); }
          if (launch === undefined || listener === null || !current() || !(await input.reverify()) || !current()) return null;
          const support = isOrderedDesignSessionProfile(plan.profile) ? plan.profile.transcript.supportSha256 : input.runtime.supportSha256;
          const name = kind === 'mcp-shim' ? 'session-mcp.js' : 'session-bridge.js';
          const peer = await captureUrlMachinePeer({ socket, listener, launch, profile: plan.profile, context,
            store, binding, programs: { peer: input.runtime.peerProgram, reader },
            installed: { executable: input.runtime.worker.node, sha256: input.runtime.worker.nodeSha256,
              script: path.join(plan.view.supportDirectory, name), scriptSha256: support[name] },
            protectedPaths: [...plan.view.protectedPaths, input.governanceRoot, input.protectedRoot], now: input.now,
            current: async () => current() && await input.reverify() === true && current(),
            effectCurrent: current, audit: input.audit,
            chargeNativeCpuMicroseconds: input.chargeNativeCpuMicroseconds });
          if (peer === null) return null;
          peers.add(peer);
          let permitted = false;
          try { permitted = await serialize(async () => {
          if (!current()) return false;
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
          const published = await publishUrlMachineLifecycle({ context: { ...context, now }, binding,
            expected: old === null ? null : { revision: old.revision, sha256: client.digest! }, next: canonical(next) }, store);
          if (!published.ok) return false;
          client.record = next; client.digest = published.receipt.record.sha256;
          return current();
          }); } finally {
            if (!permitted) { peers.delete(peer); closeUrlMachinePeer(peer); }
          }
          if (!permitted) return null;
          return peer;
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
