import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';
import type { FileHandle } from 'node:fs/promises';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import {
  ORDERED_SCREEN_FORMAT, ORDERED_SCREEN_INPUT_LIMITS, ORDERED_SCREEN_OUTPUT_LIMITS, ORDERED_SCREEN_LIMITS,
  type OrderedScreenInput, type OrderedScreenLimits, type OrderedScreenObservation,
} from './url-ordered-design-screen-protocol.js';

export interface OrderedScreenProgramFile { readonly path: string; readonly bytes: number; readonly sha256: string }
export interface OrderedScreenProgram { readonly node: OrderedScreenProgramFile; readonly worker: OrderedScreenProgramFile }
export interface OrderedScreenCharge {
  /** Conservatively charged capacity for the bwrap supervisor and its one Node child,
   * including one second of kernel RLIMIT_CPU granularity per process. */
  readonly cpuMicroseconds: number;
  readonly cpuAccounting: 'charged-hard-capacity';
  readonly wallMilliseconds: number;
  readonly enforcedWallMilliseconds: number;
}
export type OrderedScreenRun = {
  readonly charge: OrderedScreenCharge;
  readonly program: OrderedScreenProgram;
} & ({ readonly ok: true; readonly observation: OrderedScreenObservation }
  | { readonly ok: false; readonly reason: 'ordered-screen-refused' });

const same = (a: fs.BigIntStats, b: fs.BigIntStats): boolean =>
  ['dev', 'ino', 'mode', 'nlink', 'size', 'mtimeNs', 'ctimeNs'].every(key => a[key as keyof fs.BigIntStats] === b[key as keyof fs.BigIntStats]);
