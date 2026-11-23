/** Test support: replace one `node:fs` function for every module that imports `node:fs`, then restore it. A module's namespace import
 * reads the CommonJS module's bindings, which `syncBuiltinESMExports` refreshes, so a replacement installed there is what the code under
 * test calls (R-GP-IMPL-LAUNCHED-MARKER-2, R2-N1 and R2-N4). */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import * as path from 'node:path';

interface Patchable {
  openSync: typeof fs.openSync;
  fstatSync: typeof fs.fstatSync;
  readSync: typeof fs.readSync;
  readlinkSync: typeof fs.readlinkSync;
  open: typeof fs.open;
  readFileSync: typeof fs.readFileSync;
  readFile: typeof fs.readFile;
  createReadStream: typeof fs.createReadStream;
  copyFileSync: typeof fs.copyFileSync;
  copyFile: typeof fs.copyFile;
  cpSync: typeof fs.cpSync;
  cp: typeof fs.cp;
  openAsBlob: typeof fs.openAsBlob;
  lstatSync: typeof fs.lstatSync;
  statSync: typeof fs.statSync;
  existsSync: typeof fs.existsSync;
  accessSync: typeof fs.accessSync;
}

const require = createRequire(import.meta.url);
const cjsFs = require('node:fs') as Patchable;
interface PatchablePromises { open: typeof fs.promises.open; readFile: typeof fs.promises.readFile; copyFile: typeof fs.promises.copyFile; cp: typeof fs.promises.cp }
const cjsPromises = require('node:fs/promises') as PatchablePromises;

/** Install `replace(original)` as `node:fs`'s `name`; the returned function puts the original back. */
export function patchFs<K extends keyof Patchable>(name: K, replace: (original: Patchable[K]) => Patchable[K]): () => void {
  const original = cjsFs[name];
  cjsFs[name] = replace(original);
  syncBuiltinESMExports();
  return () => {
    cjsFs[name] = original;
    syncBuiltinESMExports();
  };
}

/** How many times `act` opens `file` through `fs.openSync`, counting opens that fail. */
export async function opensOf(file: string, act: () => Promise<unknown>): Promise<number> {
  let opens = 0;
  const restore = patchFs('openSync', (openSync) => ((target: fs.PathLike, ...rest: unknown[]) => {
    if (path.resolve(String(target)) === path.resolve(file)) opens += 1;
    return (openSync as (...args: unknown[]) => number)(target, ...rest);
  }) as typeof fs.openSync);
  try {
    await act();
  } finally {
    restore();
  }
  return opens;
}

/** Every entry point through which a process reads a file's content, and every one through which it examines a path without reading
 * it, as named in `node:fs` and `node:fs/promises`. A read through any of the first is logged under `opened`, whatever the API; the
 * second under `examined`. Directory listings are neither (a reference's name is listed, never read). */
const CONTENT_READS = ['openSync', 'open', 'readFileSync', 'readFile', 'createReadStream', 'copyFileSync', 'copyFile', 'cpSync', 'cp', 'openAsBlob'] as const;
const EXAMINATIONS = ['lstatSync', 'statSync', 'existsSync', 'accessSync'] as const;
const PROMISE_READS = ['open', 'readFile', 'copyFile', 'cp'] as const;

export interface ReadLog {
  /** Paths under the root whose content some entry point was asked to read (opened, read whole or streamed), relative, in call order. */
  readonly opened: string[];
  /** Paths under the root some entry point examined without reading (lstat, stat, exists, access), relative, in call order. */
  readonly examined: string[];
}

/** A read-logging layer over `node:fs` and `node:fs/promises`, outside the code under test (R-PDJA-33-SLICE-A-1 finding 1): it logs
 * every content read and every examination of a path under `root`, whatever API the code chose. The returned function restores every
 * entry point. A file-descriptor read (`readSync` and the like) is reached only through an open, which is logged. */
export function installReadLog(root: string): { readonly log: ReadLog; readonly restore: () => void } {
  const base = path.resolve(root);
  const log: ReadLog = { opened: [], examined: [] };
  const under = (target: unknown): string | null => {
    if (typeof target !== 'string' && !(target instanceof URL) && !Buffer.isBuffer(target)) return null;   // a descriptor: its open was logged
    const abs = path.resolve(target instanceof URL ? target.pathname : String(target));
    const rel = path.relative(base, abs);
    return rel === '' ? '.' : rel.startsWith('..') || path.isAbsolute(rel) ? null : rel.split(path.sep).join('/');
  };
  const originals: Partial<Record<keyof Patchable, unknown>> = {};
  const wrap = (name: keyof Patchable, into: string[]) => {
    const original = cjsFs[name] as (...args: unknown[]) => unknown;
    originals[name] = original;
    (cjsFs as unknown as Record<string, unknown>)[name] = (target: unknown, ...rest: unknown[]) => {
      const rel = under(target);
      if (rel !== null) into.push(rel);
      return original(target, ...rest);
    };
  };
  for (const name of CONTENT_READS) wrap(name, log.opened);
  for (const name of EXAMINATIONS) wrap(name, log.examined);
  const promiseOriginals: Partial<Record<keyof PatchablePromises, unknown>> = {};
  for (const name of PROMISE_READS) {
    const original = cjsPromises[name] as (...args: unknown[]) => unknown;
    promiseOriginals[name] = original;
    (cjsPromises as unknown as Record<string, unknown>)[name] = (target: unknown, ...rest: unknown[]) => {
      const rel = under(target);
      if (rel !== null) log.opened.push(rel);
      return original(target, ...rest);
    };
  }
  syncBuiltinESMExports();
  return {
    log,
    restore: () => {
      for (const [name, fn] of Object.entries(originals)) (cjsFs as unknown as Record<string, unknown>)[name] = fn;
      for (const [name, fn] of Object.entries(promiseOriginals)) (cjsPromises as unknown as Record<string, unknown>)[name] = fn;
      syncBuiltinESMExports();
    },
  };
}

