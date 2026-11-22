import { constants, renameSync } from 'node:fs';
import { mkdir, open, realpath, lstat, rmdir, unlink, type FileHandle } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import type { UrlMachineLifecycleAdapter, UrlMachineLifecycleLease, UrlMachineLifecycleSnapshot, UrlMachineLifecycleStep } from './url-machine-lifecycle.js';
import { URL_MACHINE_CLIENT_LIMITS } from './url-machine-instance.js';

type Expected = Parameters<UrlMachineLifecycleLease['advance']>[0];
type AuditStep = Extract<UrlMachineLifecycleStep, { kind: 'audit' }>;
type Head = AuditStep['head'];
type Projection = NonNullable<Expected['projection']>;
type Anchor = UrlMachineLifecycleSnapshot['anchor'];
interface Entry {
  readonly clientId: string;
  readonly witnessSha256: string;
  readonly anchor: Anchor;
  readonly audit: readonly AuditStep['event'][];
}
interface StoreState {
  readonly format: 'url-machine-store-state/1';
  readonly rootId: string;
  readonly used: readonly string[];
  readonly runs: readonly { readonly runId: string; readonly clients: readonly string[] }[];
  readonly clients: readonly Entry[];
}
interface StoreIdentity {
  readonly format: 'url-machine-store/1';
  readonly rootId: string;
  readonly canonicalRoot: string;
}
// At most 256 canonical files (64 KiB), 256 projections (16 KiB), an 8 MiB
// state, 16 KiB identity and one in-flight 8 MiB temporary fit this disk cap.
// A crash retains the lock, so temporary files cannot accumulate across runs.
export const URL_MACHINE_STORE_LIMITS = Object.freeze({ bytes: 8_388_608, nodes: 524_288, depth: 32,
  clients: 256, identities: 16_896, events: 4096, ioOperations: 512, operationBytes: 268_435_456, aggregateBytes: 50_331_648, operationMilliseconds: 5000, lockMilliseconds: 1000 });
const JSON_LIMITS = { maxBytes: URL_MACHINE_STORE_LIMITS.bytes, maxNodes: URL_MACHINE_STORE_LIMITS.nodes, maxDepth: URL_MACHINE_STORE_LIMITS.depth };
const canonical = (value: unknown): string => encodeCanonicalJson(value, JSON_LIMITS);
const equal = (left: unknown, right: unknown): boolean => canonical(left) === canonical(right);
const digest = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const fields = (value: unknown, names: readonly string[]): value is Record<string, unknown> => isRecord(value)
  && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const refused = (): Error => new Error('url-machine-store-unavailable');
const opaque = (): string => randomBytes(32).toString('hex');
const pathValid = (value: string): boolean => path.isAbsolute(value) && path.normalize(value) === value
  && value.length <= 4096 && !/[\0-\x1f\x7f]/u.test(value);
const below = (file: string, root: string): boolean => file === root || file.startsWith(`${root}/`);

export interface UrlMachineStoreOptions {
  /** The observing project's declared .syzygy governance root. */
  readonly governanceRoot: string;
  /** Existing parent is trusted. This store creates only its named child. */
  readonly protectedRoot: string;
  readonly deadline: number;
  readonly now: () => number;
  /** The host checks adoption, fixed policy, controller and namespace protection. */
  readonly current: () => boolean;
}
export interface UrlMachineStore extends UrlMachineLifecycleAdapter {
  readonly identitySha256: string;
  readonly protection: 'role-namespace-exclusion-required; privileged-store-rollback-Unknown';
  /** Allocate a new slot durably. Absence alone never produces a witness. */
  allocateClient(deadline: number): Promise<{ readonly clientId: string; readonly witnessSha256: string } | null>;
  close(): Promise<void>;
}

