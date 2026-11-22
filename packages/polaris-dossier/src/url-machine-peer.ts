import * as fs from 'node:fs';
import { open as openFile, realpath as realFilePath, lstat as namedFileStat } from 'node:fs/promises';
import { setImmediate as yieldToPoll } from 'node:timers/promises';
import { Socket, Server } from 'node:net';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { captureKernelUnixPeerAsync, executeKernelPeerProgramAsync, type KernelPeerProgram } from './session-peer.js';
import { isUrlSessionProcess, restrictedSessionCliArgs, type UrlSessionProcess } from './session-launch.js';
import { isNativeSessionProfile, URL_CLI_PROGRAM, type NativeSessionProfile } from './session-profile.js';
import { urlSessionCommand } from './session-url-view.js';
import { readUrlMachineClient, type UrlMachineClientContext, type UrlMachineOperation, type UrlMachineVerifier } from './url-machine-instance.js';
import type { UrlMachineStore } from './url-machine-store.js';

export const URL_MACHINE_PEER_LIMITS = Object.freeze({ ancestors: 64, chunks: 4096, bytes: 8_388_608,
  chunkBytes: 65_536, procBytes: 2_097_152, programBytes: 262_144, setupMilliseconds: 5000 });
const META = { maxBytes: 65_536, maxNodes: 4096, maxDepth: 16 };
const canonical = (value: unknown): string => encodeCanonicalJson(value, META);
const equal = (left: unknown, right: unknown): boolean => canonical(left) === canonical(right);
const digest = (value: string): boolean => /^[a-f0-9]{64}$/u.test(value);
const refused = (): Error => new Error('url-machine-peer-unavailable');
const NAMESPACES = ['mnt', 'pid', 'net', 'user'] as const;

export interface UrlMachinePeerAudit {
  readonly event: 'machine-peer-effect';
  readonly clientId: string; readonly instanceId: string; readonly revision: number;
  readonly runId: string; readonly role: UrlMachineClientContext['role']; readonly operation: UrlMachineOperation;
  readonly processIdentitySha256: string; readonly channelIdentitySha256: string; readonly at: number;
}
export interface UrlMachinePeerOptions {
  /** Exclusively owned accepted Socket from createServer({ pauseOnConnect:true }).
   * Do not add data/readable handlers or let Node consume bytes on this socket. */
  readonly socket: Socket;
  readonly listener: UrlMachineListener;
  readonly launch: UrlSessionProcess;
  readonly profile: NativeSessionProfile;
  readonly context: UrlMachineClientContext;
  readonly store: UrlMachineStore;
  readonly binding: { readonly parentBindingSha256: string; readonly controllerSha256: string };
  readonly programs: { readonly peer: KernelPeerProgram; readonly reader: KernelPeerProgram };
  /** Independently selected host files, already pinned by the launch/profile.
   * Script is null for the role CLI, otherwise its exact installed support file. */
  readonly installed: { readonly executable: string; readonly sha256: string; readonly script: string | null; readonly scriptSha256: string | null };
  readonly protectedPaths: readonly string[];
  readonly now: () => number;
  /** Current adopted parents, fixed policy/profile/controller, run and view. */
  readonly current: () => boolean | Promise<boolean>;
  /** Synchronous supervisor health/budget authority at every actual effect. */
  readonly effectCurrent?: () => boolean;
  /** Local stop, budget and health during a private read of the installed image.
   * Full effect authority still brackets the read and gates peer issuance. */
  readonly readImageCurrent?: () => boolean;
  readonly audit: (event: UrlMachinePeerAudit) => void | Promise<void>;
  /** Trusted monotonic capacity reservation; throwing refuses before exec.
   * Each helper reserves its CPU hard limit plus accounting granularity. */
  readonly chargeNativeCpuMicroseconds?: (capacity: number) => void;
}
/** Local object capability. Copied metadata cannot create a registered peer. */
export interface UrlMachinePeer { readonly verifier: UrlMachineVerifier }
export interface UrlMachineListener { readonly transport: 'kernel-sender-stream/1' }
export type UrlMachinePeerChunk = { readonly kind: 'data'; readonly bytes: Buffer } | { readonly kind: 'pending' | 'end' };
interface ProcessSample { readonly pid: number; readonly parent: number; readonly start: string; readonly state: string }
interface HeldProcess { readonly fd: number; readonly identity: string; readonly sample: ProcessSample }
interface NativeIdentity { readonly pid: number; readonly uid: number; readonly gid: number; readonly lifetime: string; readonly channel: string }
interface PeerState {
  readonly options: UrlMachinePeerOptions; readonly native: NativeIdentity; readonly processes: readonly HeldProcess[];
  readonly socketHandle: unknown; readonly socketDescriptor: number;
  readonly namespaces: Readonly<Record<typeof NAMESPACES[number], string>>; readonly mountSha256: string;
  readonly executable: fs.BigIntStats; readonly script: fs.BigIntStats | null; readonly command: Buffer;
  closed: boolean; finished: boolean; reading: boolean; mediating: boolean; chunks: number; bytes: number; lastNow: number;
}
const issued = new WeakMap<UrlMachinePeer, PeerState>();
const claimed = new WeakSet<Socket>();
const listeners = new WeakMap<UrlMachineListener, { readonly server: Server; readonly identity: string; readonly programSha256: string }>();
const sameFile = (left: fs.BigIntStats, right: fs.BigIntStats): boolean =>
  ['dev', 'ino', 'mode', 'nlink', 'size', 'mtimeNs', 'ctimeNs'].every(key => left[key as keyof fs.BigIntStats] === right[key as keyof fs.BigIntStats]);
