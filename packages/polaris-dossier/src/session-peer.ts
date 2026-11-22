import * as fs from 'node:fs';
import { Socket } from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { sha256 } from '@syzygy/support';

export interface KernelPeerProgram {
  readonly executable: string;
  readonly sha256: string;
}
export interface KernelUnixPeer {
  readonly pid: number;
  readonly uid: number;
  readonly gid: number;
}
const PROGRAM_BYTES = 262_144;
const same = (a: fs.BigIntStats, b: fs.BigIntStats): boolean =>
  ['dev', 'ino', 'mode', 'nlink', 'size', 'mtimeNs', 'ctimeNs'].every(key => a[key as keyof fs.BigIntStats] === b[key as keyof fs.BigIntStats]);


/** Open and pin once; both executors retain this same verified image until
 * completion. No pathname lookup can select a different executable at exec. */
function holdKernelPeerProgram(program: KernelPeerProgram): { readonly descriptor: number; readonly identity: fs.BigIntStats } {
  if (!path.isAbsolute(program.executable) || path.resolve(program.executable) !== program.executable
    || !/^[a-f0-9]{64}$/u.test(program.sha256) || fs.realpathSync(program.executable) !== program.executable) throw new Error('kernel-peer-unavailable');
  const descriptor = fs.openSync(program.executable, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const identity = fs.fstatSync(descriptor, { bigint: true });
    if (!identity.isFile() || identity.nlink !== 1n || identity.size <= 0n || identity.size > BigInt(PROGRAM_BYTES)
      || (identity.mode & 0o022n) !== 0n || (identity.mode & 0o111n) === 0n
      || (process.getuid !== undefined && identity.uid !== BigInt(process.getuid()))) throw new Error('kernel-peer-unavailable');
    const bytes = Buffer.alloc(Number(identity.size) + 1); let length = 0;
    while (length < bytes.length) {
      const count = fs.readSync(descriptor, bytes, length, bytes.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (length !== Number(identity.size) || sha256(bytes.subarray(0, length)) !== program.sha256
      || !same(identity, fs.fstatSync(descriptor, { bigint: true }))
      || !same(identity, fs.lstatSync(program.executable, { bigint: true }))) throw new Error('kernel-peer-unavailable');
    return { descriptor, identity };
  } catch (error) { fs.closeSync(descriptor); throw error; }
}

/** Kernel identity data only, never a client credential, authorization decision,
 * process-lifetime proof or a substitute for next-request revocation. The host
 * supplies its pinned helper; no role/tool/CLI option selects a program or fd.
 * Node 24's socket handle is used only to duplicate this actual borrowed Unix
 * socket into the child. The helper never reads or writes its protocol bytes.
 * The fixed native operation has a one-second SIGKILL timeout. Local kernel IO
 * and hostile same-UID mutation are not claimed to have general isolation. */
export function captureKernelUnixPeer(socket: Socket, program: KernelPeerProgram,
  chargeNativeCpuMicroseconds?: (capacity: number) => void): KernelUnixPeer | null {
  let descriptor: number | undefined;
  try {
    if (!(socket instanceof Socket) || socket.destroyed) return null;
    const handle = (socket as Socket & { readonly _handle?: { readonly fd?: unknown } })._handle;
    const socketFd = handle?.fd;
    if (!Number.isSafeInteger(socketFd) || typeof socketFd !== 'number' || socketFd < 0) return null;
    const held = holdKernelPeerProgram(program); descriptor = held.descriptor;
    const before = held.identity;
    // fd 4 names the held verified image, so a pathname replacement cannot
    // select a different executable between the hash check and exec.
    // Reserve the hard one-second CPU limit plus one second of accounting
    // granularity before execution. This is capacity, never measured rusage.
    chargeNativeCpuMicroseconds?.(2_000_000);
    const result = spawnSync('/usr/bin/prlimit', ['--cpu=1:1', '--', '/proc/self/fd/4'], {
      stdio: ['ignore', 'pipe', 'pipe', socketFd, descriptor], env: { LANG: 'C' },
      timeout: 1000, killSignal: 'SIGKILL', maxBuffer: 128, encoding: 'utf8',
    });
    if (result.error !== undefined || result.status !== 0 || result.signal !== null || result.stderr !== ''
      || socket.destroyed || (socket as Socket & { readonly _handle?: unknown })._handle !== handle
      || !same(before, fs.fstatSync(descriptor, { bigint: true }))
      || !same(before, fs.lstatSync(program.executable, { bigint: true }))) return null;
    return parseKernelUnixPeer(result.stdout);
  } catch { return null; }
  finally { if (descriptor !== undefined) try { fs.closeSync(descriptor); } catch { /* No admission survives a failure above. */ } }
}

function parseKernelUnixPeer(output: string): KernelUnixPeer | null {
  const fields = /^([1-9][0-9]{0,9}) ([0-9]{1,10}) ([0-9]{1,10})\n$/u.exec(output);
  if (fields === null) return null;
  const [pid, uid, gid] = fields.slice(1).map(Number);
  if (pid === undefined || uid === undefined || gid === undefined || pid > 2_147_483_647 || uid > 4_294_967_294 || gid > 4_294_967_294) return null;
  return Object.freeze({ pid, uid, gid });
}

/** One asynchronous executor for both pinned peer programs. The inherited
 * socket is fd3 and the held verified image fd4. Output is bounded while it
 * arrives; a timeout, stderr, image/channel replacement or failed exec refuses.
 * Capacity is reserved before spawning and is never refunded on failure. */
export async function executeKernelPeerProgramAsync(descriptor: number, program: KernelPeerProgram,
  mode: 'identity' | 'listener' | 'prepare' | 'read', chargeNativeCpuMicroseconds?: (capacity: number) => void):
  Promise<{ readonly status: number | null; readonly stdout: Buffer } | null> {
  let image: number | undefined;
  try {
    if (!Number.isSafeInteger(descriptor) || descriptor < 0) return null;
    const channel = fs.fstatSync(descriptor, { bigint: true });
    if (!channel.isSocket()) return null;
    const held = holdKernelPeerProgram(program); image = held.descriptor;
    const before = held.identity;
    chargeNativeCpuMicroseconds?.(2_000_000);
    const maximum = mode === 'identity' ? 128 : 65_536 + 512;
    const result = await new Promise<{ readonly status: number | null; readonly stdout: Buffer } | null>(resolve => {
      const child = spawn('/usr/bin/prlimit', ['--cpu=1:1', '--', '/proc/self/fd/4', ...(mode === 'identity' ? [] : [mode])], {
        stdio: ['ignore', 'pipe', 'pipe', descriptor, image!], env: { LANG: 'C' }, timeout: 1000, killSignal: 'SIGKILL',
      });
      const chunks: Buffer[] = []; let total = 0, failed = false;
      const refuse = (): void => { failed = true; child.kill('SIGKILL'); };
      child.on('error', () => { failed = true; });
      child.stdout!.on('error', refuse); child.stderr!.on('error', refuse);
      child.stdout!.on('data', (chunk: Buffer) => {
        if (failed) return;
        total += chunk.length;
        if (total > maximum) { refuse(); return; }
        chunks.push(Buffer.from(chunk));
      });
      child.stderr!.on('data', refuse);
      child.once('close', (status, signal) => resolve(failed || signal !== null ? null : { status, stdout: Buffer.concat(chunks, total) }));
    });
    const afterChannel = fs.fstatSync(descriptor, { bigint: true });
    if (!result || !afterChannel.isSocket() || channel.dev !== afterChannel.dev || channel.ino !== afterChannel.ino
      || !same(before, fs.fstatSync(image, { bigint: true }))
      || !same(before, fs.lstatSync(program.executable, { bigint: true }))) return null;
    return result;
  } catch { return null; }
  finally { if (image !== undefined) try { fs.closeSync(image); } catch { /* Refused above. */ } }
}

/** Async equivalent of captureKernelUnixPeer, using the same kernel helper and
 * parser. The original actual Socket handle and descriptor must survive exec. */
export async function captureKernelUnixPeerAsync(socket: Socket, program: KernelPeerProgram,
  chargeNativeCpuMicroseconds?: (capacity: number) => void): Promise<KernelUnixPeer | null> {
  try {
    if (!(socket instanceof Socket) || socket.destroyed) return null;
    const handle = (socket as Socket & { readonly _handle?: { readonly fd?: unknown } })._handle;
    const descriptor = handle?.fd;
    if (typeof descriptor !== 'number' || !Number.isSafeInteger(descriptor) || descriptor < 0) return null;
    const result = await executeKernelPeerProgramAsync(descriptor, program, 'identity', chargeNativeCpuMicroseconds);
    if (!result || result.status !== 0 || socket.destroyed || handle?.fd !== descriptor
      || (socket as Socket & { readonly _handle?: unknown })._handle !== handle) return null;
    return parseKernelUnixPeer(result.stdout.toString('utf8'));
  } catch { return null; }
}