function projection(value: unknown): value is Projection {
  return fields(value, ['clientId', 'issuanceId', 'revision', 'sha256', 'generation', 'lifecycleSha256'])
    && digest(value.clientId) && digest(value.issuanceId) && positive(value.revision) && positive(value.generation)
    && Number(value.generation) <= 64 && digest(value.sha256) && digest(value.lifecycleSha256);
}
function head(value: unknown): value is Head {
  return fields(value, ['record', 'binding', 'auditSha256']) && projection(value.record) && digest(value.auditSha256)
    && fields(value.binding, ['parentBindingSha256', 'controllerSha256'])
    && digest(value.binding.parentBindingSha256) && digest(value.binding.controllerSha256);
}
function anchor(value: unknown, clientId: string): value is Anchor {
  if (!isRecord(value)) return false;
  if (value.kind === 'committed') return fields(value, ['kind', 'head']) && head(value.head) && value.head.record.clientId === clientId;
  return value.kind === 'never-issued' ? fields(value, ['kind', 'clientId', 'witnessSha256']) && value.clientId === clientId && digest(value.witnessSha256)
    : value.kind === 'pending' && fields(value, ['kind', 'clientId', 'intentSha256']) && value.clientId === clientId && digest(value.intentSha256);
}
function auditHead(event: AuditStep['event']): Head {
  return { record: event.next, binding: event.binding, auditSha256: sha256(encodeCanonicalJson(event, URL_MACHINE_CLIENT_LIMITS)) };
}
function auditValid(events: readonly unknown[], clientId: string, witnessSha256: string): events is readonly AuditStep['event'][] {
  let prior: Head | null = null;
  for (const event of events) {
    if (!fields(event, ['format', 'at', 'binding', 'projectId', 'policySha256', 'profileSha256', 'sourcePin', 'runId', 'role', 'kind', 'scopes', 'previous', 'neverIssuedSha256', 'next'])
      || event.format !== 'url-machine-lifecycle-audit/1' || !Number.isSafeInteger(event.at) || event.projectId !== 'project:syzygy'
      || !digest(event.policySha256) || !digest(event.profileSha256) || typeof event.sourcePin !== 'string'
      || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(event.sourcePin) || typeof event.runId !== 'string' || !/^run-[a-f0-9]{32}$/u.test(event.runId)
      || !['author', 'inventory', 'fidelity', 'design'].includes(String(event.role))
      || !['role-cli', 'mcp-shim', 'inference-bridge'].includes(String(event.kind))
      || !Array.isArray(event.scopes) || event.scopes.length < 1 || event.scopes.length > 5
      || new Set(event.scopes).size !== event.scopes.length
      || event.scopes.some(scope => !['source_read', 'artifact_read', 'artifact_write', 'dossier_step', 'inference-forward'].includes(String(scope)))
      || !projection(event.next) || event.next.clientId !== clientId || !equal(event.previous, prior)
      || event.neverIssuedSha256 !== (prior === null ? witnessSha256 : null)
      || event.next.revision !== (prior === null ? 1 : prior.record.revision + 1)
      || (prior !== null && (event.next.issuanceId !== prior.record.issuanceId || !equal(event.binding, prior.binding)
        || event.next.generation < prior.record.generation || event.next.generation > prior.record.generation + 1))) return false;
    const checked = event as unknown as AuditStep['event'];
    const next = auditHead(checked);
    if (!head(next)) return false;
    prior = next;
  }
  return true;
}
function stateValid(value: unknown, rootId: string): value is StoreState {
  if (!fields(value, ['format', 'rootId', 'used', 'runs', 'clients']) || value.format !== 'url-machine-store-state/1' || value.rootId !== rootId
    || !Array.isArray(value.used) || value.used.length > URL_MACHINE_STORE_LIMITS.identities || !value.used.every(digest)
    || new Set(value.used).size !== value.used.length || !Array.isArray(value.runs) || value.runs.length > URL_MACHINE_STORE_LIMITS.clients
    || !Array.isArray(value.clients) || value.clients.length > URL_MACHINE_STORE_LIMITS.clients) return false;
  const used = value.used;
  const clients = new Set<string>(), runs = new Set<string>();
  let events = 0;
  for (const entry of value.clients) {
    if (!fields(entry, ['clientId', 'witnessSha256', 'anchor', 'audit']) || !digest(entry.clientId) || clients.has(entry.clientId)
      || !digest(entry.witnessSha256) || !anchor(entry.anchor, entry.clientId) || !Array.isArray(entry.audit)
      || !auditValid(entry.audit, entry.clientId, entry.witnessSha256)) return false;
    events += entry.audit.length;
    if (events > URL_MACHINE_STORE_LIMITS.events) return false;
    if (entry.anchor.kind === 'never-issued') {
      if (entry.anchor.witnessSha256 !== entry.witnessSha256 || entry.audit.length !== 0 || value.used.includes(entry.clientId)) return false;
    } else if (!value.used.includes(entry.clientId)) return false;
    if (entry.anchor.kind === 'committed' && (entry.audit.length === 0 || !equal(entry.anchor.head, auditHead(entry.audit.at(-1)!)))) return false;
    clients.add(entry.clientId);
  }
  for (const run of value.runs) {
    if (!fields(run, ['runId', 'clients']) || typeof run.runId !== 'string' || !/^run-[a-f0-9]{32}$/u.test(run.runId)
      || runs.has(run.runId) || !Array.isArray(run.clients) || run.clients.length < 1 || run.clients.length > 16
      || new Set(run.clients).size !== run.clients.length || run.clients.some(client => typeof client !== 'string' || !clients.has(client) || !used.includes(client))) return false;
    runs.add(run.runId);
  }
  return true;
}

