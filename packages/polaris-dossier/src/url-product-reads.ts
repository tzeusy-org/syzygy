import * as fs from 'node:fs';
import path from 'node:path';

/** Bounded Linux descriptor-relative IO only. These snapshots authenticate no
 * producer or origin; the owning bridge must match its private committed registry. */
export interface ProductPathIdentity { readonly dev: number; readonly ino: number; readonly mode: number; }
export interface ProductFileSnapshot {
  readonly bytes: Uint8Array | null;
  readonly chain: readonly ProductPathIdentity[];
  readonly missingAt: number | null;
  readonly stat: fs.Stats | null;
}
export interface ProductNameSnapshot {
  readonly names: readonly string[];
  readonly chain: readonly ProductPathIdentity[];
  readonly missingAt: number | null;
}
const bad = (): never => { throw new Error('url-product-read-unavailable'); };
function guarded<T>(work: () => T): T { try { return work(); } catch { return bad(); } }
const relative = (s: string): boolean => typeof s === 'string' && s.length > 0 && s.length <= 4096 && !s.startsWith('/')
  && !/[\\\u0000-\u0020\u007f]/u.test(s) && s.split('/').every(p => p !== '' && p !== '.' && p !== '..');
const identity = (s: fs.Stats): ProductPathIdentity => Object.freeze({ dev: s.dev, ino: s.ino, mode: s.mode });
const same = (a: fs.Stats, b: fs.Stats): boolean => a.dev === b.dev && a.ino === b.ino && a.mode === b.mode && a.nlink === b.nlink
  && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;
function withDirectory<T>(root: string, parts: readonly string[], check: () => void,
  visit: (fd: number | null, chain: readonly ProductPathIdentity[], missingAt: number | null) => T): T {
  check(); if (!path.isAbsolute(root) || path.resolve(root) !== root || fs.realpathSync(root) !== root) bad();
  const opened: { fd: number; name: string; stat: fs.Stats }[] = [];
  try {
    let fd = fs.openSync(root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    opened.push({ fd, name: root, stat: fs.fstatSync(fd) });
    for (let i = 0; i < parts.length; i++) {
      const name = `/proc/self/fd/${fd}/${parts[i]!}`;
      try { fd = fs.openSync(name, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        return visit(null, opened.map(v => identity(v.stat)), i); }
      opened.push({ fd, name, stat: fs.fstatSync(fd) }); check();
    }
    return visit(fd, opened.map(v => identity(v.stat)), null);
  } finally {
    try { for (const item of opened) if (!same(item.stat, fs.fstatSync(item.fd)) || !same(item.stat, fs.lstatSync(item.name))) bad(); }
    finally { for (const item of opened.reverse()) fs.closeSync(item.fd); }
  }
}
export function snapshotProductFile(root: string, file: string, maximum: number, check: () => void): ProductFileSnapshot {
  if (!relative(file) || !Number.isSafeInteger(maximum) || maximum < 1 || maximum > 8_388_608) bad();
  const parts = file.split('/');
  return guarded(() => withDirectory(root, parts.slice(0, -1), check, (parent, chain, missingAt) => {
    if (parent === null) return { bytes: null, chain, missingAt, stat: null };
    const name = `/proc/self/fd/${parent}/${parts.at(-1)!}`;
    let fd: number;
    try { fd = fs.openSync(name, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; return { bytes: null, chain, missingAt: parts.length - 1, stat: null }; }
    try {
      const stat = fs.fstatSync(fd);
      if (!stat.isFile() || stat.nlink !== 1 || stat.size < 1 || stat.size > maximum) bad();
      const bytes = Buffer.alloc(stat.size); let offset = 0;
      while (offset < bytes.length) { check(); const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset); if (!count) bad(); offset += count; }
      check();
      if (fs.readSync(fd, Buffer.alloc(1), 0, 1, offset) !== 0 || !same(stat, fs.fstatSync(fd)) || !same(stat, fs.lstatSync(name))) bad();
      return { bytes, chain, missingAt: null, stat };
    } finally { fs.closeSync(fd); }
  }));
}
export function snapshotProductNames(root: string, directory: string, maximum: number, check: () => void): ProductNameSnapshot {
  if (!relative(directory) || !Number.isSafeInteger(maximum) || maximum < 1 || maximum > 4096) bad();
  return guarded(() => withDirectory(root, directory.split('/'), check, (fd, chain, missingAt) => {
    const names: string[] = [];
    if (fd !== null) {
      const directory = fs.opendirSync(`/proc/self/fd/${fd}`);
      try { for (;;) { check(); const item = directory.readSync(); if (item === null) break; if (names.length >= maximum) bad(); names.push(item.name); } }
      finally { directory.closeSync(); }
    }
    return { names: Object.freeze(names.sort()), chain, missingAt };
  }));
}
export function sameProductPath(a: Pick<ProductFileSnapshot, 'chain' | 'missingAt'>, b: Pick<ProductFileSnapshot, 'chain' | 'missingAt'>): boolean {
  return a.missingAt === b.missingAt && a.chain.length === b.chain.length
    && a.chain.every((v, i) => v.dev === b.chain[i]!.dev && v.ino === b.chain[i]!.ino && v.mode === b.chain[i]!.mode);
}
export function sameProductFile(a: ProductFileSnapshot, b: ProductFileSnapshot): boolean {
  return sameProductPath(a, b) && (a.bytes === null ? b.bytes === null : b.bytes !== null && a.stat !== null && b.stat !== null
    && same(a.stat, b.stat) && Buffer.from(a.bytes).equals(Buffer.from(b.bytes)));
}
