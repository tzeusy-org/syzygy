import { createHash } from 'node:crypto';
import { constants, lstat, open, readdir, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { inflateSync } from 'node:zlib';

/** Reads Git objects at one pinned revision of a clone, in process (REQ-polaris-generation-033, the reads sentence; design decision 1).
 *
 * The clone's `.git` directory is within the agent sessions' write reach, so nothing in it is trusted except object bytes that hash to
 * the identifier they were reached by. The reader:
 * - reads only the object store (`objects/` loose files and `objects/pack/` packs), never a ref, the index, the working tree,
 *   `config`, hooks, `objects/info/alternates`, `info/grafts`, `shallow`, `refs/replace/` or a commit-graph, and spawns no process;
 * - follows no symbolic link under `.git` and reads no special file: `objects/`, `objects/pack/`, each fan-out directory, each loose
 *   object, `.idx` and `.pack` must be a directory or regular file reached without one (files are opened `O_NOFOLLOW | O_NONBLOCK`
 *   and checked regular after opening), or the call refuses (`unsafe-store-entry`). Residual: a directory swapped for a link between
 *   its `lstat` and the open of a file beneath it is not detected, nor is a hard link, which no open can tell from the file itself;
 *   either can make the reader load a regular file from outside the clone, and the bytes read are still re-hashed;
 * - takes the hash algorithm from the consented identifier (40 hex digits SHA-1, 64 SHA-256), never `extensions.objectFormat`.
 *   SHA-1 is plain SHA-1, without git's collision detection (sha1dc): a chosen-prefix collision needs both colliding objects
 *   prepared before the upstream publishes one;
 * - walks down from the pinned commit to its tree and from there to each entry, never to a parent, and never more than
 *   `MAX_TREE_DEPTH` (4,096, git's `core.maxTreeDepth` default) segments deep: a longer path refuses (`malformed-path`) and a tree
 *   nested deeper refuses (`malformed-tree`), so a path's cost is linear in its length and bounded;
 * - on every call, re-reads and recomputes the identifier of every commit, tree and blob on the way down, and refuses
 *   (`GitObjectReadRefusal`) when one differs from the identifier it was reached by, is missing (an object only an alternate or a
 *   replacement could supply is missing), cannot be decoded, or has the wrong type. Nothing verified is kept between calls;
 * - refuses a tree entry whose name is `.` or `..`, is not UTF-8, repeats a name in the same tree, or is a name some filesystem
 *   reads as `.git` (git's fsck `is_hfs_dotgit` and `is_ntfs_dotgit`): `.git` in any case, with any code point HFS+ ignores, or, in
 *   any backslash-separated component, `.git` or its short name `git~1` followed by dots or spaces, a `:` stream name, or nothing;
 *   and a mode git does not write. Entries out of git's order are not refused. Every path `listTree` returns is one `readBlobs`
 *   resolves to that entry;
 * - bounds each call, and only each call: one object's inflated size (`maxObjectBytes`), the delta chain depth
 *   (`maxDeltaChainDepth`), the stored bytes inflated plus the bytes they inflate to and the bytes deltas produce, summed over the
 *   call (`maxInflatedBytesPerCall`), and the objects read plus tree entries listed (`maxObjectsPerCall`). A zlib stream longer
 *   stored than git writes for its inflated size (`storedBound`), or a loose object with bytes after its stream, refuses
 *   (`corrupt-object`), so padding cannot buy unbounded work. Nothing carries between calls: a ceiling over many calls is the
 *   caller's. Peak memory in one call is about three times `maxObjectBytes` (a delta's base, the delta and its output held at
 *   once; 3 GiB at the default), plus the `.idx` files;
 * - refuses a store that cannot be read (`store-unreadable`, a filesystem error code) and its own defects (`reader-fault`, any other
 *   error), and never throws anything else.
 * Not bounded: the bytes of `.idx` files, each read and parsed in full once per call. Classification and screening of what it returns
 * (REQ-polaris-generation-025) are the caller's. */

export type HashAlgorithm = 'sha1' | 'sha256';
export type GitObjectType = 'commit' | 'tree' | 'blob' | 'tag';
export type GitObjectReadRefusalReason =
  | 'malformed-identifier' | 'not-a-git-directory' | 'malformed-path' | 'object-missing' | 'corrupt-object' | 'identifier-mismatch'
  | 'type-mismatch' | 'malformed-commit' | 'malformed-tree' | 'path-not-found' | 'not-a-blob' | 'invalid-pack-index'
  | 'unsafe-store-entry' | 'budget-exceeded' | 'store-unreadable' | 'reader-fault';

/** A refused read, in human form (`message`) and machine form (`toJSON()`). None of the refused object's content is carried, nor
 * the identifier its bytes would hash to. */
export class GitObjectReadRefusal extends Error {
  constructor(
    readonly reason: GitObjectReadRefusalReason,
    message: string,
    readonly objectId: string | null = null,
    readonly path: string | null = null,
  ) {
    super(message);
    this.name = 'GitObjectReadRefusal';
  }
  toJSON(): { readonly reason: GitObjectReadRefusalReason; readonly objectId: string | null; readonly path: string | null; readonly message: string } {
    return { reason: this.reason, objectId: this.objectId, path: this.path, message: this.message };
  }
}

const refuse = (reason: GitObjectReadRefusalReason, message: string, objectId: string | null = null, at: string | null = null): never => {
  throw new GitObjectReadRefusal(reason, message, objectId, at);
};

/** The algorithm a consented identifier is written in: lowercase hex, 40 digits SHA-1 or 64 SHA-256. Anything else refuses. */
export function hashAlgorithmOf(identifier: string): HashAlgorithm {
  if (/^[0-9a-f]{40}$/.test(identifier)) return 'sha1';
  if (/^[0-9a-f]{64}$/.test(identifier)) return 'sha256';
  return refuse('malformed-identifier', `"${identifier.slice(0, 80)}" is not a 40- or 64-digit lowercase hex object identifier`);
}

/** Tree entry modes whose object is a blob: regular, executable and symbolic-link files. A submodule (`160000`) is not one. The one copy
 * every reader of a listing filters by (`check.ts`, `review.ts`, `census.ts`). */
export const BLOB_MODES: ReadonlySet<string> = new Set(['100644', '100755', '120000']);

export interface TreeEntry {
  readonly path: string;
  readonly mode: string;
  readonly id: string;
}
export interface VerifiedBlob extends TreeEntry {
  readonly bytes: Uint8Array;
}
export interface PinnedObjectReader {
  readonly revision: string;
  readonly algorithm: HashAlgorithm;
  /** The pinned commit's tree identifier, the commit re-hashed. */
  tree(): Promise<string>;
  /** Each path's blob at the pinned revision (a regular file or a symbolic link's target), every object from the commit down
   * re-hashed. One refusal refuses the whole call. */
  readBlobs(paths: readonly string[]): Promise<readonly VerifiedBlob[]>;
  /** Every non-tree entry under the pinned commit's tree, by path in tree order, every tree re-hashed (blobs are not read). Not
   * every entry is a readable blob: a submodule (mode `160000`) lists its commit identifier, and `readBlobs` refuses it. */
  listTree(): Promise<readonly TreeEntry[]>;
  /** What the object store holds beside the pinned revision: the pinned commit's parents, from its re-hashed body, and every
   * identifier the store names that is neither the pinned commit nor a tree or blob under its tree. */
  inventory(): Promise<StoreInventory>;
}

/** The store's identifiers are the names it gives: each loose object's file name and each pack index entry, counted without reading
 * the object. A pack entry its `.idx` omits, or an object only an alternate would supply, is not named and not counted. Submodule
 * entries name commits of another repository and are not reachable here. */
export interface StoreInventory {
  readonly parents: readonly string[];
  /** Distinct identifiers the store names. */
  readonly stored: number;
  /** The pinned commit, and each distinct tree and blob under its tree. */
  readonly reachable: number;
  /** Stored identifiers outside the reachable set: their count, and the first ten in identifier order. */
  readonly beyondCount: number;
  readonly beyond: readonly string[];
}

export interface PinnedObjectReaderOptions {
  /** The clone's `.git` directory. A `.git` file (a gitdir pointer) is refused, never followed. */
  readonly gitDir: string;
  /** The consented revision: the full commit identifier the in-force observation consent names. */
  readonly revision: string;
  /** Largest object, inflated, the reader will hold. Default 1 GiB. */
  readonly maxObjectBytes?: number;
  /** Longest delta chain resolved. Default 1,000 (git's default `pack.depth` is 50 and its maximum 4,095). */
  readonly maxDeltaChainDepth?: number;
  /** Stored bytes inflated, plus the bytes they inflate to and the bytes deltas produce, summed over one call. Default 4 GiB. */
  readonly maxInflatedBytesPerCall?: number;
  /** Objects read (each delta base counted) plus tree entries listed, over one call. Default 1,000,000. */
  readonly maxObjectsPerCall?: number;
}

interface Limits { readonly objectBytes: number; readonly chainDepth: number; readonly callBytes: number; readonly callObjects: number }

export function openPinnedObjectReader(options: PinnedObjectReaderOptions): PinnedObjectReader {
  const algorithm = hashAlgorithmOf(options.revision);
  const revision = options.revision;
  const limits: Limits = {
    objectBytes: options.maxObjectBytes ?? 2 ** 30, chainDepth: options.maxDeltaChainDepth ?? 1_000,
    callBytes: options.maxInflatedBytesPerCall ?? 2 ** 32, callObjects: options.maxObjectsPerCall ?? 1_000_000,
  };
  const step = async <T>(body: (walk: Walk) => Promise<T>): Promise<T> => {
    let store: ObjectStore | null = null;
    try {
      store = await ObjectStore.open(options.gitDir, algorithm, limits);
      return await body(new Walk(store, revision));
    } catch (e) {
      if (e instanceof GitObjectReadRefusal) throw e;
      const code = errorCode(e);
      if (typeof code === 'string' && /^E[A-Z0-9]+$/.test(code)) return refuse('store-unreadable', `the object store could not be read (${code})`);
      return refuse('reader-fault', `the reader failed (${e instanceof Error ? e.name : 'unknown error'}), a defect of the reader and not of the store`);
    } finally {
      await store?.close().catch(() => undefined);
    }
  };
  return {
    revision, algorithm,
    tree: () => step(walk => walk.rootTree()),
    readBlobs: paths => step(async walk => {
      const out: VerifiedBlob[] = [];
      for (const p of paths) out.push(await walk.blob(p));
      return out;
    }),
    listTree: () => step(async walk => walk.list(await walk.rootTree(), '')),
    inventory: () => step(async walk => {
      const parents = await walk.parents();
      const reachable = await walk.reachable();
      const stored = await walk.storedIds();
      const beyond = [...stored].filter(id => !reachable.has(id)).sort();
      return { parents, stored: stored.size, reachable: reachable.size, beyondCount: beyond.length, beyond: beyond.slice(0, 10) };
    }),
  };
}

const HEX = { sha1: 40, sha256: 64 } as const;
/** The most path segments the reader walks: git's own `core.maxTreeDepth` default, past which git refuses a tree. */
const MAX_TREE_DEPTH = 4096;

/** One call's walk from the pinned commit. The commit and trees verified during the call are reused within it, never across calls. */
class Walk {
  private readonly trees = new Map<string, readonly RawEntry[]>();
  private root: Promise<string> | null = null;
  constructor(private readonly store: ObjectStore, private readonly revision: string) {}

  rootTree(): Promise<string> {
    this.root ??= this.readRoot();
    return this.root;
  }

  private async readRoot(): Promise<string> {
    const body = await this.store.verified(this.revision, 'commit', null);
    const text = Buffer.from(body).toString('latin1');
    const tree = new RegExp(`^tree ([0-9a-f]{${HEX[this.store.algorithm]}})\n`).exec(text);
    return tree === null ? refuse('malformed-commit', `commit ${this.revision} does not open with a tree line in the consented hash`, this.revision) : tree[1]!;
  }

  /** The pinned commit's parents: the `parent` lines that follow its tree line, in order, from its re-hashed body. */
  async parents(): Promise<string[]> {
    await this.rootTree();
    const text = Buffer.from(await this.store.verified(this.revision, 'commit', null)).toString('latin1');
    const header = text.slice(0, text.indexOf('\n\n') < 0 ? text.length : text.indexOf('\n\n'));
    const out: string[] = [];
    const line = new RegExp(`^parent ([0-9a-f]{${HEX[this.store.algorithm]}})$`);
    for (const row of header.split('\n').slice(1)) {
      const m = line.exec(row);
      if (m === null) break;
      out.push(m[1]!);
    }
    return out;
  }

  /** The pinned commit and each distinct tree and blob under its tree, every tree re-hashed. Submodule entries are left out. */
  async reachable(): Promise<Set<string>> {
    const out = new Set<string>([this.revision]);
    const visit = async (tree: string, at: string | null, depth: number): Promise<void> => {
      if (out.has(tree)) return;
      out.add(tree);
      for (const e of await this.tree(tree, at)) {
        const p = at === null ? e.name : `${at}/${e.name}`;
        this.store.count(e.id, p);
        if (e.mode === '160000') continue;
        if (e.mode !== '40000') { out.add(e.id); continue; }
        if (depth >= MAX_TREE_DEPTH) refuse('malformed-tree', `tree ${tree} nests trees deeper than git's core.maxTreeDepth (${MAX_TREE_DEPTH})`, tree);
        await visit(e.id, p, depth + 1);
      }
    };
    await visit(await this.rootTree(), null, 1);
    return out;
  }

  storedIds(): Promise<Set<string>> {
    return this.store.ids();
  }

  async blob(target: string): Promise<VerifiedBlob> {
    const segments = target.split('/');
    if (target === '' || segments.some(s => s === '' || s === '.' || s === '..' || s.includes('\0'))) {
      refuse('malformed-path', `"${target}" is not a relative path of non-empty segments`, null, target);
    }
    if (segments.length > MAX_TREE_DEPTH) refuse('malformed-path', `a path of ${segments.length} segments is deeper than git's core.maxTreeDepth (${MAX_TREE_DEPTH})`, null, target);
    let tree = await this.rootTree(), at = '';
    for (const [i, name] of segments.entries()) {
      at = i === 0 ? name : `${at}/${name}`;   // built once per segment: linear in the path's length
      const entry = (await this.tree(tree, at)).find(e => e.name === name);
      if (entry === undefined) return refuse('path-not-found', `${at} is not in the tree at ${this.revision}`, tree, target);
      const last = i === segments.length - 1;
      if (!last) {
        if (entry.mode !== '40000') return refuse('path-not-found', `${at} is not a directory at ${this.revision}`, entry.id, target);
        tree = entry.id;
        continue;
      }
      if (entry.mode === '40000' || entry.mode === '160000') return refuse('not-a-blob', `${target} is a ${entry.mode === '40000' ? 'directory' : 'submodule'}, not a file`, entry.id, target);
      return { path: target, mode: entry.mode, id: entry.id, bytes: await this.store.verified(entry.id, 'blob', target) };
    }
    return refuse('malformed-path', `"${target}" names nothing`, null, target);
  }

  /** Appends every non-tree entry under `tree` to `out`, one at a time: a subtree's entries are never spread as call arguments. */
  async list(tree: string, prefix: string, out: TreeEntry[] = [], depth = 1): Promise<TreeEntry[]> {
    for (const e of await this.tree(tree, prefix === '' ? null : prefix)) {
      const p = prefix === '' ? e.name : `${prefix}/${e.name}`;
      this.store.count(e.id, p);
      if (e.mode === '40000' && depth >= MAX_TREE_DEPTH) refuse('malformed-tree', `tree ${tree} nests trees deeper than git's core.maxTreeDepth (${MAX_TREE_DEPTH})`, tree);
      if (e.mode === '40000') await this.list(e.id, p, out, depth + 1);
      else out.push({ path: p, mode: e.mode, id: e.id });
    }
    return out;
  }

  private async tree(id: string, at: string | null): Promise<readonly RawEntry[]> {
    const known = this.trees.get(id);
    if (known !== undefined) return known;
    const entries = parseTree(await this.store.verified(id, 'tree', at), id, this.store.algorithm);
    this.trees.set(id, entries);
    return entries;
  }
}

interface RawEntry { readonly mode: string; readonly name: string; readonly id: string }
const NAME = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
/** The modes git writes: a file, an executable, a symbolic link, a tree, a submodule, and the group-writable file git once wrote and
 * fsck still accepts. */
const MODES: ReadonlySet<string> = new Set(['100644', '100755', '120000', '40000', '160000', '100664']);
/** The code points HFS+ ignores when it compares names (git's `is_hfs_dotgit`). */
const HFS_IGNORED = /[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/g;
/** Whether some filesystem reads `name` as `.git`: HFS+ ignoring case and its ignored code points, or NTFS in any
 * backslash-separated component, `.git` or `git~1` followed by dots or spaces and then a `:` stream name or nothing. */
const isDotGit = (name: string): boolean =>
  name.replace(HFS_IGNORED, '').toLowerCase() === '.git' || name.toLowerCase().split('\\').some(c => /^(?:\.git|git~1)[. ]*(?::|$)/.test(c));
function parseTree(body: Uint8Array, id: string, algorithm: HashAlgorithm): RawEntry[] {
  const width = HEX[algorithm] / 2, buf = Buffer.from(body), out: RawEntry[] = [], names = new Set<string>();
  let at = 0;
  while (at < buf.length) {
    const space = buf.indexOf(0x20, at), nul = space < 0 ? -1 : buf.indexOf(0, space);
    if (space < 0 || nul < 0 || nul + 1 + width > buf.length) refuse('malformed-tree', `tree ${id} has a truncated entry`, id);
    const mode = buf.toString('latin1', at, space);
    let name = '';
    try { name = NAME.decode(buf.subarray(space + 1, nul)); } catch { refuse('malformed-tree', `tree ${id} has an entry name that is not UTF-8`, id); }
    if (!MODES.has(mode)) refuse('malformed-tree', `tree ${id} has an entry of a mode git does not write`, id);
    if (name === '' || name.includes('/')) refuse('malformed-tree', `tree ${id} has an entry name that is empty or holds a slash`, id);
    if (name === '.' || name === '..' || isDotGit(name)) refuse('malformed-tree', `tree ${id} has an entry named ., .. or .git`, id);
    if (names.has(name)) refuse('malformed-tree', `tree ${id} names one entry twice`, id);
    names.add(name);
    out.push({ mode, name, id: buf.toString('hex', nul + 1, nul + 1 + width) });
    at = nul + 1 + width;
  }
  return out;
}

const PACK_TYPES: Readonly<Record<number, GitObjectType>> = { 1: 'commit', 2: 'tree', 3: 'blob', 4: 'tag' };
const OFS_DELTA = 6, REF_DELTA = 7;
const OPEN_FLAGS = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;

interface PackIndex { readonly name: string; readonly ids: Buffer; readonly offsets: readonly number[]; readonly count: number }
interface Pack { readonly fh: FileHandle; readonly size: number }
type RawObject = { readonly type: GitObjectType; readonly body: Uint8Array };

const errorCode = (e: unknown): unknown => (e as { code?: unknown } | null)?.code;
/** `inflateSync` with `info: true`: the output, and the stored bytes the stream took (`bytesWritten`), which stops at its end. */
type Inflated = { readonly buffer: Buffer; readonly engine: { readonly bytesWritten: number } };
/** The most bytes a stored (zlib-wrapped) form of an inflated size may take: incompressible input grows a little. */
const storedBound = (inflated: number): number => inflated + Math.floor(inflated / 8) + 1024;

/** The clone's own object store, read once per call: loose objects first, then packs in name order. Nothing else under `.git`. */
class ObjectStore {
  private readonly handles = new Map<string, Pack>();
  private inflatedBytes = 0;
  private objectsVisited = 0;
  private constructor(
    private readonly gitDir: string,
    private readonly objects: string | null,
    readonly algorithm: HashAlgorithm,
    private readonly packs: readonly PackIndex[],
    private readonly limits: Limits,
    private readonly alternatesPresent: boolean,
  ) {}

  static async open(gitDir: string, algorithm: HashAlgorithm, limits: Limits): Promise<ObjectStore> {
    let isDir = false;
    try { isDir = (await lstat(gitDir)).isDirectory(); } catch { isDir = false; }
    if (!isDir) refuse('not-a-git-directory', `${gitDir} is not a directory; a gitdir pointer file is never followed`);
    const objects = path.join(gitDir, 'objects'), packDir = path.join(objects, 'pack');
    if (!(await realDirectory(gitDir, objects))) return new ObjectStore(gitDir, null, algorithm, [], limits, false);
    const names = (await realDirectory(gitDir, packDir)) ? (await readdir(packDir)).filter(n => n.endsWith('.idx')).sort() : [];
    const packs: PackIndex[] = [];
    for (const name of names) {
      const fh = await openRegular(gitDir, path.join(packDir, name));
      if (fh === null) refuse('invalid-pack-index', `${name} vanished while being read`);
      try { packs.push(parseIndex(await fh!.readFile(), name.slice(0, -4), algorithm)); } finally { await fh!.close(); }
    }
    let alternatesPresent = false;
    try { alternatesPresent = (await lstat(path.join(objects, 'info', 'alternates'))).isFile(); } catch { alternatesPresent = false; }
    return new ObjectStore(gitDir, objects, algorithm, packs, limits, alternatesPresent);
  }

  async close(): Promise<void> {
    for (const h of this.handles.values()) await h.fh.close();
    this.handles.clear();
  }

  /** Every identifier the store names: each loose object's fan-out directory and file name, and each entry of each pack index, each
   * counted against the call's budget. No object is read. Any other name under `objects/` is not an object and is passed over. */
  async ids(): Promise<Set<string>> {
    const out = new Set<string>();
    if (this.objects === null) return out;
    const rest = new RegExp(`^[0-9a-f]{${HEX[this.algorithm] - 2}}$`);
    for (const fan of (await readdir(this.objects)).filter(n => /^[0-9a-f]{2}$/.test(n)).sort()) {
      if (!(await realDirectory(this.gitDir, path.join(this.objects, fan)))) continue;
      for (const name of (await readdir(path.join(this.objects, fan))).filter(n => rest.test(n))) {
        this.count(`${fan}${name}`, null);
        out.add(`${fan}${name}`);
      }
    }
    const width = HEX[this.algorithm] / 2;
    for (const pack of this.packs) {
      for (let k = 0; k < pack.count; k += 1) {
        const id = pack.ids.subarray(k * width, (k + 1) * width).toString('hex');
        this.count(id, null);
        out.add(id);
      }
    }
    return out;
  }

  /** Counts one object read or tree entry listed against the call's budget. */
  count(id: string, at: string | null): void {
    this.objectsVisited += 1;
    if (this.objectsVisited > this.limits.callObjects) refuse('budget-exceeded', `this call reads or lists more than ${this.limits.callObjects} objects and entries`, id, at);
  }

  private charge(bytes: number, id: string, at: string | null): void {
    this.inflatedBytes += bytes;
    if (this.inflatedBytes > this.limits.callBytes) refuse('budget-exceeded', `${id}: this call would inflate or produce more than ${this.limits.callBytes} bytes`, id, at);
  }

  /** The body of object `id`, which must be of `type` and hash, with its header, to `id` under the consented algorithm. */
  async verified(id: string, type: GitObjectType, at: string | null): Promise<Uint8Array> {
    const object = await this.raw(id, at);
    const actual = createHash(this.algorithm).update(`${object.type} ${object.body.length}\0`).update(object.body).digest('hex');
    if (actual !== id) refuse('identifier-mismatch', `the object read as ${id} hashes to another identifier`, id, at);
    if (object.type !== type) refuse('type-mismatch', `${id} is a ${object.type}, not a ${type}`, id, at);
    return object.body;
  }

  private async raw(id: string, at: string | null): Promise<RawObject> {
    const stored = await this.looseStored(id, at);
    if (stored !== null) return this.loose(stored, id, at);
    for (const pack of this.packs) {
      const offset = lookup(pack, id, this.algorithm);
      if (offset !== null) return this.packed(pack, offset, id, at, 0);
    }
    const why = this.alternatesPresent ? '; objects/info/alternates is present and is never followed' : '';
    return refuse('object-missing', `${id} is in neither a loose object nor a pack of this clone${why}`, id, at);
  }

  /** The stored bytes of loose object `id`, or null when there is none. */
  private async looseStored(id: string, at: string | null): Promise<Buffer | null> {
    if (this.objects === null) return null;
    const dir = path.join(this.objects, id.slice(0, 2));
    if (!(await realDirectory(this.gitDir, dir))) return null;
    const fh = await openRegular(this.gitDir, path.join(dir, id.slice(2)));
    if (fh === null) return null;
    try {
      if ((await fh.stat()).size > storedBound(this.limits.objectBytes)) refuse('corrupt-object', `loose object ${id} is larger stored than any object the reader holds`, id, at);
      return await fh.readFile();
    } finally { await fh.close(); }
  }

  private loose(stored: Buffer, id: string, at: string | null): RawObject {
    this.count(id, at);
    let inflated: Buffer, consumed: number;
    try {
      ({ buffer: inflated, engine: { bytesWritten: consumed } } = inflateSync(stored, { maxOutputLength: this.limits.objectBytes + 64, info: true }) as unknown as Inflated);
    } catch { return refuse('corrupt-object', `loose object ${id} does not inflate`, id, at); }
    this.charge(stored.length + inflated.length, id, at);
    if (consumed !== stored.length) refuse('corrupt-object', `loose object ${id} has bytes after its zlib stream`, id, at);
    if (stored.length > storedBound(inflated.length)) refuse('corrupt-object', `loose object ${id} is stored in more bytes than git writes for its size`, id, at);
    const nul = inflated.indexOf(0);
    const header = /^(commit|tree|blob|tag) (0|[1-9][0-9]*)$/.exec(nul < 0 ? '' : inflated.toString('latin1', 0, nul));
    if (header === null || Number(header[2]) !== inflated.length - nul - 1) return refuse('corrupt-object', `loose object ${id} has a malformed header`, id, at);
    return { type: header[1] as GitObjectType, body: inflated.subarray(nul + 1) };
  }

  private async packed(pack: PackIndex, offset: number, id: string, at: string | null, depth: number): Promise<RawObject> {
    if (depth > this.limits.chainDepth) refuse('budget-exceeded', `${id} has a delta chain longer than ${this.limits.chainDepth}`, id, at);
    this.count(id, at);
    const { fh, size: end } = await this.handle(pack);
    if (offset < 12 || offset >= end) refuse('invalid-pack-index', `${id}: ${pack.name}.idx gives an offset outside its pack`, id, at);
    const head = await readAt(fh, offset, 32 + HEX[this.algorithm] / 2);
    let c = head[0]!, i = 1, size = c & 0x0f, shift = 4;
    const kind = (c >> 4) & 7;
    while (c & 0x80) {
      if (i >= head.length) refuse('corrupt-object', `${id}: pack entry header too long in ${pack.name}`, id, at);
      c = head[i++]!; size += (c & 0x7f) * 2 ** shift; shift += 7;
    }
    if (size > this.limits.objectBytes) refuse('corrupt-object', `${id}: pack entry declares ${size} bytes`, id, at);
    if (kind in PACK_TYPES) return { type: PACK_TYPES[kind]!, body: await this.inflateAt(fh, end, offset + i, size, id, at) };
    let base: RawObject;
    if (kind === OFS_DELTA) {
      c = head[i++]!;
      let back = c & 0x7f;
      while (c & 0x80) {
        if (i >= head.length) refuse('corrupt-object', `${id}: delta offset too long in ${pack.name}`, id, at);
        c = head[i++]!; back = (back + 1) * 128 + (c & 0x7f);
      }
      if (back <= 0 || back > offset - 12) refuse('corrupt-object', `${id}: delta base offset out of range in ${pack.name}`, id, at);
      base = await this.packed(pack, offset - back, id, at, depth + 1);
    } else if (kind === REF_DELTA) {
      const width = HEX[this.algorithm] / 2, baseId = head.toString('hex', i, i + width);
      i += width;
      base = await this.rawForDelta(baseId, id, at, depth);
    } else {
      return refuse('corrupt-object', `${id}: pack entry of unknown type ${kind} in ${pack.name}`, id, at);
    }
    const delta = await this.inflateAt(fh, end, offset + i, size, id, at);
    return { type: base.type, body: applyDelta(base.body, delta, id, at, this.limits.objectBytes, n => this.charge(n, id, at)) };
  }

  private async rawForDelta(baseId: string, id: string, at: string | null, depth: number): Promise<RawObject> {
    for (const pack of this.packs) {
      const offset = lookup(pack, baseId, this.algorithm);
      if (offset !== null) return this.packed(pack, offset, id, at, depth + 1);
    }
    const stored = await this.looseStored(baseId, at);
    if (stored !== null) return this.loose(stored, baseId, at);
    return refuse('object-missing', `${id}: delta base ${baseId} is not in this clone`, id, at);
  }

  /** The `size` bytes the pack entry's zlib stream at `start` inflates to. git writes no stream longer than `storedBound(size)`, so
   * that much is read, once, and a stream that needs more refuses: padding cannot make a read longer or repeat it. */
  private async inflateAt(fh: FileHandle, end: number, start: number, size: number, id: string, at: string | null): Promise<Buffer> {
    this.charge(size, id, at);
    const chunk = await readAt(fh, start, Math.min(storedBound(size), end - start));
    let out: Buffer, consumed: number;
    try {
      ({ buffer: out, engine: { bytesWritten: consumed } } = inflateSync(chunk, { maxOutputLength: size + 1, info: true }) as unknown as Inflated);
    } catch { return refuse('corrupt-object', `${id}: pack entry does not inflate within the ${storedBound(size)} stored bytes git writes for its size`, id, at); }
    this.charge(consumed, id, at);
    if (out.length !== size) refuse('corrupt-object', `${id}: pack entry inflates to ${out.length} bytes, not the ${size} it declares`, id, at);
    return out;
  }

  private async handle(pack: PackIndex): Promise<Pack> {
    let open_ = this.handles.get(pack.name);
    if (open_ === undefined) {
      const fh = await openRegular(this.gitDir, path.join(this.objects!, 'pack', `${pack.name}.pack`));
      if (fh === null) return refuse('invalid-pack-index', `${pack.name}.idx has no readable pack`);
      open_ = { fh, size: (await fh.stat()).size };
      this.handles.set(pack.name, open_);
    }
    return open_;
  }
}

/** Whether `dir` is a directory, reached without following a symbolic link at its last step. Absent is false; a link, a file or a
 * special file refuses. */
async function realDirectory(gitDir: string, dir: string): Promise<boolean> {
  let stat;
  try { stat = await lstat(dir); } catch (e) { if (errorCode(e) === 'ENOENT') return false; throw e; }
  if (!stat.isDirectory()) refuse('unsafe-store-entry', `${path.relative(gitDir, dir)} is not a directory; nothing under .git is read through a symbolic link`);
  return true;
}

/** `file` opened for reading if it is a regular file reached without a symbolic link; null when absent. A link (refused by
 * `O_NOFOLLOW`), a directory or a special file (refused after opening; `O_NONBLOCK` keeps a FIFO from blocking the open) refuses. */
async function openRegular(gitDir: string, file: string): Promise<FileHandle | null> {
  const rel = path.relative(gitDir, file);
  let fh: FileHandle;
  try { fh = await open(file, OPEN_FLAGS); } catch (e) {
    if (errorCode(e) === 'ENOENT') return null;
    if (errorCode(e) === 'ELOOP') return refuse('unsafe-store-entry', `${rel} is a symbolic link, never followed`);
    throw e;
  }
  let regular = false;
  try { regular = (await fh.stat()).isFile(); } finally { if (!regular) await fh.close(); }
  return regular ? fh : refuse('unsafe-store-entry', `${rel} is not a regular file`);
}

async function readAt(fh: FileHandle, offset: number, length: number): Promise<Buffer> {
  const buf = Buffer.alloc(Math.max(0, length));
  const { bytesRead } = await fh.read(buf, 0, buf.length, offset);
  return buf.subarray(0, bytesRead);
}

/** A version-2 pack index whose identifiers are as wide as the consented algorithm's; any other shape refuses (an index in
 * another hash does not fit the size equation). */
function parseIndex(idx: Buffer, name: string, algorithm: HashAlgorithm): PackIndex {
  const width = HEX[algorithm] / 2;
  const bad = (why: string): never => refuse('invalid-pack-index', `${name}.idx is not a version-2 ${algorithm} pack index: ${why}`);
  if (idx.length < 8 + 1024 || idx.readUInt32BE(0) !== 0xff744f63 || idx.readUInt32BE(4) !== 2) bad('bad header');
  const count = idx.readUInt32BE(8 + 255 * 4), idsAt = 8 + 1024, offsetsAt = idsAt + count * (width + 4), largeAt = offsetsAt + count * 4;
  if (largeAt > idx.length) bad('truncated');
  const small = Array.from({ length: count }, (_, k) => idx.readUInt32BE(offsetsAt + k * 4));
  const large = small.filter(o => o & 0x80000000).length;
  if (idx.length !== largeAt + large * 8 + 2 * width) bad(`size ${idx.length} fits no ${count}-entry index`);
  if (small.some(o => o & 0x80000000 && (o & 0x7fffffff) >= large)) bad('a large offset lies past the large-offset table');
  const offsets = small.map(o => (o & 0x80000000 ? Number(idx.readBigUInt64BE(largeAt + (o & 0x7fffffff) * 8)) : o));
  return { name, ids: idx.subarray(idsAt, idsAt + count * width), offsets, count };
}

function lookup(pack: PackIndex, id: string, algorithm: HashAlgorithm): number | null {
  const width = HEX[algorithm] / 2, want = Buffer.from(id, 'hex');
  let lo = 0, hi = pack.count - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, cmp = Buffer.compare(pack.ids.subarray(mid * width, (mid + 1) * width), want);
    if (cmp === 0) return pack.offsets[mid]!;
    if (cmp < 0) lo = mid + 1; else hi = mid - 1;
  }
  return null;
}

function applyDelta(base: Uint8Array, delta: Buffer, id: string, at: string | null, maxObjectBytes: number, charge: (bytes: number) => void): Buffer {
  let i = 0;
  const varint = (): number => {
    let value = 0, shift = 0, c: number;
    do {
      if (i >= delta.length) refuse('corrupt-object', `${id}: truncated delta header`, id, at);
      c = delta[i++]!; value += (c & 0x7f) * 2 ** shift; shift += 7;
    } while (c & 0x80);
    return value;
  };
  const sourceSize = varint(), targetSize = varint();
  if (sourceSize !== base.length) refuse('corrupt-object', `${id}: delta expects a ${sourceSize}-byte base, got ${base.length}`, id, at);
  if (targetSize > maxObjectBytes) refuse('corrupt-object', `${id}: delta declares ${targetSize} bytes`, id, at);
  charge(targetSize);
  const out = Buffer.alloc(targetSize);
  let o = 0;
  while (i < delta.length) {
    const op = delta[i++]!;
    if (op & 0x80) {
      let from = 0, n = 0;
      for (let b = 0; b < 4; b += 1) if (op & (1 << b)) from += delta[i++]! * 2 ** (8 * b);
      for (let b = 0; b < 3; b += 1) if (op & (0x10 << b)) n += delta[i++]! * 2 ** (8 * b);
      if (n === 0) n = 0x10000;
      if (i > delta.length || from + n > base.length || o + n > targetSize) refuse('corrupt-object', `${id}: delta copy out of range`, id, at);
      out.set(base.subarray(from, from + n), o); o += n;
    } else if (op !== 0) {
      if (i + op > delta.length || o + op > targetSize) refuse('corrupt-object', `${id}: delta insert out of range`, id, at);
      delta.copy(out, o, i, i + op); i += op; o += op;
    } else {
      refuse('corrupt-object', `${id}: delta opcode 0 is reserved`, id, at);
    }
  }
  if (o !== targetSize) refuse('corrupt-object', `${id}: delta yields ${o} bytes, not the ${targetSize} it declares`, id, at);
  return out;
}
