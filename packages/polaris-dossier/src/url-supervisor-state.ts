import * as fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { decodeUtf8 } from '@syzygy/support';
import { RUN_ID } from './state-directory.js';
import { URL_ROLES, URL_RUN_MODE, URL_SUPPORTED_MODEL, urlSourceTransportIdentity } from './url-run-record.js';
import type { SupervisorState } from './polaris.js';

export const URL_SUPERVISOR_STATE_LIMITS = Object.freeze({ maxBytes: 262_144, maxNodes: 32_768, maxDepth: 12,
  population: 1024, revision: 999_999 });
const REQUIRED = ['format', 'mode', 'declarationSha256', 'run', 'runId', 'tmuxSession', 'clone', 'url', 'model',
  'authorSkipPermissions', 'briefIssuedAt', 'deadlineSeconds', 'sessions', 'fidelityDeliveredFor', 'designDeliveredFor', 'notified', 'siteFor', 'launches'];
const OPTIONAL = ['fidelityDeliveredPairs', 'pendingRepair', 'finalSite', 'stopped', 'done', 'stopGeneration'];
const HEX = /^[a-f0-9]{64}$/u;
const STOP_GENERATION = /^[a-f0-9]{32}$/u;
const REVISION = /^(?:0|[1-9][0-9]{0,5})$/u;
const JSON_LIMITS = URL_SUPERVISOR_STATE_LIMITS;
function refuse(): never { throw new Error('url-supervisor-state-unavailable'); }
function fields(value: unknown, required: readonly string[], optional: readonly string[] = []): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || ![null, Object.prototype].includes(Object.getPrototypeOf(value))) return false;
  const keys = Reflect.ownKeys(value);
  return required.every(key => Object.hasOwn(value, key)) && keys.every(key => typeof key === 'string'
    && (required.includes(key) || optional.includes(key)) && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key)!, 'value'));
}
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0
  && Buffer.byteLength(value) <= 4096 && !/[\u0000-\u001f\u007f\u2028\u2029]/u.test(value);
