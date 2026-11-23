import { constants, lstatSync, realpathSync, renameSync, type Stats } from 'node:fs';
import { mkdir, open, realpath, lstat, rmdir, unlink, opendir, type FileHandle } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { identifyUrlMachineLifecycleRecord, publishUrlMachineLifecycle, type UrlMachineLifecyclePublication, type UrlMachineLifecycleResult } from './url-machine-lifecycle.js';
import { isNativeSessionProfile, isOrderedDesignSessionProfile, type NativeSessionProfile } from './session-profile.js';
import { encodeUrlMachineArchive, isUrlMachineArchivePointer, readUrlMachineArchive, urlMachineArchiveCapacity, URL_MACHINE_ARCHIVE_LIMITS, type UrlMachineArchive, type UrlMachineArchivePointer } from './url-machine-archive.js';
import type { UrlMachineLifecycleAdapter, UrlMachineLifecycleLease, UrlMachineLifecycleSnapshot, UrlMachineLifecycleStep } from './url-machine-lifecycle.js';
import { readUrlMachineClient, URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientContext } from './url-machine-instance.js';

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
  readonly format: 'url-machine-store-state/1' | 'url-machine-store-state/2';
  readonly archive?: UrlMachineArchivePointer;
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
type AllocatedClient = { readonly clientId: string; readonly witnessSha256: string };
// At most 256 canonical files (64 KiB), 256 projections (16 KiB), an 8 MiB
// state, 16 KiB identity, a 10 MB archive and one 10 MB temporary fit this cap.
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
  /** The same fresh authority check around asynchronous filesystem work. */
  readonly currentAsync?: () => Promise<boolean>;
}
interface UrlMachineStoreLease extends UrlMachineLifecycleLease {
  sampleCurrent(): number | null;
}
export interface UrlMachineStore extends UrlMachineLifecycleAdapter {
  /** Only a genuine profile matching this client's durable binding may select
   * its declared native effect envelope. Ordinary lifecycle I/O keeps five seconds. */
  exclusive(clientId: string, deadline: number, run: (lease: UrlMachineStoreLease) => Promise<void>, effectProfile?: NativeSessionProfile): Promise<boolean>;
  /** Run only the trusted lifecycle publication protocol inside one held lock. */
  publish(input: UrlMachineLifecyclePublication, stillOpening?: () => boolean): Promise<UrlMachineLifecycleResult>;
  readonly identitySha256: string;
  readonly protection: 'role-namespace-exclusion-required; privileged-store-rollback-Unknown';
  /** Allocate a new slot durably. Absence alone never produces a witness. */
  allocateClient(deadline: number): Promise<AllocatedClient | null>;
  /** Allocate up to eight never-issued slots in one protected state publication. */
  allocateClients(count: number, deadline: number): Promise<readonly AllocatedClient[] | null>;
  close(): Promise<void>;
}
export interface UrlMachineStoreHistory {
  readonly identitySha256: string;
  readonly observedAt: number;
  readonly canonical: Uint8Array;
  readonly head: Head;
  readonly events: readonly AuditStep['event'][];
  /** Exact retained revisions only; legacy omissions remain unavailable. */
  readonly revisions: readonly { readonly revision: number; readonly canonical: Uint8Array }[];
}
const historyReaders = new WeakMap<UrlMachineStore, (clientId: string, expected: Head, deadline: number) => Promise<UrlMachineStoreHistory | null>>();
/** A genuine retained/reopened adapter supplies history under the existing
 * bounded cross-process lock. No canonical, projection or anchor is updated.
 * The expected root identity and head must come from an independent source.
 * A store-shaped object cannot substitute a serialized or fabricated history.
 */