interface Held { readonly handle: FileHandle; readonly fd: number; readonly file: OrderedScreenProgramFile; readonly stat: fs.BigIntStats }
function refuse(): never { throw new Error('ordered-screen-refused'); }
async function hold(file: OrderedScreenProgramFile, executable: boolean, current: () => void): Promise<Held> {
  if (!path.isAbsolute(file.path) || path.resolve(file.path) !== file.path || await fs.promises.realpath(file.path) !== file.path
    || !/^[a-f0-9]{64}$/u.test(file.sha256) || !Number.isSafeInteger(file.bytes)
    || file.bytes <= 0 || file.bytes > (executable ? 536_870_912 : 8_388_608)) refuse();
  const handle = await fs.promises.open(file.path, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  const fd = handle.fd;
  try {
    current();
    const stat = await handle.stat({ bigint: true });
    if (!stat.isFile() || stat.nlink !== 1n || stat.size !== BigInt(file.bytes) || (stat.mode & 0o022n) !== 0n
      || (executable && (stat.mode & 0o111n) === 0n)
      || (stat.uid !== 0n && stat.uid !== BigInt(process.getuid!()))) refuse();
    const hash = createHash('sha256'), buffer = Buffer.alloc(65_536);
    let offset = 0;
    while (offset < file.bytes) {
      current();
      const { bytesRead: count } = await handle.read(buffer, 0, Math.min(buffer.length, file.bytes - offset), offset);
      if (count === 0) refuse();
      hash.update(buffer.subarray(0, count)); offset += count;
    }
    if (hash.digest('hex') !== file.sha256 || !same(stat, await handle.stat({ bigint: true }))
      || !same(stat, await fs.promises.lstat(file.path, { bigint: true }))) refuse();
    current();
    return { handle, fd, file, stat };
  } catch { await handle.close(); throw new Error('ordered-screen-refused'); }
}
function unchanged(held: Held): boolean {
  return same(held.stat, fs.fstatSync(held.fd, { bigint: true })) && same(held.stat, fs.lstatSync(held.file.path, { bigint: true }));
}

/** Invoke only after the caller reserves the selected whole-operation envelope.
 * No provider/network namespace, host home, inherited credentials or writable
 * storage is present. Exact held images are mounted into a fresh sandbox.
 * A missing/unsupported sandbox fails closed; there is no unsandboxed fallback.
 * This does not claim isolation against a hostile same-UID host process or a
 * changed system bwrap/prlimit/dynamic-loader installation. */
export async function runOrderedDesignScreen(options: {
  readonly program: OrderedScreenProgram;
  readonly input: OrderedScreenInput;
  readonly limits?: OrderedScreenLimits;
  readonly deadlineEpochMilliseconds: number;
  readonly current: () => boolean;
  /** Charge before spawn so an asynchronous refusal cannot lose child capacity. */
  readonly chargeCpuMicroseconds?: (value: number) => void;
}): Promise<OrderedScreenRun> {
  const started = performance.now(), limits = options.limits ?? ORDERED_SCREEN_LIMITS;
  const held: Held[] = [];
  let enforcedWallMilliseconds = 0;
  // Refusal before starting consumes no child capacity. Once launched, charge
  // the conservative whole cap even when the worker times out or fails.
  let cpuMicroseconds = 0;
  const finish = () => ({ program: options.program, charge: { cpuMicroseconds, cpuAccounting: 'charged-hard-capacity' as const,
    wallMilliseconds: Math.ceil(performance.now() - started), enforcedWallMilliseconds } });
  try {
    if (Object.keys(limits).sort().join(',') !== Object.keys(ORDERED_SCREEN_LIMITS).sort().join(',')) refuse();
    for (const key of Object.keys(ORDERED_SCREEN_LIMITS) as (keyof OrderedScreenLimits)[]) {
      if (!Number.isSafeInteger(limits[key]) || limits[key] <= 0 || limits[key] > ORDERED_SCREEN_LIMITS[key]) refuse();
    }
    if (limits.addressBytes < 268_435_456 || !Number.isSafeInteger(options.deadlineEpochMilliseconds) || !options.current()
      || options.deadlineEpochMilliseconds <= Date.now()) refuse();
    const input = Buffer.from(encodeCanonicalJson({ format: ORDERED_SCREEN_FORMAT, input: options.input, limits }, ORDERED_SCREEN_INPUT_LIMITS));
    const current = (): void => { if (!options.current() || Date.now() >= options.deadlineEpochMilliseconds) refuse(); };
    const worker = await hold(options.program.worker, false, current); held.push(worker);
    const node = await hold(options.program.node, true, current); held.push(node);
    enforcedWallMilliseconds = Math.min(limits.wallMilliseconds, options.deadlineEpochMilliseconds - Date.now());
    if (enforcedWallMilliseconds <= 0 || !options.current()) refuse();
    // --as-pid-1 removes bwrap's separate PID-1 reaper. There are exactly the
    // bwrap supervisor and one trusted Node process. Node cannot spawn or load
    // addons; process/thread CPU is included in each process's RLIMIT_CPU.
    const argv = [`--cpu=${limits.cpuSeconds}:${limits.cpuSeconds}`, `--as=${limits.addressBytes}:${limits.addressBytes}`,
      '--fsize=0:0', '--core=0:0', '--nofile=64:64', '--', '/usr/bin/bwrap', '--unshare-all', '--unshare-user', '--as-pid-1',
      '--die-with-parent', '--disable-userns', '--cap-drop', 'ALL', '--clearenv',
      '--setenv', 'LANG', 'C', '--setenv', 'UV_THREADPOOL_SIZE', '1', '--ro-bind', '/usr', '/usr',
      '--symlink', 'usr/lib', '/lib', '--symlink', 'usr/lib64', '/lib64', '--symlink', 'usr/bin', '/bin',
      '--dev', '/dev', '--proc', '/proc', '--dir', '/tool', '--ro-bind-fd', '3', '/tool/worker.mjs',
      '--ro-bind-fd', '4', '/tool/node', '--chdir', '/tool', '--', '/tool/node', '--jitless', '--no-warnings',
      '--disallow-code-generation-from-strings', '--permission', '--no-addons', '--v8-pool-size=1',
      '--max-old-space-size=256', '--max-semi-space-size=4', '--stack-size=512', '--allow-fs-read=/tool/worker.mjs', '/tool/worker.mjs'];
    cpuMicroseconds = 2 * (limits.cpuSeconds + 1) * 1_000_000;
    options.chargeCpuMicroseconds?.(cpuMicroseconds);
    const result = await new Promise<{ failed: boolean; status: number | null; signal: NodeJS.Signals | null; stdout: Buffer }>(resolve => {
      // The outer child owns a new session/group. Keep the worker in that
      // group so a wall timeout kills both supervisor and worker, even idle.
      const child = spawn('/usr/bin/prlimit', argv, { detached: true, stdio: ['pipe', 'pipe', 'pipe', worker.fd, node.fd],
        env: { LANG: 'C', LC_ALL: 'C', UV_THREADPOOL_SIZE: '1' } });
      let failed = false, closed = false, outputBytes = 0;
      const output: Buffer[] = [];
      const stop = (): void => {
        if (closed) return;
        failed = true;
        try { if (child.pid !== undefined) process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
      };
      const timer = setTimeout(stop, enforcedWallMilliseconds);
      // Revocation and shared budget exhaustion must stop a running child too.
      const poll = setInterval(() => { try { current(); } catch { stop(); } }, 20);
      child.once('error', stop);
      child.stdin!.once('error', stop);
      child.stdout!.once('error', stop);
      child.stderr!.once('error', stop);
      child.stdout!.on('data', (chunk: Buffer) => {
        outputBytes += chunk.length;
        if (failed || outputBytes > ORDERED_SCREEN_OUTPUT_LIMITS.maxBytes) { stop(); return; }
        output.push(chunk);
      });
      // No diagnostic bytes leave this private pipe or need to be retained.
      child.stderr!.on('data', stop);
      child.once('close', (status, signal) => {
        closed = true;
        clearTimeout(timer); clearInterval(poll);
        resolve({ failed, status, signal, stdout: failed ? Buffer.alloc(0) : Buffer.concat(output, outputBytes) });
      });
      child.stdin!.end(input);
    });
    if (result.failed || result.status !== 0 || result.signal !== null
      || !held.every(unchanged) || !options.current() || Date.now() >= options.deadlineEpochMilliseconds) refuse();
    const output = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(result.stdout);
    const observation: unknown = parseBoundedJson(output, ORDERED_SCREEN_OUTPUT_LIMITS);
    if (encodeCanonicalJson(observation, ORDERED_SCREEN_OUTPUT_LIMITS) !== output || !isRecord(observation)
      || observation.format !== ORDERED_SCREEN_FORMAT || observation.policySha256 !== options.input.policySha256
      || observation.profileSha256 !== options.input.profileSha256 || !isRecord(observation.counts)
      || !isRecord(observation.outcome) || observation.outcome.operation !== options.input.operation
      || !Number.isSafeInteger(observation.selfCpuMicrosecondsBeforeOutput)
      || Number(observation.selfCpuMicrosecondsBeforeOutput) < 0
      || Object.values(observation.counts).some(value => !Number.isSafeInteger(value) || Number(value) < 0)) refuse();
    return { ...finish(), ok: true, observation: observation as unknown as OrderedScreenObservation };
  } catch { return { ...finish(), ok: false, reason: 'ordered-screen-refused' }; }
  finally { for (const entry of held) try { await entry.handle.close(); } catch { /* No result survives a failed scan. */ } }
}