const absolute = (value: unknown): value is string => text(value) && path.isAbsolute(value) && path.resolve(value) === value;
const digest = (value: unknown): value is string => typeof value === 'string' && value.length === 64 && HEX.test(value);
const revision = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value)
  && value >= 0 && value <= URL_SUPERVISOR_STATE_LIMITS.revision;
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
function list(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length <= URL_SUPERVISOR_STATE_LIMITS.population
    && Reflect.ownKeys(value).length === value.length + 1 && Array.from({ length: value.length }, (_, i) => i)
      .every(i => Object.hasOwn(Object.getOwnPropertyDescriptor(value, String(i)) ?? {}, 'value'));
}
function instant(value: unknown, beginning: number): boolean {
  if (typeof value !== 'string' || value.length !== 24 || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(value)) return false;
  const milliseconds = Date.parse(value);
  return Number.isSafeInteger(milliseconds) && milliseconds >= beginning && new Date(milliseconds).toISOString() === value;
}
function schema(value: unknown, root: string, runId: string): value is SupervisorState {
  if (!fields(value, REQUIRED, OPTIONAL) || value.format !== 'polaris-supervisor/2' || value.mode !== URL_RUN_MODE
    || !digest(value.declarationSha256) || value.runId !== runId || value.run !== path.join(root, runId)
    || (Object.hasOwn(value, 'stopGeneration') && (typeof value.stopGeneration !== 'string' || !STOP_GENERATION.test(value.stopGeneration)))
    || !text(value.tmuxSession) || !/^polaris-[a-z0-9]{1,64}$/u.test(value.tmuxSession)
    || !absolute(value.clone) || !text(value.url) || !urlSourceTransportIdentity(value.url).ok
    || value.model !== URL_SUPPORTED_MODEL || value.authorSkipPermissions !== false || !positive(value.briefIssuedAt)
    || !positive(value.deadlineSeconds) || !Number.isSafeInteger(value.deadlineSeconds * 1000)
    || !Number.isSafeInteger(value.briefIssuedAt + value.deadlineSeconds * 1000)
    || value.briefIssuedAt + value.deadlineSeconds * 1000 > 8_640_000_000_000_000) return false;
  const run = value.run as string;
  if (!list(value.sessions) || value.sessions.length !== 4 || !value.sessions.every((session, index) => {
    const role = URL_ROLES[index]!;
    const directory = role === 'author' ? run : `${run}.sessions/${role === 'inventory' ? 'session' : role}-1`;
    return fields(session, ['role', 'session', 'directory', 'prompt', 'promptSha256', 'allowedTools'])
      && session.role === role && session.session === 1 && session.directory === directory && session.prompt === ''
      && digest(session.promptSha256) && session.allowedTools === null;
  })) return false;
  if (!list(value.fidelityDeliveredFor) || !value.fidelityDeliveredFor.every(revision)
    || !list(value.designDeliveredFor) || !value.designDeliveredFor.every(revision)
    || !list(value.notified) || !value.notified.every(item => text(item) && /^(?:inventory-draft|fidelity|design)-(?:0|[1-9][0-9]{0,5})$/u.test(item))) return false;
  if (!fields(value.siteFor, [], Object.keys(value.siteFor as object)) || Object.keys(value.siteFor).length > URL_SUPERVISOR_STATE_LIMITS.population
    || !Object.entries(value.siteFor).every(([key, site]) => text(key) && REVISION.test(key) && (site === -1 || revision(site)))) return false;
  if (Object.hasOwn(value, 'fidelityDeliveredPairs') && (!list(value.fidelityDeliveredPairs)
    || !value.fidelityDeliveredPairs.every(item => text(item) && /^(?:0|[1-9][0-9]{0,5})\/(?:0|[1-9][0-9]{0,5})$/u.test(item)))) return false;
  if (Object.hasOwn(value, 'pendingRepair') && (!fields(value.pendingRepair, [], ['draftAbove', 'inventoryAbove'])
    || Object.keys(value.pendingRepair).length === 0 || !Object.values(value.pendingRepair).every(revision))) return false;
  if (!list(value.launches) || !value.launches.every(launch => fields(launch, ['role', 'pid', 'at', 'argvSha256', 'viewSha256'])
    && URL_ROLES.includes(launch.role as typeof URL_ROLES[number]) && (launch.pid === null || positive(launch.pid) && launch.pid <= 2_147_483_647)
    && instant(launch.at, value.briefIssuedAt as number) && digest(launch.argvSha256) && digest(launch.viewSha256))) return false;
  if (Object.hasOwn(value, 'finalSite')) {
    const final = value.finalSite;
    if (!fields(final, ['site', 'draftRevision', 'verdict', 'packetSha256', 'verdictEventSha256', 'populationSha256'])
      || !revision(final.site) || !revision(final.draftRevision) || !revision(final.verdict)
      || !digest(final.packetSha256) || !digest(final.verdictEventSha256) || !digest(final.populationSha256)
      || value.done === undefined || value.done !== value.stopped) return false;
    const reviewed = value.siteFor[String(final.draftRevision)];
    if (!revision(reviewed) || reviewed >= final.site) return false;
  }
  return ['stopped', 'done'].every(key => !Object.hasOwn(value, key) || instant(value[key], value.briefIssuedAt as number));
}

type Stat = fs.BigIntStats;
const sameFile = (a: Stat, b: Stat): boolean => a.dev === b.dev && a.ino === b.ino && a.mode === b.mode
  && a.uid === b.uid && a.gid === b.gid && a.size === b.size;
const sameShape = (a: Stat, b: Stat): boolean => sameFile(a, b) && a.nlink === b.nlink;
const same = (a: Stat, b: Stat): boolean => sameShape(a, b) && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
const ownedFile = (stat: Stat): boolean => stat.isFile() && stat.uid === BigInt(process.getuid!()) && stat.nlink === 1n
  && (stat.mode & 0o7777n) === 0o600n && stat.size > 0n && stat.size <= BigInt(JSON_LIMITS.maxBytes);