export async function readUrlMachineStoreHistory(store: UrlMachineStore, clientId: string, expected: Head, deadline: number): Promise<UrlMachineStoreHistory | null> {
  try { return await historyReaders.get(store)?.(clientId, expected, deadline) ?? null; } catch { return null; }
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
  if (!isRecord(value) || !(value.format === 'url-machine-store-state/1'
    ? fields(value, ['format', 'rootId', 'used', 'runs', 'clients'])
    : value.format === 'url-machine-store-state/2' && fields(value, ['format', 'rootId', 'used', 'runs', 'clients', 'archive']) && isUrlMachineArchivePointer(value.archive)) || value.rootId !== rootId
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
    const archive = encodeUrlMachineArchive({ format: 'url-machine-canonical-history/1', rootId, entries: [] });
    const initial: StoreState = { format: 'url-machine-store-state/2', rootId, used: [], runs: [], clients: [],
      archive: { sha256: sha256(archive), bytes: archive.length, records: 0, legacy: [] } };
    for (const name of ['identity.json', 'canonical-history.json', 'state.json']) {
      check();
      const file = await open(`/proc/self/fd/${handle.fd}/${name}`, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      try {
        check();
        await file.writeFile(name === 'canonical-history.json' ? archive : canonical(name === 'identity.json' ? identity : initial));
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
    const clock = (): number => {
      const instant = options.now();
      if (closed || !Number.isSafeInteger(instant) || instant < lastNow || instant >= options.deadline) throw refused();
      lastNow = instant;
      return instant;
    };
    const live = (): number => {
      clock();
      if (options.current() !== true) throw refused();
      return clock();
    };
    const currentAsync = options.currentAsync;
    const liveAsync = async (authorize: () => Promise<boolean>): Promise<void> => {
      clock();
      if (await authorize() !== true) throw refused();
      clock();
    };
    const verifyRootIdentity = (actualRoot: Stats, actualHome: Stats): void => {
      if (!actualRoot.isDirectory() || (actualRoot.mode & 0o077) !== 0 || actualRoot.uid !== rootStat.uid
        || !actualHome.isDirectory() || actualRoot.dev !== rootStat.dev || actualRoot.ino !== rootStat.ino
        || actualHome.dev !== homeStat.dev || actualHome.ino !== homeStat.ino) throw refused();
    };
    const verifyNamedRoots = (): void => {
      charge();
      verifyRootIdentity(lstatSync(options.protectedRoot), lstatSync(canonicalRoot));
      if (realpathSync(options.protectedRoot) !== options.protectedRoot || realpathSync(canonicalRoot) !== canonicalRoot) throw refused();
    };
    const anchored = async (publicationClock?: () => number): Promise<void> => {
      if (publicationClock !== undefined) publicationClock();
      else if (currentAsync === undefined) live();
      else await liveAsync(currentAsync);
      verifyRootIdentity(...await Promise.all([lstat(options.protectedRoot), lstat(canonicalRoot)]));
      if (await realpath(options.protectedRoot) !== options.protectedRoot || await realpath(canonicalRoot) !== canonicalRoot) throw refused();
      if (publicationClock !== undefined) publicationClock();
      else if (currentAsync === undefined) live();
      else await liveAsync(currentAsync);
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
    let validatedArchive: { key: string; value: UrlMachineArchive } | undefined;
    let validatedState: { sha256: string; value: StoreState } | undefined;
    const archiveKeys = new WeakMap<StoreState, string>();
    const readArchive = async (state: StoreState): Promise<{ bytes: Buffer | null; value: UrlMachineArchive | null }> => {
      const bytes = await readFile(`${base}/canonical-history.json`, URL_MACHINE_ARCHIVE_LIMITS.bytes, true);
      if (state.format === 'url-machine-store-state/1') {
        if (bytes !== null) throw refused();
        return { bytes: null, value: null };
      }
      if (bytes === null || !state.archive || bytes.length !== state.archive.bytes || sha256(bytes) !== state.archive.sha256) throw refused();
      // Cache only semantic decoding, bound to exact physical bytes, pointer and
      // complete lifecycle history. Every read still verifies the actual file.
      let key = archiveKeys.get(state);
      if (key === undefined) {
        key = sha256(canonical({ pointer: state.archive, clients: state.clients.filter(item => item.audit.length > 0)
          .map(item => ({ clientId: item.clientId, audit: item.audit })) }));
        archiveKeys.set(state, key);
      }
      if (validatedArchive?.key === key) return { bytes, value: validatedArchive.value };
      const value = readUrlMachineArchive(bytes, state.archive, rootId, state.clients, live());
      if (value === null) throw refused();
      validatedArchive = { key, value };
      return { bytes, value };
    };
    const census = async (): Promise<void> => {
      charge();
      const directory = await opendir(base);
      let count = 0;
      for await (const item of directory) {
        charge();
        if (++count > URL_MACHINE_STORE_LIMITS.clients + 5 || item.name.startsWith('canonical-history') && item.name !== 'canonical-history.json') throw refused();
      }
    };
    const readStateSnapshot = async (publicationClock?: () => number) => {
      await anchored(publicationClock);
      // These exact private reads share the checked root and deadline.
      // Join both before using either result or reading the archive.
      const [identity, stateFile] = await Promise.allSettled([
        readFile(`${base}/identity.json`, 16_384),
        readFile(`${base}/state.json`, URL_MACHINE_STORE_LIMITS.bytes),
      ]);
      if (identity.status === 'rejected') throw identity.reason;
      if (identity.value === null || sha256(identity.value) !== expectedIdentitySha256) throw refused();
      if (stateFile.status === 'rejected') throw stateFile.reason;
      const bytes = stateFile.value;
      if (bytes === null) throw refused();
      const digest = sha256(bytes);
      if (validatedState?.sha256 !== digest) {
        const decoded = decode(bytes);
        if (!stateValid(decoded, rootId)) throw refused();
        validatedState = { sha256: digest, value: decoded };
      }
      const state = validatedState.value;
      const archive = await readArchive(state);
      return { state, archive };
    };
    const readState = async (): Promise<StoreState> => (await readStateSnapshot()).state;
    await census();
    const ready = await readState();
    if (ready.clients.some(entry => entry.anchor.kind === 'pending')) throw refused();
    setupCurrent();
    type StagedBoundary = { readonly current: (() => boolean) | undefined; readonly allocation?: true };
    type StoreOperation = (lease: {
      check: () => number;
      checkWork: () => number;
      reverify: () => Promise<void>;
      anchored: () => Promise<void>;
      state: () => Promise<StoreState>;
      stateSnapshot: () => ReturnType<typeof readStateSnapshot>;
      write: (file: string, bytes: Uint8Array, predecessor?: Uint8Array | null) => Promise<void>;
    }) => Promise<void>;
    const withLock = async (deadline: number, operation: StoreOperation, bounds: {
      readonly operationMilliseconds?: number;
      readonly staging?: StagedBoundary | undefined;
      readonly ordinaryEffect?: boolean;
    } = {}): Promise<boolean> => {
      const { operationMilliseconds = URL_MACHINE_STORE_LIMITS.operationMilliseconds, staging, ordinaryEffect = false } = bounds;
      const began = performance.now();
      let active = true, held = false, uncertain = false, contended = false;
      const pending = new Set<Promise<unknown>>();
      const allocation = staging?.allocation === true;
      const stagedPublication = staging !== undefined && !allocation;
      const checkDeadline = (): number => {
        if (!active || (staging?.current !== undefined && staging.current() !== true)) throw refused();
        const now = clock();
        if (now >= deadline || performance.now() - began >= operationMilliseconds) throw refused();
        return now;
      };
      const check = (): number => {
        checkDeadline();
        live();
        return checkDeadline();
      };
      // Staging exposes no intermediate read or grant. Check its lease during
      // private I/O and require full authority at durable and release boundaries.
      const stagingClock = staging === undefined ? undefined : checkDeadline;
      const checkWork = stagingClock ?? check;
      const verifyAnchors = () => anchored(stagingClock);
      // The I/O wrapper supplies the enclosing authority checks for this read.
      const verifyAnchorsDuringIo = () => anchored(checkDeadline);
      const checkAsync = async (authorize: () => Promise<boolean>): Promise<void> => {
        checkDeadline();
        await liveAsync(authorize);
        checkDeadline();
      };
      const reverify = async (): Promise<void> => {
        if (currentAsync === undefined) check();
        else await checkAsync(currentAsync);
      };
      const io = async <T>(start: () => Promise<T>): Promise<T> => {
        if (currentAsync === undefined || staging !== undefined) checkWork();
        else await checkAsync(currentAsync);
        // The staged publication guard already sampled this boundary.
        if (!stagedPublication) checkDeadline();
        charge();
        const promise = start();
        pending.add(promise);
        try {
          const value = await promise;
          if (currentAsync === undefined || staging !== undefined) checkWork();
          else await checkAsync(currentAsync);
          if (!stagedPublication) checkDeadline();
          return value;
        } finally { pending.delete(promise); }
      };
      const write = async (file: string, bytes: Uint8Array, predecessor?: Uint8Array | null): Promise<void> => {
        charge(bytes.byteLength);
        checkWork(); await io(verifyAnchorsDuringIo);
        const parent = path.dirname(file), temporary = `${file}.new-${opaque()}`;
        let handle: FileHandle | undefined;
        try {
          await io(async () => { handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600); });
          const held = handle!;
          await io(() => held.writeFile(bytes)); await io(() => held.sync());
          checkWork(); await io(verifyAnchorsDuringIo);
          if (predecessor !== undefined) {
            const actual = await io(() => readFile(file, Math.max(bytes.byteLength, predecessor?.byteLength ?? 0), true));
            if (actual === null ? predecessor !== null : predecessor === null || !actual.equals(Buffer.from(predecessor))) throw refused();
          }
          if (allocation) await reverify();
          check();
          if (allocation) { verifyNamedRoots(); checkDeadline(); }
          // No asynchronous scheduling gap between currentness and publication.
          // POSIX cannot predicate rename on expiry or preempt a stalled syscall.
          // A failed post-boundary check leaves a pending, non-authorizing anchor.
          renameSync(temporary, file);
          await io(() => (parent === home ? heldHome : heldRoot).sync());
          const readback = await io(() => readFile(file, bytes.byteLength));
          if (readback === null || !readback.equals(Buffer.from(bytes))) throw refused();
          checkWork();
        } finally {
          await handle?.close().catch(() => {});
          await unlink(temporary).catch(() => {});
        }
      };
      let timer: ReturnType<typeof setTimeout> | undefined;
      const work = budgets.run({ calls: 0, bytes: 0 }, async () => {
        // In an unstaged synchronous operation, io checks the same live
        // authority immediately before submitting the first anchor read.
        const synchronousAnchor = currentAsync === undefined && staging === undefined;
        if (!Number.isSafeInteger(deadline) || deadline > options.deadline
          || (!synchronousAnchor && deadline <= live())) throw refused();
        for (;;) {
          if (!synchronousAnchor) check();
          await io(verifyAnchorsDuringIo);
          if (allocation) {
            await reverify(); check(); verifyNamedRoots(); checkDeadline();
            if (contended && performance.now() - began >= URL_MACHINE_STORE_LIMITS.lockMilliseconds) throw refused();
          }
          try { await io(() => mkdir(`${base}/lock`, { mode: 0o700 })); held = true; break; }
          catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || performance.now() - began >= URL_MACHINE_STORE_LIMITS.lockMilliseconds) throw error;
            contended = true;
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        if (allocation) {
          check();
          if (contended && performance.now() - began >= URL_MACHINE_STORE_LIMITS.lockMilliseconds) throw refused();
        }
        if (staging === undefined && (currentAsync !== undefined || ordinaryEffect)) {
          // The held lock's sync and the private census are independent.
          // Join both and recheck authority before any client state read.
          await io(async () => {
            charge();
            const [synced, scanned] = await Promise.allSettled([heldRoot.sync(), census()]);
            if (synced.status === 'rejected') throw synced.reason;
            if (scanned.status === 'rejected') throw scanned.reason;
          });
        } else {
          await io(() => heldRoot.sync());
          if (allocation) { await reverify(); check(); }
          await io(census);
        }
        // Bracket the complete private state read, including its named roots,
        // with I/O authority. The client read still starts after that check.
        const stateSnapshot = () => io(() => readStateSnapshot(checkDeadline));
        await operation({ check, checkWork, reverify, anchored: verifyAnchors,
          state: async () => (await stateSnapshot()).state, stateSnapshot, write });
        check();
        if (allocation) {
          // The slot is durable. Keep lock cleanup and witness admission
          // inside the same deadline as the allocation.
          await rmdir(`${base}/lock`); await heldRoot.sync();
          await reverify(); check(); verifyNamedRoots(); checkDeadline();
        }
      });
      activeWork.add(work);
      void work.then(() => activeWork.delete(work), () => activeWork.delete(work));
      try {
        await Promise.race([work, new Promise<never>((_, reject) => {
          const operationRemaining = operationMilliseconds - (performance.now() - began);
          timer = setTimeout(() => { uncertain = true; active = false; reject(refused()); },
            Math.max(1, Math.min(operationRemaining, deadline - clock())));
        })]);
        return true;
      } catch { uncertain = true; return false; }
      finally {
        clearTimeout(timer); active = false;
        // An unresolved protected write leaves its lock. No successor steals it.
        if (!allocation && held && !uncertain && pending.size === 0) {
          await rmdir(`${base}/lock`).catch(() => { uncertain = true; });
          await heldRoot.sync().catch(() => {});
        }
      }
    };
    const allocateClients = async (count: number, deadline: number): Promise<readonly AllocatedClient[] | null> => {
      if (!Number.isSafeInteger(count) || count < 1 || count > 8) return null;
      // Full async checks bracket the protected state and durable write.
      // Every new slot remains never-issued, even if a late check withholds the witnesses.
      const staging: StagedBoundary | undefined = currentAsync === undefined ? undefined : { allocation: true, current: undefined };
      let issued: readonly AllocatedClient[] | null = null;
      const finished = await withLock(deadline, async ({ check, reverify, state, write }) => {
        const current = await state();
        if (staging !== undefined) { await reverify(); check(); }
        if (current.clients.length + count > URL_MACHINE_STORE_LIMITS.clients) throw refused();
        const occupied = new Set([...current.used, ...current.clients.map(entry => entry.clientId)]);
        const entries: Entry[] = [];
        for (let index = 0; index < count; index++) {
          const clientId = opaque();
          if (occupied.has(clientId)) throw refused();
          occupied.add(clientId);
          const witnessSha256 = sha256(canonical({ rootId, clientId, nonce: opaque() }));
          entries.push({ clientId, witnessSha256, anchor: { kind: 'never-issued', clientId, witnessSha256 }, audit: [] });
        }
        const next: StoreState = { ...current, clients: [...current.clients, ...entries] };
        if (!stateValid(next, rootId)) throw refused();
        const bytes = Buffer.from(canonical(next));
        await write(`${base}/state.json`, bytes);
        validatedState = { sha256: sha256(bytes), value: next };
        if (!equal(await state(), next)) throw refused();
        if (staging !== undefined) await reverify();
        check();
        issued = entries.map(({ clientId, witnessSha256 }) => ({ clientId, witnessSha256 }));
      }, { staging });
      return finished ? issued : null;
    };
    const allocateClient = async (deadline: number): Promise<AllocatedClient | null> =>
      (await allocateClients(1, deadline))?.[0] ?? null;
    const exclusive = async (clientId: string, deadline: number, operation: (lease: UrlMachineStoreLease) => Promise<void>,
      effectProfile?: NativeSessionProfile, publication?: StagedBoundary): Promise<boolean> => {
      if (!digest(clientId) || (effectProfile !== undefined && !isNativeSessionProfile(effectProfile))) return false;
      const orderedEffect = effectProfile !== undefined && isOrderedDesignSessionProfile(effectProfile);
      const operationMilliseconds = orderedEffect
        ? effectProfile.transcript.nativeEffectMilliseconds : URL_MACHINE_STORE_LIMITS.operationMilliseconds;
      if (!positive(operationMilliseconds) || operationMilliseconds > 30_000) return false;
      return withLock(deadline, async ({ check, checkWork, anchored, state, stateSnapshot, write }) => {
        if (effectProfile !== undefined) {
          const audit = (await state()).clients.find(client => client.clientId === clientId)?.audit.at(-1);
          if (!audit || audit.profileSha256 !== effectProfile.digest || audit.role !== effectProfile.input.binding.role
            || audit.runId !== effectProfile.input.binding.run) throw refused();
        }
        let phase = 0;
        const order = ['reserve', 'publish', 'synchronize', 'audit', 'commit'];
        let prepared: { canonical: Buffer; head: Head; runId: string; newIdentities: readonly string[]; archive: Buffer; predecessor: Buffer | null; pointer: UrlMachineArchivePointer } | null = null;
        const preflightCanonical: NonNullable<UrlMachineLifecycleLease['preflightCanonical']> = async (candidate, proposedHead) => {
          checkWork();
          if (phase !== 0 || prepared !== null || !head(proposedHead) || proposedHead.record.clientId !== clientId) return false;
          const bytes = Buffer.from(candidate);
          const { state: current, archive: prior } = await stateSnapshot();
          const entry = current.clients.find(item => item.clientId === clientId);
          if (!entry || (entry.anchor.kind !== 'never-issued' && entry.anchor.kind !== 'committed') || sha256(bytes) !== proposedHead.record.sha256) return false;
          const raw = parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes), URL_MACHINE_CLIENT_LIMITS);
          if (!isRecord(raw)) return false;
          const last = entry.audit.at(-1);
          const checked = readUrlMachineClient(bytes, { clientId, policySha256: String(raw.policySha256), profileSha256: last?.profileSha256 ?? String((raw.instances as { verifier?: { profileSha256?: string } }[] | undefined)?.[0]?.verifier?.profileSha256),
            sourcePin: String(raw.sourcePin), runId: String(raw.runId), role: raw.role as UrlMachineClientContext['role'], kind: raw.kind as UrlMachineClientContext['kind'], allowedScopes: raw.scopes as UrlMachineClientContext['allowedScopes'], now: checkWork(), deadline });
          if (!checked.ok || !equal(identifyUrlMachineLifecycleRecord(checked.record, checked.sha256), proposedHead.record)
            || !Buffer.from(encodeCanonicalJson(checked.record, URL_MACHINE_CLIENT_LIMITS)).equals(bytes)) return false;
          const legacy = current.archive?.legacy ?? current.clients.flatMap(item => {
            const prior = item.audit.at(-1); return prior ? [{ clientId: item.clientId, revision: prior.next.revision, sha256: prior.next.sha256 }] : [];
          });
          const entries = [...(prior.value?.entries ?? []), { clientId, revision: checked.record.revision, sha256: checked.sha256, record: checked.record }];
          let archive: Buffer;
          try { archive = encodeUrlMachineArchive({ format: 'url-machine-canonical-history/1', rootId, entries }); } catch { return false; }
          const active = current.clients.reduce((total, item) => {
            const latest = item.clientId === clientId ? checked.record : entries.filter(value => value.clientId === item.clientId).at(-1)?.record;
            if (item.clientId !== clientId && item.audit.length === 0) return total;
            return total + (latest === undefined || latest.revokedAt === null ? 1 : 0);
          }, 0);
          if (!urlMachineArchiveCapacity(archive.length, current.clients.reduce((total, item) => total + item.audit.length, 1), active)) return false;
          prepared = { canonical: bytes, head: deepFreeze(proposedHead), runId: checked.record.runId,
            newIdentities: entry.anchor.kind === 'never-issued' ? [clientId, checked.record.issuanceId, checked.record.instances[0]!.instanceId]
              : checked.record.instances.slice(entry.anchor.head.record.generation).map(value => value.instanceId), archive, predecessor: prior.bytes,
            pointer: { sha256: sha256(archive), bytes: archive.length, records: entries.length, legacy } };
          checkWork(); return true;
        };
        const read = async (): Promise<UrlMachineLifecycleSnapshot | null> => {
          checkWork();
          const current = await state(), entry = current.clients.find(client => client.clientId === clientId);
          if (!entry || (entry.anchor.kind === 'pending' && phase === 0)) return null;
          const [canonicalBytes, projectionBytes] = await Promise.all([
            readFile(`${home}/${clientId}.json`, URL_MACHINE_CLIENT_LIMITS.maxBytes, true),
            readFile(`${base}/projection-${clientId}.json`, 16_384, true),
          ]);
          checkWork(); await anchored(); checkWork();
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
          checkWork();
          if (step.kind !== order[phase] || prepared === null) return false;
          const before = await read();
          if (before === null || !equal(expected, { canonicalSha256: before.canonical === null ? null : sha256(before.canonical),
            projection: before.projection, anchor: before.anchor, audit: before.audit })) return false;
          const current = await state();
          const entry = current.clients.find(client => client.clientId === clientId)!;
          let nextEntry: Entry = entry;
          let nextState: StoreState = current;
          if (step.kind === 'reserve') {
            if (!anchor(step.anchor, clientId) || step.anchor.kind !== 'pending' || step.anchor.intentSha256 !== prepared.head.auditSha256 || !equal(step.newIdentities, prepared.newIdentities) || step.newIdentities.length > 3
              || step.newIdentities.some(id => !digest(id) || current.used.includes(id)) || new Set(step.newIdentities).size !== step.newIdentities.length
              || current.used.length + step.newIdentities.length > URL_MACHINE_STORE_LIMITS.identities) return false;
            if (entry.anchor.kind === 'never-issued' && (step.newIdentities.length !== 3 || !step.newIdentities.includes(clientId) || step.newClient === null)) return false;
            if (entry.anchor.kind === 'committed' && (step.newIdentities.length > 1 || step.newClient !== null)) return false;
            let runs = current.runs;
            if (step.newClient !== null) {
              if (step.newClient.runId !== prepared.runId || step.newClient.limit !== 16 || !/^run-[a-f0-9]{32}$/u.test(step.newClient.runId)) return false;
              const run = runs.find(run => run.runId === step.newClient!.runId);
              if (run?.clients.includes(clientId) || (run?.clients.length ?? 0) >= 16) return false;
              runs = [...runs.filter(run => run.runId !== step.newClient!.runId), { runId: step.newClient.runId, clients: [...(run?.clients ?? []), clientId] }];
            }
            nextEntry = { ...entry, anchor: step.anchor };
            nextState = { ...current, used: [...current.used, ...step.newIdentities], runs };
          } else if (step.kind === 'publish') {
            if (!(step.canonical instanceof Uint8Array) || !prepared.canonical.equals(Buffer.from(step.canonical))) return false;
            await write(`${home}/${clientId}.json`, step.canonical, before.canonical);
          } else if (step.kind === 'synchronize') {
            if (!equal(step.projection, prepared.head.record) || !projection(step.projection) || step.projection.clientId !== clientId || before.canonical === null || sha256(before.canonical) !== step.projection.sha256) return false;
            await write(`${base}/projection-${clientId}.json`, Buffer.from(canonical(step.projection)));
          } else if (step.kind === 'audit') {
            if (!head(step.head) || !equal(step.head, prepared.head) || !equal(step.head, auditHead(step.event)) || entry.anchor.kind !== 'pending'
              || entry.anchor.intentSha256 !== step.head.auditSha256 || !equal(before.projection, step.head.record)) return false;
            await write(`${base}/canonical-history.json`, prepared.archive, prepared.predecessor);
            nextState = { ...current, format: 'url-machine-store-state/2', archive: prepared.pointer };
            nextEntry = { ...entry, audit: [...entry.audit, step.event] };
          } else {
            if (!anchor(step.anchor, clientId) || step.anchor.kind !== 'committed' || !equal(step.anchor.head, before.audit) || !equal(step.anchor.head, prepared.head)) return false;
            nextEntry = { ...entry, anchor: step.anchor };
          }
          if (step.kind === 'reserve' || step.kind === 'audit' || step.kind === 'commit') {
            nextState = { ...nextState, clients: current.clients.map(client => client.clientId === clientId ? nextEntry : client) };
            if (!stateValid(nextState, rootId)) return false;
            const bytes = Buffer.from(canonical(nextState));
            await write(`${base}/state.json`, bytes);
            validatedState = { sha256: sha256(bytes), value: nextState };
          }
          checkWork(); phase++;
          return true;
        };
        const sampleCurrent = (): number | null => { try { return check(); } catch { return null; } };
        await operation(Object.freeze({ now: () => live(), current: () => sampleCurrent() !== null,
          sampleCurrent, read, preflightCanonical, advance }));
        if (phase !== 0 && phase !== 5) throw refused();
      }, { operationMilliseconds, ordinaryEffect: effectProfile !== undefined && !orderedEffect, staging: publication });
    };
    const adapter = Object.freeze<UrlMachineStore>({ identitySha256: expectedIdentitySha256, protection: 'role-namespace-exclusion-required; privileged-store-rollback-Unknown' as const,
      allocateClient, allocateClients, exclusive: (clientId, deadline, operation, effectProfile) => exclusive(clientId, deadline, operation, effectProfile),
      publish: (input: UrlMachineLifecyclePublication, stillOpening?: () => boolean) => publishUrlMachineLifecycle(input, {
        exclusive: (clientId, deadline, operation) => exclusive(clientId, deadline, operation, undefined, { current: stillOpening }),
      }),
      close: async () => {
        if (closed) return;
        closed = true;
        // An arbitrary controller callback can remain pending. Invalidate it
        // immediately, retaining descriptors until its actual work settles.
        const closeHandles = async () => { await heldHome.close(); await heldRoot.close(); };
        if (activeWork.size === 0) await closeHandles();
        else void Promise.allSettled([...activeWork]).then(closeHandles).catch(() => {});
      } });
    historyReaders.set(adapter, async (clientId, expected, deadline) => {
      let result: UrlMachineStoreHistory | null = null;
      if (!head(expected) || expected.record.clientId !== clientId) return null;
      // Copy before waiting on the lock; a caller cannot change the expected
      // predecessor while this operation is queued behind another adapter.
      const heldExpected = decode(Buffer.from(canonical(expected))) as Head;
      const completed = await exclusive(clientId, deadline, async lease => {
        const first = await lease.read();
        if (!lease.current() || first?.anchor.kind !== 'committed' || first.canonical === null
          || !equal(first.anchor.head, heldExpected)) return;
        const state = await readState(), entry = state.clients.find(value => value.clientId === clientId);
        if (!lease.current() || entry?.anchor.kind !== 'committed' || !equal(entry.anchor.head, heldExpected)) return;
        const last = await lease.read();
        if (!lease.current() || last?.anchor.kind !== 'committed' || last.canonical === null
          || !equal(last.anchor.head, heldExpected) || !Buffer.from(last.canonical).equals(Buffer.from(first.canonical))) return;
        const archive = await readArchive(state);
        const revisions = archive.value?.entries.filter(value => value.clientId === clientId).map(value => ({ revision: value.revision,
          canonical: Uint8Array.from(Buffer.from(encodeCanonicalJson(value.record, URL_MACHINE_CLIENT_LIMITS))) })) ?? [];
        if (!lease.current()) return;
        result = Object.freeze({ revisions, identitySha256: expectedIdentitySha256, observedAt: lease.now(), canonical: Uint8Array.from(last.canonical),
          head: deepFreeze(entry.anchor.head), events: deepFreeze(entry.audit) });
      });
      return completed ? result : null;
    });
    return adapter;
  } catch { await canonicalHome?.close().catch(() => {}); await root?.close().catch(() => {}); return null; }
}