function safePath(file: string): boolean {
  return path.isAbsolute(file) && path.normalize(file) === file && file.length <= 4096 && !/[\0-\x1f\x7f]/u.test(file);
}
function bytesAt(file: string, maximum: number): Buffer {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const bytes = Buffer.alloc(maximum + 1); let length = 0;
    while (length < bytes.length) {
      const count = fs.readSync(fd, bytes, length, bytes.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (length > maximum) throw refused();
    return bytes.subarray(0, length);
  } finally { fs.closeSync(fd); }
}
function pinnedFile(file: string, expected: string, maximum: number): fs.BigIntStats {
  if (!safePath(file) || fs.realpathSync(file) !== file || !digest(expected)) throw refused();
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size < 1n || before.size > BigInt(maximum) || (before.mode & 0o022n) !== 0n) throw refused();
    const bytes = Buffer.alloc(Number(before.size) + 1); let length = 0;
    while (length < bytes.length) {
      const count = fs.readSync(fd, bytes, length, bytes.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (length !== Number(before.size) || sha256(bytes.subarray(0, length)) !== expected
      || !sameFile(before, fs.fstatSync(fd, { bigint: true })) || !sameFile(before, fs.lstatSync(file, { bigint: true }))) throw refused();
    return before;
  } finally { fs.closeSync(fd); }
}
/** A large installed Node image must not block the supervisor's 200ms sampler.
 * Hold one image, hash at most 1MiB per poll turn, then compare held and named
 * identities. An expiry or pathname replacement discards the entire capture. */
async function pinnedExecutable(file: string, expected: string, maximum: number, check: () => void): Promise<fs.BigIntStats> {
  check();
  if (!safePath(file) || !digest(expected) || await realFilePath(file) !== file) throw refused();
  const handle = await openFile(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    check();
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size < 1n || before.size > BigInt(maximum) || (before.mode & 0o022n) !== 0n) throw refused();
    const chunk = Buffer.alloc(1_048_576), hash = createHash('sha256');
    let length = 0;
    while (length <= Number(before.size)) {
      check();
      const part = await handle.read(chunk, 0, Math.min(chunk.length, Number(before.size) + 1 - length), null);
      check();
      if (part.bytesRead === 0) break;
      hash.update(chunk.subarray(0, part.bytesRead)); length += part.bytesRead;
      await yieldToPoll();
    }
    if (length !== Number(before.size) || hash.digest('hex') !== expected
      || !sameFile(before, await handle.stat({ bigint: true })) || !sameFile(before, await namedFileStat(file, { bigint: true }))
      || await realFilePath(file) !== file) throw refused();
    check(); return before;
  } finally { await handle.close(); }
}
function sample(fd: number): ProcessSample {
  const text = bytesAt(`/proc/self/fd/${fd}/stat`, 8192).toString('ascii');
  const ending = text.lastIndexOf(') '), initial = /^([1-9][0-9]*) \(/u.exec(text);
  const values = ending < 0 ? [] : text.slice(ending + 2).trim().split(' ');
  if (!initial || values.length < 20 || !/^[RSIDTt]$/u.test(values[0]!) || !/^[0-9]+$/u.test(values[1]!) || !/^[0-9]{1,20}$/u.test(values[19]!)) throw refused();
  return { pid: Number(initial[1]), state: values[0]!, parent: Number(values[1]), start: values[19]! };
}
function hold(pid: number): HeldProcess {
  const fd = fs.openSync(`/proc/${pid}`, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(fd, { bigint: true }), observed = sample(fd);
    if (observed.pid !== pid) throw refused();
    return { fd, identity: `${stat.dev}:${stat.ino}`, sample: observed };
  } catch (error) { fs.closeSync(fd); throw error; }
}
function names(fd: number): Record<typeof NAMESPACES[number], string> {
  const value = {} as Record<typeof NAMESPACES[number], string>;
  for (const name of NAMESPACES) {
    const identity = fs.readlinkSync(`/proc/self/fd/${fd}/ns/${name}`);
    if (!new RegExp(`^${name}:\\[[0-9]+\\]$`, 'u').test(identity)) throw refused();
    value[name] = identity;
  }
  return value;
}
function runNative(program: KernelPeerProgram, descriptor: number, mode: 'listener' | 'prepare' | 'read',
  chargeNativeCpuMicroseconds?: (capacity: number) => void) {
  const identity = pinnedFile(program.executable, program.sha256, URL_MACHINE_PEER_LIMITS.programBytes);
  if ((identity.mode & 0o111n) === 0n || identity.uid !== BigInt(process.getuid!())) throw refused();
  const image = fs.openSync(program.executable, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    if (!sameFile(identity, fs.fstatSync(image, { bigint: true }))) throw refused();
    // This reserves capacity, not sampled child CPU. RLIMIT_CPU applies across
    // prlimit's exec into the held image; the extra second covers granularity.
    chargeNativeCpuMicroseconds?.(2_000_000);
    const result = spawnSync('/usr/bin/prlimit', ['--cpu=1:1', '--', '/proc/self/fd/4', mode], { stdio: ['ignore', 'pipe', 'pipe', descriptor, image],
      env: { LANG: 'C' }, timeout: 1000, killSignal: 'SIGKILL', maxBuffer: URL_MACHINE_PEER_LIMITS.chunkBytes + 512 });
    if (result.error || result.signal !== null || result.stderr.length !== 0
      || !sameFile(identity, fs.fstatSync(image, { bigint: true })) || !sameFile(identity, fs.lstatSync(program.executable, { bigint: true }))) throw refused();
    return result;
  } finally { fs.closeSync(image); }
}
function serverIdentity(server: Server): string {
  const descriptor = (server as Server & { readonly _handle?: { readonly fd?: unknown } })._handle?.fd;
  if (!server.listening || typeof server.address() !== 'string' || typeof descriptor !== 'number' || !Number.isSafeInteger(descriptor) || descriptor < 0) throw refused();
  const stat = fs.fstatSync(descriptor, { bigint: true });
  if (!stat.isSocket()) throw refused();
  return `${stat.dev}:${stat.ino}`;
}
/** Configure the real listener before launching any writer. Accepted sockets
 * inherit sender metadata even when the client writes immediately on connect. */
export function prepareUrlMachineListener(server: Server, program: KernelPeerProgram,
  chargeNativeCpuMicroseconds?: (capacity: number) => void): UrlMachineListener | null {
  try {
    if (!(server instanceof Server)) return null;
    const identity = serverIdentity(server);
    const descriptor = (server as Server & { readonly _handle: { readonly fd: number } })._handle.fd;
    const result = runNative(program, descriptor, 'listener', chargeNativeCpuMicroseconds);
    return registerListener(server, program, identity, result.status, result.stdout);
  } catch { return null; }
}
/** Production listener setup remains asynchronous even when another role's CLI
 * is already live. Await this before launching this endpoint's first writer. */
export async function prepareUrlMachineListenerAsync(server: Server, program: KernelPeerProgram,
  chargeNativeCpuMicroseconds?: (capacity: number) => void): Promise<UrlMachineListener | null> {
  try {
    if (!(server instanceof Server)) return null;
    const identity = serverIdentity(server);
    const descriptor = (server as Server & { readonly _handle: { readonly fd: number } })._handle.fd;
    const result = await executeKernelPeerProgramAsync(descriptor, program, 'listener', chargeNativeCpuMicroseconds);
    return result === null ? null : registerListener(server, program, identity, result.status, result.stdout);
  } catch { return null; }
}
function registerListener(server: Server, program: KernelPeerProgram, identity: string, status: number | null,
  output: Buffer): UrlMachineListener | null {
  const fields = /^L ([0-9]{1,20}) ([0-9]{1,20})\n$/u.exec(output.toString('ascii'));
  if (status !== 0 || !fields || `${fields[1]}:${fields[2]}` !== identity || serverIdentity(server) !== identity) return null;
  const capability: UrlMachineListener = Object.freeze({ transport: 'kernel-sender-stream/1' });
  listeners.set(capability, { server, identity, programSha256: program.sha256 });
  return capability;
}

function listenerCurrent(options: UrlMachinePeerOptions): boolean {
  const selected = listeners.get(options.listener);
  return selected !== undefined && selected.programSha256 === options.programs.reader.sha256
    && (options.socket as Socket & { readonly server?: Server }).server === selected.server
    && serverIdentity(selected.server) === selected.identity;
}
async function native(socket: Socket, program: KernelPeerProgram, mode: 'prepare' | 'read',
  chargeNativeCpuMicroseconds?: (capacity: number) => void): Promise<{ readonly identity: NativeIdentity | null; readonly chunk: UrlMachinePeerChunk | null }> {
  const handle = (socket as Socket & { readonly _handle?: { readonly fd?: unknown } })._handle;
  const descriptor = handle?.fd;
  if (socket.destroyed || !socket.isPaused() || socket.readableLength !== 0 || socket.listenerCount('data') !== 0
    || socket.listenerCount('readable') !== 0 || typeof descriptor !== 'number' || !Number.isSafeInteger(descriptor) || descriptor < 0) throw refused();
  const result = await executeKernelPeerProgramAsync(descriptor, program, mode, chargeNativeCpuMicroseconds);
  if (!result || socket.destroyed || !socket.isPaused() || socket.readableLength !== 0 || handle?.fd !== descriptor
    || (socket as Socket & { readonly _handle?: unknown })._handle !== handle) throw refused();
  if (mode === 'read' && result.status === 75 && result.stdout.length === 0) return { identity: null, chunk: { kind: 'pending' } };
  if (result.status !== 0) throw refused();
  if (mode === 'read' && result.stdout.equals(Buffer.from('E\n'))) return { identity: null, chunk: { kind: 'end' } };
  const end = result.stdout.indexOf(10);
  if (end < 0 || end > 256) throw refused();
  const parsed = /^(P|D) ([1-9][0-9]{0,9}) ([0-9]{1,10}) ([0-9]{1,10}) ([0-9]{1,20}) ([0-9]{1,20}) ([0-9]{1,20}) ([0-9]{1,20})(?: ([1-9][0-9]{0,4}))?$/u.exec(result.stdout.subarray(0, end).toString('ascii'));
  if (!parsed || parsed[1] !== (mode === 'prepare' ? 'P' : 'D')) throw refused();
  const [pid, uid, gid] = parsed.slice(2, 5).map(Number);
  if (!pid || pid > 2_147_483_647 || uid! > 4_294_967_294 || gid! > 4_294_967_294) throw refused();
  const observed: NativeIdentity = { pid, uid: uid!, gid: gid!, lifetime: `${parsed[5]}:${parsed[6]}`, channel: `${parsed[7]}:${parsed[8]}` };
  const body = result.stdout.subarray(end + 1), length = mode === 'prepare' ? 0 : Number(parsed[9]);
  if (body.length !== length || length > URL_MACHINE_PEER_LIMITS.chunkBytes || (mode === 'prepare' && parsed[9] !== undefined)) throw refused();
  return { identity: observed, chunk: mode === 'read' ? { kind: 'data', bytes: Buffer.from(body) } : null };
}
function closeState(state: PeerState): void {
  if (state.closed) return;
  state.closed = true;
  for (const entry of state.processes) try { fs.closeSync(entry.fd); } catch { /* Refused from now on. */ }
}
function check(state: PeerState): number {
  const { options } = state, now = options.now();
  if (state.closed || state.finished || (options.effectCurrent !== undefined && options.effectCurrent() !== true)
    || !isUrlSessionProcess(options.launch) || !isNativeSessionProfile(options.profile)
    || !Number.isSafeInteger(now) || now < state.lastNow || now >= options.context.deadline
    || !listenerCurrent(options) || options.socket.destroyed || !options.socket.isPaused() || options.socket.readableLength !== 0) throw refused();
  state.lastNow = now;
  const handle = (options.socket as Socket & { readonly _handle?: { readonly fd?: unknown } })._handle;
  if (handle !== state.socketHandle || handle?.fd !== state.socketDescriptor) throw refused();
  const channel = fs.fstatSync(state.socketDescriptor, { bigint: true });
  // RFC5-7(d)/REQ048: an established socket's peer credentials are immutable.
  // Re-read its actual kernel channel identity at every synchronous boundary;
  // retain the attested process/proc lifetime below. Each native read separately
  // verifies SCM_CREDENTIALS and SCM_PIDFD against the original connector.
  if (!channel.isSocket() || `${channel.dev}:${channel.ino}` !== state.native.channel) throw refused();
  for (const held of state.processes) {
    const actual = sample(held.fd);
    if (actual.pid !== held.sample.pid || actual.parent !== held.sample.parent || actual.start !== held.sample.start) throw refused();
  }
  const peer = state.processes[0]!, base = `/proc/self/fd/${peer.fd}`;
  const reader = pinnedFile(options.programs.reader.executable, options.programs.reader.sha256, URL_MACHINE_PEER_LIMITS.programBytes);
  if ((reader.mode & 0o111n) === 0n || reader.uid !== BigInt(process.getuid!())
    || !sameFile(state.executable, fs.lstatSync(options.installed.executable, { bigint: true }))) throw refused();
  if (state.script !== null && !sameFile(state.script, fs.lstatSync(options.installed.script!, { bigint: true }))) throw refused();
  if (!equal(names(peer.fd), state.namespaces) || sha256(bytesAt(`${base}/mountinfo`, URL_MACHINE_PEER_LIMITS.procBytes)) !== state.mountSha256
    || !bytesAt(`${base}/cmdline`, URL_MACHINE_PEER_LIMITS.procBytes).equals(state.command)
    || !sameFile(state.executable, fs.statSync(`${base}/exe`, { bigint: true }))) throw refused();
  if (state.script !== null && !sameFile(state.script, fs.statSync(`${base}/root/tool/support/${path.basename(options.installed.script!)}`, { bigint: true }))) throw refused();
  return now;
}
async function parentCurrent(options: UrlMachinePeerOptions): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (options.effectCurrent !== undefined && options.effectCurrent() !== true) return false;
    const valid = await Promise.race([Promise.resolve().then(options.current), new Promise<false>(resolve => {
      timer = setTimeout(() => resolve(false), Math.max(1, Math.min(URL_MACHINE_PEER_LIMITS.setupMilliseconds, options.context.deadline - options.now())));
    })]);
    return valid === true && (options.effectCurrent === undefined || options.effectCurrent() === true);
  } finally { clearTimeout(timer); }
}
async function current(state: PeerState, drainSample = false): Promise<number> {
  await yieldToPoll();
  check(state);
  await yieldToPoll();
  // The parent may drain the genuine launcher's in-flight resource sample.
  // Preserve current parent and sampled process authority before launching
  // the asynchronous helper; the event loop remains available during exec.
  if (await parentCurrent(state.options) !== true) throw refused();
  check(state);
  const { options } = state;
  const peerNow = await captureKernelUnixPeerAsync(options.socket, options.programs.peer, options.chargeNativeCpuMicroseconds);
  if (!peerNow || peerNow.pid !== state.native.pid || peerNow.uid !== state.native.uid || peerNow.gid !== state.native.gid) throw refused();
  await yieldToPoll();
  if (drainSample && !(await options.launch.waitForSample())) throw refused();
  return check(state);
}