/** Make every regular file under `dir` unreadable (mode 000) but the relative paths in `readable`, so that a read of any other fails
 * whatever API makes it; names stay listable and paths examinable. The second, API-independent half of the launch-read oracle. `unseal`
 * gives each file its mode back and `reseal` takes it away again, so a Git process can be let read while it runs and no longer
 * (R-PDJA-33-SLICE-B-1 finding 3). */
export function sealExcept(dir: string, readable: readonly string[]): { readonly sealed: readonly string[]; readonly unseal: () => void; readonly reseal: () => void } {
  const keep = new Set(readable);
  const sealed: { readonly rel: string; readonly mode: number }[] = [];
  const walk = (rel: string): void => {
    const abs = path.join(dir, ...rel.split('/').filter(Boolean));
    const st = fs.lstatSync(abs);
    if (st.isDirectory()) { for (const name of fs.readdirSync(abs).sort()) walk(rel === '' ? name : `${rel}/${name}`); return; }
    if (st.isFile() && !keep.has(rel)) { sealed.push({ rel, mode: st.mode & 0o7777 }); fs.chmodSync(abs, 0o000); }
  };
  walk('');
  return {
    sealed: sealed.map(s => s.rel),
    unseal: () => { for (const s of sealed) fs.chmodSync(path.join(dir, ...s.rel.split('/')), s.mode); },
    reseal: () => { for (const s of sealed) fs.chmodSync(path.join(dir, ...s.rel.split('/')), 0o000); },
  };
}

/** The bytes read through `readSync` from each descriptor `openSync` gives for `subject`, one total per open, in open order, until
 * `restore` (REQ-polaris-generation-033 and -035 version 2.18, syzygy-3efd.80). */
export function trackReads(subject: string): { readonly totals: number[]; readonly restore: () => void } {
  const opened = new Map<number, number>();
  const totals: number[] = [];
  const restoreOpen = patchFs('openSync', (original) => ((file: fs.PathLike, ...rest: unknown[]) => {
    const fd = (original as (...args: unknown[]) => number)(file, ...rest);
    opened.delete(fd);
    if (typeof file === 'string' && path.resolve(file) === path.resolve(subject)) { opened.set(fd, totals.length); totals.push(0); }
    return fd;
  }) as typeof original);
  const restoreRead = patchFs('readSync', (original) => ((fd: number, ...rest: unknown[]) => {
    const read = (original as (...args: unknown[]) => number)(fd, ...rest);
    const index = opened.get(fd);
    if (index !== undefined) totals[index]! += read;
    return read;
  }) as typeof original);
  return { totals, restore: () => { restoreRead(); restoreOpen(); } };
}

/** Grows `subject` by a mebibyte of newlines the first time a descriptor's size is taken at exactly `bound` bytes, until `restore`. */
export function growOnceSized(subject: string, bound: number): { readonly grown: () => boolean; readonly restore: () => void } {
  let grown = false;
  const restore = patchFs('fstatSync', (original) => ((fd: number, ...rest: unknown[]) => {
    const stats = (original as (...args: unknown[]) => fs.Stats)(fd, ...rest);
    if (!grown && stats.isFile() && stats.size === bound) { grown = true; fs.appendFileSync(subject, '\n'.repeat(1_048_576)); }
    return stats;
  }) as typeof original);
  return { grown: () => grown, restore };
}

/** The six cases a version 2.18 Case line puts at each bounded run-tree file: three special files, a regular file one byte past its
 * bound, one grown past it after its size was taken, and one exactly at it. */
export const READ_CASES = ['a FIFO', 'a symbolic link to /dev/zero', 'a directory', 'one byte past its bound', 'grown past its bound after its size was taken', 'exactly at its bound'] as const;
export type ReadCase = (typeof READ_CASES)[number];

/** Replaces whatever is at `file` with `kase` for a file bounded at `bound` bytes: a regular file is sparse, of NUL bytes, and one to be
 * grown is placed exactly at its bound (`growOnceSized` grows it). */
export function placeReadCase(kase: ReadCase, file: string, bound: number): void {
  fs.rmSync(file, { recursive: true, force: true });
  if (kase === 'a FIFO') execFileSync('mkfifo', [file]);
  else if (kase === 'a symbolic link to /dev/zero') fs.symlinkSync('/dev/zero', file);
  else if (kase === 'a directory') fs.mkdirSync(file);
  else { fs.writeFileSync(file, ''); fs.truncateSync(file, kase === 'one byte past its bound' ? bound + 1 : bound); }
}

/** Places `kase` at `file` (`placeReadCase`), runs `act` with the reads of `file` tracked and, for the grown case, `file` grown once its
 * size is taken at `bound`, and gives the bytes read per open. */
export async function underReadCase(kase: ReadCase, file: string, bound: number, act: () => unknown): Promise<number[]> {
  placeReadCase(kase, file, bound);
  const growth = kase === 'grown past its bound after its size was taken' ? growOnceSized(file, bound) : undefined;
  const reads = trackReads(file);
  try { await act(); } finally { reads.restore(); growth?.restore(); }
  if (growth !== undefined && !growth.grown()) throw new Error(`fixture: ${file} was never sized at ${bound} bytes`);
  return reads.totals;
}
