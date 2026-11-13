/** Test support: replace one `node:fs` function for every module that imports `node:fs`, then restore it. A module's namespace import
 * reads the CommonJS module's bindings, which `syncBuiltinESMExports` refreshes, so a replacement installed there is what the code under
 * test calls (R-GP-IMPL-LAUNCHED-MARKER-2, R2-N1 and R2-N4). */
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
const CONTENT_READS = ['openSync', 'open', 'readFileSync', 'readFile', 'createReadStream', 'copyFileSync', 'copyFile', 'cpSync', 'cp'] as const;
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