/** Capture attests actual current kernel/proc facts, not arbitrary role hashes.
 * The supported trusted launcher selects the immutable installed image/view;
 * /proc argv alone does not attest historical JavaScript execution. Namespace
 * proof covers the four observed namespaces and named protected paths. Host
 * ptrace/mount tampering and privileged rollback are outside that evidence. */
export async function captureUrlMachinePeer(options: UrlMachinePeerOptions): Promise<UrlMachinePeer | null> {
  const held: HeldProcess[] = []; let state: PeerState | undefined;
  const began = performance.now();
  try {
    if ((options.effectCurrent !== undefined && options.effectCurrent() !== true)
      || !(options.socket instanceof Socket) || claimed.has(options.socket) || !listenerCurrent(options) || !isUrlSessionProcess(options.launch)
      || !isNativeSessionProfile(options.profile) || options.profile.digest !== options.context.profileSha256
      || options.profile.input.binding.run !== options.context.runId || options.profile.input.binding.role !== options.context.role
      || !digest(options.binding.parentBindingSha256) || !digest(options.binding.controllerSha256)
      || !Array.isArray(options.protectedPaths) || options.protectedPaths.length < 1 || options.protectedPaths.length > 64
      || options.protectedPaths.some(file => !safePath(file))) return null;
    claimed.add(options.socket);
    if (await parentCurrent(options) !== true) return null;
    const context = Object.freeze({ ...options.context, allowedScopes: Object.freeze([...options.context.allowedScopes]) });
    const selected = Object.freeze({ ...options, context, installed: Object.freeze({ ...options.installed }),
      binding: Object.freeze({ ...options.binding }), programs: Object.freeze({ peer: Object.freeze({ ...options.programs.peer }), reader: Object.freeze({ ...options.programs.reader }) }),
      protectedPaths: Object.freeze([...options.protectedPaths]) });
    const kernel = await captureKernelUnixPeerAsync(options.socket, selected.programs.peer, selected.chargeNativeCpuMicroseconds);
    if (await parentCurrent(selected) !== true) throw refused();
    const prepared = await native(options.socket, selected.programs.reader, 'prepare', selected.chargeNativeCpuMicroseconds);
    if (!kernel || !prepared.identity || kernel.pid !== prepared.identity.pid || kernel.uid !== prepared.identity.uid || kernel.gid !== prepared.identity.gid) throw refused();
    const observed = prepared.identity;
    const socketHandle = (options.socket as Socket & { readonly _handle?: { readonly fd?: unknown } })._handle;
    const socketDescriptor = socketHandle?.fd;
    if (typeof socketDescriptor !== 'number' || !Number.isSafeInteger(socketDescriptor) || socketDescriptor < 0) throw refused();
    if (observed.uid !== process.getuid!() || observed.gid !== process.getgid!() || observed.pid === selected.launch.pid) throw refused();
    for (let pid = observed.pid; ;) {
      if (held.length >= URL_MACHINE_PEER_LIMITS.ancestors || held.some(entry => entry.sample.pid === pid)) throw refused();
      const entry = hold(pid); held.push(entry);
      if (pid === selected.launch.pid) break;
      if (entry.sample.parent < 1) throw refused();
      pid = entry.sample.parent;
    }
    const peer = held[0]!, base = `/proc/self/fd/${peer.fd}`, namespaces = names(peer.fd);
    for (const name of NAMESPACES) if (namespaces[name] === fs.readlinkSync(`/proc/self/ns/${name}`)) throw refused();
    for (const file of selected.protectedPaths) {
      try { fs.lstatSync(`${base}/root${file}`); throw refused(); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    if (selected.effectCurrent !== undefined && selected.effectCurrent() !== true) throw refused();
    let pinNow = context.now;
    const readImageCurrent = selected.readImageCurrent ?? selected.effectCurrent;
    const executable = await pinnedExecutable(selected.installed.executable, selected.installed.sha256,
      context.kind === 'role-cli' ? URL_CLI_PROGRAM.bytes : 134_217_728, () => {
        const now = selected.now();
        if ((readImageCurrent !== undefined && readImageCurrent() !== true)
          || !isUrlSessionProcess(selected.launch) || !Number.isSafeInteger(now) || now < pinNow || now >= context.deadline
          || performance.now() - began >= URL_MACHINE_PEER_LIMITS.setupMilliseconds) throw refused();
        pinNow = now;
      });
    if (selected.effectCurrent !== undefined && selected.effectCurrent() !== true) throw refused();
    let expectedCommand: readonly string[], script: fs.BigIntStats | null = null;
    if (context.kind === 'role-cli') {
      if (selected.installed.sha256 !== URL_CLI_PROGRAM.sha256 || selected.installed.script !== null || selected.installed.scriptSha256 !== null) throw refused();
      expectedCommand = ['/tool/claude', ...restrictedSessionCliArgs(selected.profile)];
    } else {
      const name = context.kind === 'mcp-shim' ? 'session-mcp.js' : context.kind === 'inference-bridge' ? 'session-bridge.js' : null;
      if (!name || selected.installed.script === null || selected.installed.scriptSha256 === null || path.basename(selected.installed.script) !== name) throw refused();
      script = pinnedFile(selected.installed.script, selected.installed.scriptSha256, 2_097_152);
      expectedCommand = context.kind === 'mcp-shim' ? ['/tool/node', '/tool/support/session-mcp.js'] : urlSessionCommand(restrictedSessionCliArgs(selected.profile));
    }
    const command = Buffer.from(expectedCommand.join('\0') + '\0');
    const mountBytes = bytesAt(`${base}/mountinfo`, URL_MACHINE_PEER_LIMITS.procBytes), mounts = mountBytes.toString('utf8').split('\n');
    if (script !== null && !mounts.some(line => { const fields = line.split(' '); return fields[4] === '/tool/support' && fields[5]?.split(',').includes('ro'); })) throw refused();
    state = { options: selected, native: observed, processes: held, socketHandle, socketDescriptor, namespaces, mountSha256: sha256(mountBytes), executable, script, command,
      closed: false, finished: false, reading: false, mediating: false, chunks: 0, bytes: 0, lastNow: pinNow };
    void selected.launch.finished.then(() => { if (state) state.finished = true; }, () => { if (state) state.finished = true; });
    await current(state);
    if (performance.now() - began >= URL_MACHINE_PEER_LIMITS.setupMilliseconds) throw refused();
    const processIdentitySha256 = sha256(canonical({ lifetime: observed.lifetime, pid: observed.pid, uid: observed.uid, gid: observed.gid,
      ancestry: held.map(entry => ({ identity: entry.identity, pid: entry.sample.pid, start: entry.sample.start, parent: entry.sample.parent })),
      namespaces, mountSha256: state.mountSha256, commandSha256: sha256(command), executableSha256: selected.installed.sha256,
      scriptSha256: selected.installed.scriptSha256, runId: context.runId, role: context.role, kind: context.kind, profileSha256: context.profileSha256 }));
    const verifier: UrlMachineVerifier = Object.freeze({ mechanism: 'rfc5-7d', profileSha256: context.profileSha256, processIdentitySha256,
      channelIdentitySha256: sha256(canonical({ channel: observed.channel, lifetime: observed.lifetime, processIdentitySha256, nonce: randomBytes(32).toString('hex') })) });
    const capability: UrlMachinePeer = Object.freeze({ verifier });
    issued.set(capability, state); claimed.add(options.socket);
    return capability;
  } catch {
    if (state) closeState(state); else for (const entry of held) fs.closeSync(entry.fd);
    return null;
  }
}

export async function readUrlMachinePeer(peer: UrlMachinePeer): Promise<UrlMachinePeerChunk | null> {
  const state = issued.get(peer);
  if (!state || state.reading) return null;
  state.reading = true;
  try {
    await current(state);
    if (++state.chunks > URL_MACHINE_PEER_LIMITS.chunks) throw refused();
    // current() yields after its fresh peer capture. Drain a sample that may
    // have started in that poll turn before the separate asynchronous read.
    if (await parentCurrent(state.options) !== true) throw refused();
    check(state);
    const result = await native(state.options.socket, state.options.programs.reader, 'read', state.options.chargeNativeCpuMicroseconds);
    if (result.identity !== null && !equal(result.identity, state.native)) throw refused();
    if (result.chunk?.kind === 'data' && (state.bytes += result.chunk.bytes.length) > URL_MACHINE_PEER_LIMITS.bytes) throw refused();
    await current(state);
    return result.chunk;
  } catch { closeState(state); return null; }
  finally { state.reading = false; }
}

/** Call separately before each delivery, tool effect, reply registration or
 * forward. The callback is trusted host code; after awaits it must use the
 * supplied boundary guard immediately before its actual effect. No timeout
 * promises cancellation or retroactive undo of an already attempted effect. */
export async function mediateUrlMachinePeer<T>(peer: UrlMachinePeer, operation: UrlMachineOperation,
  effect: (current: () => boolean) => T | Promise<T>): Promise<{ readonly ok: true; readonly value: T } | { readonly ok: false }> {
  const state = issued.get(peer);
  if (!state || state.mediating) return { ok: false };
  state.mediating = true; let result: { readonly ok: true; readonly value: T } | undefined;
  try {
    await current(state);
    const { options } = state, context = options.context;
    if (!context.allowedScopes.includes(operation)) return { ok: false };
    const completed = await options.store.exclusive(context.clientId, context.deadline, async lease => {
      try {
      const now = await current(state), snapshot = await lease.read();
      if (!snapshot || !snapshot.canonical || snapshot.anchor.kind !== 'committed' || !lease.current()
        || !equal(snapshot.anchor.head.binding, options.binding) || !equal(snapshot.anchor.head, snapshot.audit)
        || !equal(snapshot.projection, snapshot.anchor.head.record) || sha256(snapshot.canonical) !== snapshot.anchor.head.record.sha256) throw refused();
      const decoded = readUrlMachineClient(snapshot.canonical, { ...context, now });
      if (!decoded.ok) throw refused();
      const record = decoded.record, active = record.instances.at(-1)!;
      if (!equal(active.verifier, peer.verifier) || record.revokedAt !== null || active.retiredAt !== null || active.revokedAt !== null
        || !record.scopes.includes(operation) || now < Date.parse(record.issuedAt) || now >= Date.parse(record.expiresAt)
        || now < Date.parse(active.issuedAt) || now >= Date.parse(active.expiresAt)) throw refused();
      await options.audit({ event: 'machine-peer-effect', clientId: record.clientId, instanceId: active.instanceId, revision: record.revision,
        runId: record.runId, role: record.role, operation, processIdentitySha256: peer.verifier.processIdentitySha256,
        channelIdentitySha256: peer.verifier.channelIdentitySha256, at: now });
      // Native reattestation can start a fresh inspection. Settle that sample
      // before the synchronous effect guards, within the same held lease.
      await current(state, true);
      const effectiveUntil = Math.min(context.deadline, Date.parse(record.expiresAt), Date.parse(active.expiresAt));
      const boundary = (): boolean => {
        try {
          if (check(state) >= effectiveUntil) return false;
          const now = lease.sampleCurrent === undefined ? lease.current() ? lease.now() : null : lease.sampleCurrent();
          return now !== null && now < effectiveUntil;
        } catch { return false; }
      };
      if (!boundary()) throw refused();
      const value = await effect(boundary);
      if (!boundary()) throw refused();
      result = { ok: true, value };
      } catch { result = undefined; }
    }, options.profile);
    return completed && result ? result : { ok: false };
  } catch { closeState(state); return { ok: false }; }
  finally { state.mediating = false; }
}
export function closeUrlMachinePeer(peer: UrlMachinePeer): void {
  const state = issued.get(peer);
  if (state) closeState(state);
}

/** Association only; effects still require current scoped mediation. */
export function isUrlMachinePeerFor(peer: UrlMachinePeer, socket: Socket): boolean {
  const state = issued.get(peer);
  return state !== undefined && !state.closed && !state.finished && state.options.socket === socket && !socket.destroyed;
}
