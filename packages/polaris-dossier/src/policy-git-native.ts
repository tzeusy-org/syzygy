import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, realpathSync, type BigIntStats } from 'node:fs';
import path from 'node:path';
import { createPolicyGitScope, type PolicyGitOptions, type PolicyGitReceipt, type PolicyGitScope, type PendingPolicyGit } from './policy-git.js';

export interface PolicyGitProgram {
  readonly addon: { readonly file: string; readonly sha256: string };
  readonly supervisor: { readonly file: string; readonly sha256: string };
  readonly git: { readonly file: string; readonly sha256: string };
}
interface NativeJob { readonly request: Buffer; readonly supervisorFd: number; readonly gitFd: number }
interface Native { runSync(job: NativeJob): PolicyGitReceipt; runAsync(job: NativeJob): Omit<PendingPolicyGit, 'close'> }
// A /proc fd name may be reused after close; dlopen caches such names.
// Reuse only this exact already-loaded code digest, never reload another
// image through a recycled descriptor pathname in the same process.
let loaded: { readonly sha256: string; readonly native: Native } | undefined;
const same = (left: BigIntStats, right: BigIntStats): boolean => right.isFile()
  && left.dev === right.dev && left.ino === right.ino && left.mode === right.mode && left.nlink === right.nlink
  && left.size === right.size && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
function hold(program: { readonly file: string; readonly sha256: string }): { fd: number; current(): boolean; close(): void } {
  if (!path.isAbsolute(program.file) || path.resolve(program.file) !== program.file || realpathSync(program.file) !== program.file
    || !/^[a-f0-9]{64}$/u.test(program.sha256)) throw new Error('policy-git-image-identity');
  const fd = openSync(program.file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const initial = fstatSync(fd, { bigint: true });
    if (!initial.isFile() || initial.nlink !== 1n || (initial.mode & 0o022n) !== 0n
      || initial.uid !== BigInt(process.getuid?.() ?? -1) && initial.uid !== 0n) throw new Error('policy-git-image-mode');
    let closed = false;
    const current = (): boolean => {
      if (closed) return false;
      try {
        if (!same(initial, fstatSync(fd, { bigint: true })) || !same(initial, lstatSync(program.file, { bigint: true }))) return false;
        const hash = createHash('sha256'), chunk = Buffer.alloc(1_048_576);
        let offset = 0;
        for (;;) {
          const size = readSync(fd, chunk, 0, chunk.length, offset);
          if (!size) break;
          hash.update(chunk.subarray(0, size)); offset += size;
          if (!Number.isSafeInteger(offset) || BigInt(offset) > initial.size) return false;
        }
        return BigInt(offset) === initial.size && hash.digest('hex') === program.sha256
          && same(initial, fstatSync(fd, { bigint: true })) && same(initial, lstatSync(program.file, { bigint: true }));
      } catch { return false; }
    };
    if (!current()) throw new Error('policy-git-image-digest');
    return { fd, current, close: () => {
      if (closed) return;
      closed = true; // Never retry a possibly recycled descriptor after failure.
      closeSync(fd);
    } };
  } catch (error) { closeSync(fd); throw error; }
}
const MAGIC = 0x53595a5047495431n;
const natural = (value: number): bigint => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('policy-git-length');
  return BigInt(value);
};
const COMMIT = '(?:[a-f0-9]{40}|[a-f0-9]{64})';
const object = new RegExp(`^${COMMIT}$`, 'u');
const interval = new RegExp(`^${COMMIT}\\.\\.${COMMIT}$`, 'u');
const revision = new RegExp(`^(?:HEAD|${COMMIT})\\^\\{commit\\}$`, 'u');
const objectPath = new RegExp(`^${COMMIT}:[^\\u0000-\\u001f\\u007f]+$`, 'u');
function fixedShape(args: readonly string[]): boolean {
  const command = args[3], tail = args.slice(4);
  if (command === 'cat-file') return tail.length === 1 && tail[0] === '--batch-command'
    || tail.length === 2 && tail[0] === '-t' && object.test(tail[1]!);
  if (command === 'for-each-ref') return tail.length === 3
    && tail[0] === '--format=%(refname)%00%(objectname)%00%(symref)'
    && tail[1] === 'refs/remotes/origin/main'
    && tail[2] === 'refs/tags/polaris-dossier-url-declared-source-run-v2.1';
  if (command === 'rev-parse') return tail.length === 2 && tail[0] === '--verify' && revision.test(tail[1]!);
  if (command === 'show') return tail.length === 1 && objectPath.test(tail[0]!);
  if (command === 'rev-list') return tail.length === 5 && tail[0] === '-1' && tail[1] === '--first-parent'
    && tail[2] === '--exclude-first-parent-only' && object.test(tail[3]!) && new RegExp(`^\\^${COMMIT}$`, 'u').test(tail[4]!)
    || tail.length >= 5 && /^--max-count=[1-9][0-9]*$/u.test(tail[0]!) && tail[1] === '--first-parent'
    && interval.test(tail[2]!) && tail[3] === '--' && tail.slice(4).every(file => file.length > 0 && !/[\u0000-\u001f\u007f]/u.test(file));
  return false;
}
function request(args: readonly string[], options: PolicyGitOptions, async: boolean): Buffer {
  if (args[0] !== '--no-replace-objects' || args[1] !== '-C' || !path.isAbsolute(args[2] ?? '')
    || !fixedShape(args)
    || !Number.isInteger(options.timeout) || options.timeout < 1 || options.timeout > 10_000) throw new Error('policy-git-command');
  const environment = Object.entries(options.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => {
      if (!key || key.includes('=') || key.includes('\0') || value.includes('\0')
        || key.startsWith('GIT_') && !['GIT_CONFIG_NOSYSTEM', 'GIT_CONFIG_GLOBAL', 'GIT_OPTIONAL_LOCKS', 'GIT_NO_LAZY_FETCH'].includes(key)) {
        throw new Error('policy-git-environment');
      }
      return `${key}=${value}`;
    });
  if (options.env.GIT_CONFIG_NOSYSTEM !== '1' || options.env.GIT_CONFIG_GLOBAL !== '/dev/null'
    || options.env.GIT_OPTIONAL_LOCKS !== '0' || options.env.GIT_NO_LAZY_FETCH !== '1') throw new Error('policy-git-environment');
  const input = Buffer.from(options.input ?? '');
  const header = Buffer.alloc(72);
  [MAGIC, 1n, natural(args.length + 1), natural(environment.length), natural(input.length), natural(options.maxBuffer),
    natural(options.timeout), options.input === undefined && !async ? 1n : 0n, 0n].forEach((value, index) => header.writeBigUInt64LE(value, index * 8));
  const pieces = [header];
  for (const value of ['git', ...args, ...environment]) {
    if (value.includes('\0')) throw new Error('policy-git-string');
    const bytes = Buffer.from(value), length = Buffer.alloc(8); length.writeBigUInt64LE(natural(bytes.length));
    pieces.push(length, bytes);
  }
  pieces.push(input);
  // Buffer's checked allocation and the OS exec E2BIG boundary remain the
  // natural limits; transport introduces no count/path/batch-byte ceiling.
  return Buffer.concat(pieces);
}

