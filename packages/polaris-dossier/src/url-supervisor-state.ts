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
const OPTIONAL = ['fidelityDeliveredPairs', 'pendingRepair', 'finalSite', 'stopped', 'done'];
const HEX = /^[a-f0-9]{64}$/u;
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
const same = (a: Stat, b: Stat): boolean => a.dev === b.dev && a.ino === b.ino && a.mode === b.mode && a.uid === b.uid
  && a.gid === b.gid && a.nlink === b.nlink && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
const ownedFile = (stat: Stat): boolean => stat.isFile() && stat.uid === BigInt(process.getuid!()) && stat.nlink === 1n
  && (stat.mode & 0o7777n) === 0o600n && stat.size > 0n && stat.size <= BigInt(JSON_LIMITS.maxBytes);
interface Root { readonly name: string; readonly fd: number; readonly stat: Stat; readonly slot: string; readonly runId: string }
function close(fd: number | undefined): void {
  if (fd !== undefined) { try { fs.closeSync(fd); } catch { /* fixed public failure vocabulary */ } }
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
function readAt(root: Root): { readonly value: SupervisorState; readonly stat: Stat } | null {
  let fd: number;
  try { fd = fs.openSync(root.slot, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; return refuse(); }
  try {
    const before = fs.fstatSync(fd, { bigint: true }); if (!ownedFile(before)) refuse();
    const bytes = Buffer.alloc(Number(before.size) + 1); let size = 0;
    while (size < bytes.length) { const count = fs.readSync(fd, bytes, size, bytes.length - size, null); if (count === 0) break; size += count; }
    if (size !== Number(before.size) || !same(before, fs.fstatSync(fd, { bigint: true }))
      || !same(before, fs.lstatSync(root.slot, { bigint: true }))) refuse();
    rootCurrent(root);
    const text = decodeUtf8(bytes.subarray(0, size)); if (text === undefined) refuse();
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
    if (temporary !== undefined && created !== undefined) {
      try {
        const named = fs.lstatSync(temporary, { bigint: true });
        if (named.isFile() && named.dev === created.dev && named.ino === created.ino) fs.unlinkSync(temporary);
      } catch { /* no raw path or body diagnostics; cleanup is not claimed after IO failure */ }
    }
    close(root?.fd);
  }
}
