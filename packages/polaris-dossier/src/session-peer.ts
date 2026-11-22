import * as fs from 'node:fs';
import { Socket } from 'node:net';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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
    if (!(socket instanceof Socket) || socket.destroyed || !path.isAbsolute(program.executable)
      || path.resolve(program.executable) !== program.executable || !/^[a-f0-9]{64}$/u.test(program.sha256)
      || fs.realpathSync(program.executable) !== program.executable) return null;
    const handle = (socket as Socket & { readonly _handle?: { readonly fd?: unknown } })._handle;
    const socketFd = handle?.fd;
    if (!Number.isSafeInteger(socketFd) || typeof socketFd !== 'number' || socketFd < 0) return null;
    descriptor = fs.openSync(program.executable, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const before = fs.fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size <= 0n || before.size > BigInt(PROGRAM_BYTES)
      || (before.mode & 0o022n) !== 0n || (before.mode & 0o111n) === 0n
      || (process.getuid !== undefined && before.uid !== BigInt(process.getuid()))) return null;
    const bytes = Buffer.alloc(Number(before.size) + 1);
    let length = 0;
    while (length < bytes.length) {
      const count = fs.readSync(descriptor, bytes, length, bytes.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (length !== Number(before.size) || sha256(bytes.subarray(0, length)) !== program.sha256
      || !same(before, fs.fstatSync(descriptor, { bigint: true }))
      || !same(before, fs.lstatSync(program.executable, { bigint: true }))) return null;
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
    const fields = /^([1-9][0-9]{0,9}) ([0-9]{1,10}) ([0-9]{1,10})\n$/u.exec(result.stdout);
    if (fields === null) return null;
    const [pid, uid, gid] = fields.slice(1).map(Number);
    if (pid === undefined || uid === undefined || gid === undefined || pid > 2_147_483_647 || uid > 4_294_967_294 || gid > 4_294_967_294) return null;
    return Object.freeze({ pid, uid, gid });
  } catch { return null; }
  finally { if (descriptor !== undefined) try { fs.closeSync(descriptor); } catch { /* No admission survives a failure above. */ } }
}