/** New-root creation is explicit and exclusive. Existing or reset roots are
 * never initialized as an empty registry. Keep this returned identity outside
 * writable role/run history when reopening the store. */
export async function initializeUrlMachineStore(options: UrlMachineStoreOptions): Promise<UrlMachineStore | null> {
  return setup(options, check => initialize(options, check));
}

async function setup(options: UrlMachineStoreOptions, run: (check: () => void) => Promise<UrlMachineStore | null>): Promise<UrlMachineStore | null> {
  let active = true;
  const until = performance.now() + URL_MACHINE_STORE_LIMITS.operationMilliseconds;
  const check = (): void => {
    if (!active || options.current() !== true || !Number.isSafeInteger(options.now()) || options.now() >= options.deadline
      || performance.now() >= until) throw refused();
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const work = (async () => {
    check();
    const store = await run(check);
    try { check(); return store; } catch { await store?.close(); return null; }
  })();
  void work.catch(() => {});
  try {
    return await Promise.race([work, new Promise<null>(resolve => { timer = setTimeout(() => { active = false; resolve(null); },
      Math.min(URL_MACHINE_STORE_LIMITS.operationMilliseconds, Math.max(1, options.deadline - options.now()))); })]);
  } catch { return null; }
  finally { active = false; clearTimeout(timer); }
}

async function initialize(options: UrlMachineStoreOptions, check: () => void): Promise<UrlMachineStore | null> {
  let handle: FileHandle | undefined;
  try {
    const canonicalRoot = locations(options);
    if (await realpath(path.dirname(options.protectedRoot)) !== path.dirname(options.protectedRoot)) return null;
    check();
    await mkdir(options.protectedRoot, { mode: 0o700 });
    check();
    handle = await open(options.protectedRoot, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    const rootId = opaque();
    const identity: StoreIdentity = { format: 'url-machine-store/1', rootId, canonicalRoot };
    for (const name of ['identity.json', 'state.json']) {
      check();
      const file = await open(`/proc/self/fd/${handle.fd}/${name}`, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      try {
        check();
        await file.writeFile(canonical(name === 'identity.json' ? identity : { format: 'url-machine-store-state/1', rootId, used: [], runs: [], clients: [] }));
        check(); await file.sync(); check();
      } finally { await file.close(); }
    }
    await handle.sync();
    await handle.close(); handle = undefined;
    check();
    const parent = await open(path.dirname(options.protectedRoot), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    try { check(); await parent.sync(); check(); } finally { await parent.close(); }
    return await openStore(options, sha256(canonical(identity)), check);
  } catch { return null; }
  finally { await handle?.close().catch(() => {}); }
}
function locations(options: UrlMachineStoreOptions): string {
  const { governanceRoot, protectedRoot } = options;
  if (!pathValid(governanceRoot) || path.basename(governanceRoot) !== '.syzygy' || !pathValid(protectedRoot)
    || below(protectedRoot, path.dirname(governanceRoot)) || below(governanceRoot, protectedRoot)
    || !positive(options.deadline) || typeof options.now !== 'function' || typeof options.current !== 'function') throw refused();
  return path.join(governanceRoot, 'governance/policies/dossier-machine-clients');
}

/** All metadata is secret-free. Protection is against the excluded role and
 * observed namespaces. A privileged rollback of this whole protected store is
 * outside this adapter's evidence and remains Unknown. */
export async function openUrlMachineStore(options: UrlMachineStoreOptions, expectedIdentitySha256: string): Promise<UrlMachineStore | null> {
  return setup(options, check => openStore(options, expectedIdentitySha256, check));
}

async function openStore(options: UrlMachineStoreOptions, expectedIdentitySha256: string, setupCurrent: () => void): Promise<UrlMachineStore | null> {
  let root: FileHandle | undefined, canonicalHome: FileHandle | undefined;
  try {
    setupCurrent();
    const canonicalRoot = locations(options);
    if (!digest(expectedIdentitySha256) || await realpath(options.protectedRoot) !== options.protectedRoot
      || await realpath(canonicalRoot) !== canonicalRoot) return null;
    root = await open(options.protectedRoot, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    canonicalHome = await open(canonicalRoot, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    const rootStat = await root.stat(), homeStat = await canonicalHome.stat();
    if (!rootStat.isDirectory() || (rootStat.mode & 0o077) !== 0 || !homeStat.isDirectory()
      || rootStat.uid !== process.getuid?.()) throw refused();
    const heldRoot = root, heldHome = canonicalHome;
    const base = `/proc/self/fd/${heldRoot.fd}`, home = `/proc/self/fd/${heldHome.fd}`;
    let closed = false, lastNow = 0;
    const activeWork = new Set<Promise<unknown>>();
    const budgets = new AsyncLocalStorage<{ calls: number; bytes: number }>();
    const charge = (bytes = 0): void => {
      const budget = budgets.getStore();
      if (budget && (++budget.calls > URL_MACHINE_STORE_LIMITS.ioOperations
        || (budget.bytes += bytes) > URL_MACHINE_STORE_LIMITS.operationBytes)) throw refused();
    };
    const live = (): number => {
      const instant = options.now();
      if (closed || options.current() !== true || !Number.isSafeInteger(instant) || instant < lastNow || instant >= options.deadline) throw refused();
      lastNow = instant;
      return instant;
    };
    const anchored = async (): Promise<void> => {
      live();
      const [actualRoot, actualHome] = await Promise.all([lstat(options.protectedRoot), lstat(canonicalRoot)]);
      if (!actualRoot.isDirectory() || (actualRoot.mode & 0o077) !== 0 || actualRoot.uid !== rootStat.uid
        || !actualHome.isDirectory() || actualRoot.dev !== rootStat.dev || actualRoot.ino !== rootStat.ino
        || actualHome.dev !== homeStat.dev || actualHome.ino !== homeStat.ino
        || await realpath(options.protectedRoot) !== options.protectedRoot || await realpath(canonicalRoot) !== canonicalRoot) throw refused();
      live();
    };
    const readFile = async (file: string, maximum: number, missing: boolean = false): Promise<Buffer | null> => {
      charge();
      let fileHandle: FileHandle;
      try { fileHandle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
      catch (error) { if (missing && (error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
      try {
        const before = await fileHandle.stat();
        if (!before.isFile() || before.nlink !== 1 || before.size < 1 || before.size > maximum) throw refused();
        charge(before.size + 1);
        const bytes = Buffer.alloc(before.size + 1);
        let length = 0;
        while (length < bytes.length) {
          const sample = await fileHandle.read(bytes, length, bytes.length - length, null);
          if (sample.bytesRead === 0) break;
          length += sample.bytesRead;
        }
        const after = await fileHandle.stat(), named = await lstat(file);
        if (length !== before.size || ['dev', 'ino', 'mode', 'nlink', 'size', 'mtimeMs', 'ctimeMs'].some(key =>
          before[key as keyof typeof before] !== after[key as keyof typeof after] || before[key as keyof typeof before] !== named[key as keyof typeof before])) throw refused();
        return bytes.subarray(0, length);
      } finally { await fileHandle.close(); }
    };
    const decode = (bytes: Buffer): unknown => {
      const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
      const value = parseBoundedJson(text, JSON_LIMITS);
      if (canonical(value) !== text) throw refused();
      return value;
    };
    await anchored();
    const identityBytes = await readFile(`${base}/identity.json`, 16_384);
    if (identityBytes === null || sha256(identityBytes) !== expectedIdentitySha256) throw refused();
    const identity = decode(identityBytes);
    if (!fields(identity, ['format', 'rootId', 'canonicalRoot']) || identity.format !== 'url-machine-store/1'
      || !digest(identity.rootId) || identity.canonicalRoot !== canonicalRoot) throw refused();
    const rootId = identity.rootId;
    const readState = async (): Promise<StoreState> => {
      await anchored();
      const id = await readFile(`${base}/identity.json`, 16_384);
      if (id === null || sha256(id) !== expectedIdentitySha256) throw refused();
      const bytes = await readFile(`${base}/state.json`, URL_MACHINE_STORE_LIMITS.bytes);
      const state = bytes === null ? null : decode(bytes);
      if (!stateValid(state, rootId)) throw refused();
      return state;
    };
    const ready = await readState();
    if (ready.clients.some(entry => entry.anchor.kind === 'pending')) throw refused();
    setupCurrent();
    const withLock = async (deadline: number, operation: (check: () => void, state: () => Promise<StoreState>, write: (file: string, bytes: Uint8Array, predecessor?: Uint8Array | null) => Promise<void>) => Promise<void>): Promise<boolean> => {
      const began = performance.now();
      let active = true, held = false, uncertain = false;
      const pending = new Set<Promise<unknown>>();
      const check = (): void => {
        if (!active || live() >= deadline || performance.now() - began >= URL_MACHINE_STORE_LIMITS.operationMilliseconds) throw refused();
      };
      const io = async <T>(start: () => Promise<T>): Promise<T> => {
        check(); charge();
        const promise = start();
        pending.add(promise);
        try {
          const value = await promise;
          check();
          return value;
        } finally { pending.delete(promise); }
      };
      const write = async (file: string, bytes: Uint8Array, predecessor?: Uint8Array | null): Promise<void> => {
        charge(bytes.byteLength);
        check(); await io(anchored);
        const parent = path.dirname(file), temporary = `${file}.new-${opaque()}`;
        let handle: FileHandle | undefined;
        try {
          await io(async () => { handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600); });
          const held = handle!;
          await io(() => held.writeFile(bytes)); await io(() => held.sync());
          check(); await io(anchored);
          if (predecessor !== undefined) {
            const actual = await io(() => readFile(file, URL_MACHINE_CLIENT_LIMITS.maxBytes, true));
            if (actual === null ? predecessor !== null : predecessor === null || !actual.equals(Buffer.from(predecessor))) throw refused();
          }
          check();
          // No asynchronous scheduling gap between currentness and publication.
          // POSIX cannot predicate rename on expiry or preempt a stalled syscall.
          // A failed post-boundary check leaves a pending, non-authorizing anchor.
          renameSync(temporary, file);
          await io(() => (parent === home ? heldHome : heldRoot).sync());
          const readback = await io(() => readFile(file, bytes.byteLength));
          if (readback === null || !readback.equals(Buffer.from(bytes))) throw refused();
          check();
        } finally {
          await handle?.close().catch(() => {});
          await unlink(temporary).catch(() => {});
        }
      };
      let timer: ReturnType<typeof setTimeout> | undefined;
      const work = budgets.run({ calls: 0, bytes: 0 }, async () => {
        if (!Number.isSafeInteger(deadline) || deadline > options.deadline || deadline <= live()) throw refused();
        for (;;) {
          check(); await io(anchored);
          try { await io(() => mkdir(`${base}/lock`, { mode: 0o700 })); held = true; break; }
          catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || performance.now() - began >= URL_MACHINE_STORE_LIMITS.lockMilliseconds) throw error;
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        await io(() => heldRoot.sync());
        await operation(check, () => io(readState), write);
        check();
      });
      activeWork.add(work);
      void work.then(() => activeWork.delete(work), () => activeWork.delete(work));
      try {
        await Promise.race([work, new Promise<never>((_, reject) => {
          timer = setTimeout(() => { uncertain = true; active = false; reject(refused()); }, Math.min(URL_MACHINE_STORE_LIMITS.operationMilliseconds, Math.max(1, deadline - live())));
        })]);
        return true;
      } catch { uncertain = true; return false; }
      finally {
        clearTimeout(timer); active = false;
        // An unresolved operation leaves a durable lock. No successor steals it.
        if (held && !uncertain && pending.size === 0) {
          await rmdir(`${base}/lock`).catch(() => { uncertain = true; });
          await heldRoot.sync().catch(() => {});
        }
      }
    };
    const allocateClient = async (deadline: number) => {
      let issued: { readonly clientId: string; readonly witnessSha256: string } | null = null;
      const finished = await withLock(deadline, async (check, state, write) => {
        const current = await state();
        if (current.clients.length >= URL_MACHINE_STORE_LIMITS.clients) throw refused();
        const clientId = opaque();
        if (current.used.includes(clientId) || current.clients.some(entry => entry.clientId === clientId)) throw refused();
        const witnessSha256 = sha256(canonical({ rootId, clientId, nonce: opaque() }));
        const entry: Entry = { clientId, witnessSha256, anchor: { kind: 'never-issued', clientId, witnessSha256 }, audit: [] };
        const next: StoreState = { ...current, clients: [...current.clients, entry] };
        if (!stateValid(next, rootId)) throw refused();
        await write(`${base}/state.json`, Buffer.from(canonical(next)));
        if (!equal(await state(), next)) throw refused();
        check(); issued = { clientId, witnessSha256 };
      });
      return finished ? issued : null;
    };
    const exclusive: UrlMachineLifecycleAdapter['exclusive'] = async (clientId, deadline, operation) => {
      if (!digest(clientId)) return false;
      return withLock(deadline, async (check, state, write) => {
        let phase = 0;
        const order = ['reserve', 'publish', 'synchronize', 'audit', 'commit'];
        const read = async (): Promise<UrlMachineLifecycleSnapshot | null> => {
          check();
          const current = await state(), entry = current.clients.find(client => client.clientId === clientId);
          if (!entry || (entry.anchor.kind === 'pending' && phase === 0)) return null;
          const [canonicalBytes, projectionBytes] = await Promise.all([
            readFile(`${home}/${clientId}.json`, URL_MACHINE_CLIENT_LIMITS.maxBytes, true),
            readFile(`${base}/projection-${clientId}.json`, 16_384, true),
          ]);
          check(); await anchored(); check();
          const projected = projectionBytes === null ? null : decode(projectionBytes);
          if (projected !== null && (!projection(projected) || projected.clientId !== clientId)) return null;
          const audited = entry.audit.length === 0 ? null : auditHead(entry.audit.at(-1)!);
          if (phase === 0 && (entry.anchor.kind === 'committed'
            ? canonicalBytes === null || projected === null || sha256(canonicalBytes) !== entry.anchor.head.record.sha256
              || !equal(projected, entry.anchor.head.record) || !equal(audited, entry.anchor.head)
            : canonicalBytes !== null || projected !== null || audited !== null)) return null;
          return { canonical: canonicalBytes, projection: projected, anchor: entry.anchor, audit: audited };
        };
        const advance: UrlMachineLifecycleLease['advance'] = async (expected, step) => {
          check();
          if (step.kind !== order[phase]) return false;
          const before = await read();
          if (before === null || !equal(expected, { canonicalSha256: before.canonical === null ? null : sha256(before.canonical),
            projection: before.projection, anchor: before.anchor, audit: before.audit })) return false;
          const current = await state();
          const entry = current.clients.find(client => client.clientId === clientId)!;
          let nextEntry: Entry = entry;
          let nextState: StoreState = current;
          if (step.kind === 'reserve') {
            if (!anchor(step.anchor, clientId) || step.anchor.kind !== 'pending' || step.newIdentities.length > 3
              || step.newIdentities.some(id => !digest(id) || current.used.includes(id)) || new Set(step.newIdentities).size !== step.newIdentities.length
              || current.used.length + step.newIdentities.length > URL_MACHINE_STORE_LIMITS.identities) return false;
            if (entry.anchor.kind === 'never-issued' && (step.newIdentities.length !== 3 || !step.newIdentities.includes(clientId) || step.newClient === null)) return false;
            if (entry.anchor.kind === 'committed' && (step.newIdentities.length > 1 || step.newClient !== null)) return false;
            let runs = current.runs;
            if (step.newClient !== null) {
              if (step.newClient.limit !== 16 || !/^run-[a-f0-9]{32}$/u.test(step.newClient.runId)) return false;
              const run = runs.find(run => run.runId === step.newClient!.runId);
              if (run?.clients.includes(clientId) || (run?.clients.length ?? 0) >= 16) return false;
              runs = [...runs.filter(run => run.runId !== step.newClient!.runId), { runId: step.newClient.runId, clients: [...(run?.clients ?? []), clientId] }];
            }
            nextEntry = { ...entry, anchor: step.anchor };
            nextState = { ...current, used: [...current.used, ...step.newIdentities], runs };
          } else if (step.kind === 'publish') {
            if (!(step.canonical instanceof Uint8Array) || step.canonical.byteLength < 1 || step.canonical.byteLength > URL_MACHINE_CLIENT_LIMITS.maxBytes) return false;
            await write(`${home}/${clientId}.json`, step.canonical, before.canonical);
          } else if (step.kind === 'synchronize') {
            if (!projection(step.projection) || step.projection.clientId !== clientId || before.canonical === null || sha256(before.canonical) !== step.projection.sha256) return false;
            await write(`${base}/projection-${clientId}.json`, Buffer.from(canonical(step.projection)));
          } else if (step.kind === 'audit') {
            if (!head(step.head) || !equal(step.head, auditHead(step.event)) || entry.anchor.kind !== 'pending'
              || entry.anchor.intentSha256 !== step.head.auditSha256 || !equal(before.projection, step.head.record)) return false;
            nextEntry = { ...entry, audit: [...entry.audit, step.event] };
          } else {
            if (!anchor(step.anchor, clientId) || step.anchor.kind !== 'committed' || !equal(step.anchor.head, before.audit)) return false;
            nextEntry = { ...entry, anchor: step.anchor };
          }
          if (step.kind === 'reserve' || step.kind === 'audit' || step.kind === 'commit') {
            nextState = { ...nextState, clients: current.clients.map(client => client.clientId === clientId ? nextEntry : client) };
            if (!stateValid(nextState, rootId)) return false;
            await write(`${base}/state.json`, Buffer.from(canonical(nextState)));
          }
          check(); phase++;
          return true;
        };
        await operation(Object.freeze({ now: () => live(), current: () => { try { check(); return true; } catch { return false; } }, read, advance }));
        if (phase !== 0 && phase !== 5) throw refused();
      });
    };
    return Object.freeze({ identitySha256: expectedIdentitySha256, protection: 'role-namespace-exclusion-required; privileged-store-rollback-Unknown' as const,
      allocateClient, exclusive, close: async () => {
        if (closed) return;
        closed = true;
        // An arbitrary controller callback can remain pending. Invalidate it
        // immediately, retaining descriptors until its actual work settles.
        const closeHandles = async () => { await heldHome.close(); await heldRoot.close(); };
        if (activeWork.size === 0) await closeHandles();
        else void Promise.allSettled([...activeWork]).then(closeHandles).catch(() => {});
      } });
  } catch { await canonicalHome?.close().catch(() => {}); await root?.close().catch(() => {}); return null; }
}