/** Held files are rehashed before every use and checked after completion.
 * dlopen loads the first-party addon through its verified descriptor; neither
 * a mutable script path nor any observed code enters this boundary. */
export function createNativePolicyGitScope(program: PolicyGitProgram): PolicyGitScope {
  if (process.platform !== 'linux' || process.arch !== 'x64' || process.version !== 'v24.6.0') throw new Error('policy-git-platform');
  const addon = hold(program.addon);
  let native: Native;
  try {
    if (loaded !== undefined) {
      if (loaded.sha256 !== program.addon.sha256) throw new Error('policy-git-addon-changed');
      native = loaded.native;
    } else {
      const module = { exports: {} };
      process.dlopen(module, `/proc/self/fd/${addon.fd}`);
      native = module.exports as Native;
      if (typeof native.runSync !== 'function' || typeof native.runAsync !== 'function') throw new Error('policy-git-addon');
      loaded = { sha256: program.addon.sha256, native };
    }
    if (!addon.current()) throw new Error('policy-git-addon');
  } finally { addon.close(); }
  let closed = false;
  const openJob = (args: readonly string[], options: PolicyGitOptions, async: boolean) => {
    if (closed) throw new Error('policy-git-closed');
    const images: ReturnType<typeof hold>[] = [];
    try {
      const code = hold(program.addon); images.push(code);
      const supervisor = hold(program.supervisor); images.push(supervisor);
      const git = hold(program.git); images.push(git);
      return { native: { request: request(args, options, async), supervisorFd: supervisor.fd, gitFd: git.fd },
        current: () => images.every(image => image.current()), close: () => {
          let failure: unknown;
          for (const image of images) try { image.close(); } catch (error) { failure ??= error; }
          if (failure !== undefined) throw failure;
        } };
    } catch (error) {
      const cleanup: unknown[] = [];
      for (const image of images) try { image.close(); } catch (failure) { cleanup.push(failure); }
      if (cleanup.length > 0) throw new AggregateError([error, ...cleanup], 'policy-git-job-construction');
      throw error;
    }
  };
  // Descriptors belong to each completed call, so an unused cold-verifier
  // result retains no native handles. The meter alone survives into its pool.
  return createPolicyGitScope({
    runSync(args, options) {
      const job = openJob(args, options, false);
      try { const result = native.runSync(job.native); if (!job.current()) throw new Error('policy-git-image-drift'); return result; }
      finally { job.close(); }
    },
    runAsync(args, options) {
      const job = openJob(args, options, true);
      try {
        const call = native.runAsync(job.native);
        return {
          settleSync() { const usage = call.settleSync(); if (!job.current()) throw new Error('policy-git-image-drift'); return usage; },
          completion: call.completion.then(result => { if (!job.current()) throw new Error('policy-git-image-drift'); return result; }),
          close: () => job.close(),
        };
      } catch (error) { job.close(); throw error; }
    },
    close() { closed = true; },
  });
}