interface Root { readonly name: string; readonly fd: number; readonly stat: Stat; readonly slot: string; readonly runId: string }
function close(fd: number | undefined): boolean {
  try {
    if (fd !== undefined) fs.closeSync(fd);
    return true;
  } catch { return false; }
}
function removeIfOwned(file: string, created: Stat): void {
  try {
    const named = fs.lstatSync(file, { bigint: true });
    if (named.isFile() && named.dev === created.dev && named.ino === created.ino) fs.unlinkSync(file);
  } catch { /* Cleanup cannot prove retirement after an IO failure. */ }
}
function openRoot(stateRoot: string, runId: string): Root {
  if (!absolute(stateRoot) || !text(runId) || !RUN_ID.test(runId) || fs.realpathSync(stateRoot) !== stateRoot) refuse();
  const fd = fs.openSync(stateRoot, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const stat = fs.fstatSync(fd, { bigint: true });
    if (!stat.isDirectory() || stat.uid !== BigInt(process.getuid!()) || (stat.mode & 0o077n) !== 0n) refuse();
    const root = { name: stateRoot, fd, stat, slot: `/proc/self/fd/${fd}/${runId}.supervisor.json`, runId };
    rootCurrent(root); return root;
  } catch { close(fd); return refuse(); }
}
function rootCurrent(root: Root): void {
  const named = fs.lstatSync(root.name, { bigint: true }), actual = fs.fstatSync(root.fd, { bigint: true });
  if (fs.realpathSync(root.name) !== root.name || !named.isDirectory() || named.dev !== actual.dev || named.ino !== actual.ino
    || actual.dev !== root.stat.dev || actual.ino !== root.stat.ino || actual.mode !== root.stat.mode || actual.uid !== root.stat.uid) refuse();
}
function readBytes(fd: number, size: number): Buffer {
  const bytes = Buffer.alloc(size + 1);
  let offset = 0;
  while (offset < bytes.length) {
    const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
    if (count === 0) break;
    offset += count;
  }
  if (offset !== size) refuse();
  return bytes.subarray(0, size);
}
function readAt(root: Root): { readonly value: SupervisorState; readonly stat: Stat } | null {
  let fd: number;
  try { fd = fs.openSync(root.slot, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; return refuse(); }
  try {
    const before = fs.fstatSync(fd, { bigint: true }); if (!ownedFile(before)) refuse();
    const bytes = readBytes(fd, Number(before.size));
    if (!same(before, fs.fstatSync(fd, { bigint: true })) || !same(before, fs.lstatSync(root.slot, { bigint: true }))) refuse();
    rootCurrent(root);
    const text = decodeUtf8(bytes); if (text === undefined) refuse();
    const value: unknown = parseBoundedJson(text, JSON_LIMITS);
    if (!schema(value, root.name, root.runId)) refuse();
    return { value, stat: before };
  } finally { close(fd); }
}

/** Mutable Inferred host metadata only. No stored field proves current run authority,
 * actual launch, receipt, process identity or checked recovery. No bodies are stored. */
export function readUrlSupervisorState(stateRoot: string, runId: string): SupervisorState | null {
  let root: Root | undefined;
  try { root = openRoot(stateRoot, runId); return readAt(root)?.value ?? null; }
  catch { return null; }
  finally { close(root?.fd); }
}
const immutable = (state: SupervisorState): string => encodeCanonicalJson(Object.fromEntries(REQUIRED
  .filter(key => !['fidelityDeliveredFor', 'designDeliveredFor', 'notified', 'siteFor', 'launches'].includes(key))
  .map(key => [key, state[key as keyof SupervisorState]])), JSON_LIMITS);

/** Atomic rename in a private host directory, guarded by the prior named file identity.
 * This is not a kernel compare-and-swap or hostile same-UID isolation guarantee.
 * A failure after rename can leave the complete new record with uncertain durability;
 * the caller must not interpret the exception as proof that no update happened. */
export function writeUrlSupervisorState(stateRoot: string, state: SupervisorState): void {
  let root: Root | undefined, fd: number | undefined, temporary: string | undefined, created: Stat | undefined;
  try {
    if (!absolute(stateRoot) || !fields(state, REQUIRED, OPTIONAL) || !text(state.runId)
      || !RUN_ID.test(state.runId) || !schema(state, stateRoot, state.runId)) refuse();
    const encoded = encodeCanonicalJson(state, JSON_LIMITS), bytes = Buffer.from(`${encoded}\n`);
    if (bytes.length > JSON_LIMITS.maxBytes) refuse();
    root = openRoot(stateRoot, state.runId);
    const prior = readAt(root);
    if (prior && immutable(prior.value) !== immutable(state)) refuse();
    temporary = `/proc/self/fd/${root.fd}/.${state.runId}.supervisor-${randomBytes(16).toString('hex')}.tmp`;
    fd = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK, 0o600);
    created = fs.fstatSync(fd, { bigint: true });
    if (!created.isFile() || created.uid !== root.stat.uid || created.nlink !== 1n || (created.mode & 0o7777n) !== 0o600n || created.size !== 0n) refuse();
    let written = 0;
    while (written < bytes.length) { const count = fs.writeSync(fd, bytes, written, bytes.length - written); if (count < 1) refuse(); written += count; }
    fs.fsyncSync(fd);
    const complete = fs.fstatSync(fd, { bigint: true });
    if (!ownedFile(complete) || complete.size !== BigInt(bytes.length) || complete.dev !== created.dev || complete.ino !== created.ino
      || !same(complete, fs.lstatSync(temporary, { bigint: true }))) refuse();
    rootCurrent(root);
    let target: Stat | null;
    try { target = fs.lstatSync(root.slot, { bigint: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; target = null; }
    if (prior ? target === null || !same(prior.stat, target) : target !== null) refuse();
    fs.renameSync(temporary, root.slot); temporary = undefined;
    const named = fs.lstatSync(root.slot, { bigint: true });
    // rename changes ctime; inode, mode, ownership, link count and bytes stay bound.
    if (!ownedFile(named) || named.dev !== complete.dev || named.ino !== complete.ino || named.size !== complete.size || named.mtimeNs !== complete.mtimeNs) refuse();
    fs.fsyncSync(root.fd); rootCurrent(root);
  } catch { return refuse(); }
  finally {
    close(fd);
    if (temporary !== undefined && created !== undefined) removeIfOwned(temporary, created);
    close(root?.fd);
  }
}

const STOP_READY = 0x30, STOP_REQUESTED = 0x31;
const STOP_REQUEST = Buffer.from([STOP_REQUESTED]);
const STOP_ERROR = 'url-supervisor-stop-unavailable';
type StopStatus = 'ready' | 'requested';
interface StopBinding { readonly runId: string; readonly declaration: string; readonly generation: string }
export interface UrlSupervisorStop {
  readonly status: () => StopStatus;
  /** Retire this offer, then return its final request disposition. */
  readonly close: () => StopStatus;
}

function refuseStop(): never { throw new Error(STOP_ERROR); }
function stopBinding(stateRoot: string, expected: SupervisorState): StopBinding {
  if (!fields(expected, REQUIRED, OPTIONAL) || !text(expected.runId) || !schema(expected, stateRoot, expected.runId)
    || !digest(expected.declarationSha256) || typeof expected.stopGeneration !== 'string'
    || expected.stopped !== undefined || expected.done !== undefined) refuseStop();
  return { runId: expected.runId, declaration: expected.declarationSha256, generation: expected.stopGeneration };
}
function liveBinding(root: Root, binding: StopBinding): void {
  const persisted = readAt(root)?.value;
  if (!persisted || persisted.declarationSha256 !== binding.declaration || persisted.stopGeneration !== binding.generation
    || persisted.stopped !== undefined || persisted.done !== undefined) refuseStop();
}
const stopSlot = (root: Root): string => `/proc/self/fd/${root.fd}/${root.runId}.supervisor-stop`;
const stopPrefix = (binding: StopBinding): Buffer => Buffer.from(`polaris-supervisor-stop/1\n${binding.generation}\n${binding.declaration}\n`, 'ascii');
function stopStatus(root: Root, slot: string | null, fd: number, prefix: Buffer, original: Stat): StopStatus {
  const before = fs.fstatSync(fd, { bigint: true }), size = prefix.length + 1;
  if (!ownedFile(original) || !sameFile(original, before) || before.size !== BigInt(size)
    || before.nlink !== (slot === null ? 0n : 1n)) refuseStop();
  const bytes = readBytes(fd, size);
  // A concurrent request can update the last byte and timestamps. Identity,
  // mode, exact length and the immutable prefix must still agree.
  if (!sameShape(before, fs.fstatSync(fd, { bigint: true })) || (slot !== null && !sameShape(before, fs.lstatSync(slot, { bigint: true })))
    || !bytes.subarray(0, prefix.length).equals(prefix)) refuseStop();
  rootCurrent(root);
  if (bytes[prefix.length] === STOP_REQUESTED) return 'requested';
  if (bytes[prefix.length] !== STOP_READY) refuseStop();
  return 'ready';
}
function closeStopDescriptors(fd: number | undefined, root: Root | undefined): void {
  const descriptorClosed = close(fd);
  const directoryClosed = close(root?.fd);
  if (!descriptorClosed || !directoryClosed) refuseStop();
}

/** Publish the stop offer before starting owned work. The caller supplies a
 * fresh generation in its persisted state. This handle owns that offer only.
 * The private root and named-file checks do not isolate hostile same-UID code. */
export function openUrlSupervisorStop(stateRoot: string, expected: SupervisorState): UrlSupervisorStop {
  let root: Root | undefined, fd: number | undefined, created: Stat | undefined;
  let temporary: string | undefined, published: string | undefined;
  try {
    const binding = stopBinding(stateRoot, expected), prefix = stopPrefix(binding);
    root = openRoot(stateRoot, binding.runId);
    liveBinding(root, binding);
    const slot = stopSlot(root);
    temporary = `/proc/self/fd/${root.fd}/.${root.runId}.stop-${randomBytes(16).toString('hex')}.tmp`;
    fd = fs.openSync(temporary, fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK, 0o600);
    created = fs.fstatSync(fd, { bigint: true });
    if (!created.isFile() || created.uid !== root.stat.uid || created.nlink !== 1n || (created.mode & 0o7777n) !== 0o600n || created.size !== 0n) refuseStop();
    const bytes = Buffer.concat([prefix, Buffer.from([STOP_READY])]);
    if (fs.writeSync(fd, bytes, 0, bytes.length, 0) !== bytes.length) refuseStop();
    fs.fsyncSync(fd);
    const staged = fs.fstatSync(fd, { bigint: true });
    if (!ownedFile(staged) || staged.size !== BigInt(bytes.length) || staged.dev !== created.dev || staged.ino !== created.ino
      || !same(staged, fs.lstatSync(temporary, { bigint: true }))) refuseStop();
    rootCurrent(root);
    // A hard link publishes complete bytes without replacing an existing offer.
    // The reader refuses the short two-link interval before the temp name drops.
    fs.linkSync(temporary, slot);
    published = slot;
    const linked = fs.fstatSync(fd, { bigint: true });
    if (linked.nlink !== 2n || !same(linked, fs.lstatSync(temporary, { bigint: true }))) refuseStop();
    fs.unlinkSync(temporary);
    temporary = undefined;
    fs.fsyncSync(root.fd);
    const heldRoot = root, heldFd = fd;
    const original = fs.fstatSync(heldFd, { bigint: true });
    liveBinding(heldRoot, binding);
    let requested = stopStatus(heldRoot, slot, heldFd, prefix, original) === 'requested';
    const observe = (named: string | null): StopStatus => {
      const status = stopStatus(heldRoot, named, heldFd, prefix, original);
      if (requested && status === 'ready') refuseStop();
      requested = status === 'requested';
      return status;
    };
    let closed: 'open' | 'failed' | StopStatus = 'open';
    return Object.freeze({
      status(): StopStatus {
        try {
          if (closed !== 'open') refuseStop();
          liveBinding(heldRoot, binding);
          return observe(slot);
        } catch { return refuseStop(); }
      },
      close(): StopStatus {
        if (closed === 'ready' || closed === 'requested') return closed;
        if (closed === 'failed') refuseStop();
        closed = 'failed';
        let disposition: StopStatus;
        try {
          observe(slot);
          fs.unlinkSync(slot);
          fs.fsyncSync(heldRoot.fd);
          // A request that verified the named offer before unlink must be
          // visible here. A later writer cannot confirm the retired name.
          disposition = observe(null);
        } catch { return refuseStop(); }
        finally { closeStopDescriptors(heldFd, heldRoot); }
        closed = disposition;
        return disposition;
      },
    });
  } catch {
    if (created) {
      if (published !== undefined) removeIfOwned(published, created);
      if (temporary !== undefined) removeIfOwned(temporary, created);
    }
    closeStopDescriptors(fd, root);
    return refuseStop();
  }
}

/** Request this persisted generation to stop. Resolving proves a local request
 * only. The supervisor owns termination and its evidence. */
export function requestUrlSupervisorStop(stateRoot: string, expected: SupervisorState): void {
  let root: Root | undefined, fd: number | undefined;
  try {
    const binding = stopBinding(stateRoot, expected), prefix = stopPrefix(binding);
    root = openRoot(stateRoot, binding.runId);
    liveBinding(root, binding);
    const slot = stopSlot(root);
    fd = fs.openSync(slot, fs.constants.O_RDWR | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const original = fs.fstatSync(fd, { bigint: true });
    if (stopStatus(root, slot, fd, prefix, original) === 'ready') {
      // Only the pinned open descriptor can be modified. If the generation
      // retires between check and write, this cannot mark its replacement.
      if (fs.writeSync(fd, STOP_REQUEST, 0, 1, prefix.length) !== 1) refuseStop();
    }
    fs.fsyncSync(fd);
    liveBinding(root, binding);
    if (stopStatus(root, slot, fd, prefix, original) !== 'requested') refuseStop();
  } catch { return refuseStop(); }
  finally { closeStopDescriptors(fd, root); }
}
