import * as fs from 'node:fs';
import * as path from 'node:path';

/** What a launch reads of the operator's clone, in process, before any object (REQ-polaris-generation-047's closed list, which the
 * source-acquisition registry entry v1.1's `readAuthority` repeats as reads (1) to (5)), with no process run and nothing honoured.
 *
 * "the reads Syzygy itself makes, in process, of the operator's clone SHALL be only these":
 * - (1) "the `.git` file or directory and the files that locate the Git directory and the common Git directory": `.git` is `lstat`ed, and
 *   a `.git` that is a file (a gitdir pointer) or a symbolic link is refused, never followed, as `clone-head.ts` refuses it;
 * - (2) "the names of its references, and the values of `HEAD` and the reference it names, of the references the trunk rule above names,
 *   of the local branch of the remote default's name and of the reference `--revision` names, each read as file data from the loose
 *   reference files and `packed-refs`, where reading `packed-refs` also reads the bytes of other references' values, which Syzygy SHALL
 *   use for nothing; a clone that stores its references otherwise (the reftable backend) SHALL be refused before any Git process starts":
 *   the loose tree under `refs/` is listed by name and only the admitted files are opened; `packed-refs` is read whole, and only the
 *   admitted names' rows are taken from it;
 * - (3) "its configuration file, read as text only for its remotes' names and URLs, its object format (`extensions.objectFormat`) and,
 *   to locate its repository's working trees, `core.bare` and `core.worktree`, and never honoured": `parseConfig`;
 * - (4) "whether `objects/info/alternates` exists": `lstat`, never opened.
 * Read (5), the object identifiers for an abbreviated `--revision` alone, is `launch-revision.ts`'s.
 *
 * Which reference values are admitted is decided in stages, each from what the earlier stages admitted: HEAD; then the reference HEAD
 * names and `refs/remotes/origin/HEAD`; where origin records no default (its HEAD absent or not symbolic), every other
 * `refs/remotes/<remote>/HEAD` (the trunk rule must then read each to tell which remotes record a default); then the remote
 * default's target and the local branch of its name, or, where no remote records a default, `refs/heads/main` and `refs/heads/master`;
 * then the reference `--revision` names. [Inferred] `main` and `master` are read only where the trunk rule consults them: "While a remote
 * default is recorded, no local branch is consulted for the pin". A symbolic value is followed only to a reference whose value is itself
 * admitted. Every file is read with `lstat` first and opened with `O_NOFOLLOW`; a symbolic link is refused, never followed, and each read is
 * bounded. A reftable clone is told by the placeholder `ref: refs/heads/.invalid` Git writes to its HEAD, a value read (2) admits; no
 * other path is examined for it. All of this lies within the agent sessions' write reach, so every value read here is a claim: the pinned revision is re-hashed
 * by the object reader, and the URL is a locator hint labelled Inferred. */

export type RefValue = { readonly kind: 'oid'; readonly oid: string } | { readonly kind: 'symbolic'; readonly target: string };

/** A remote and its one URL; `url` is null where the remote has no single non-empty `url` line (none, an empty one, or several, `urlLines`
 * of them), which the identity rule cannot read: such a remote is kept, named, so that the rule never falls through to another remote
 * (R-PDJA-33-SLICE-C-1 finding 6). */
export interface CloneRemote { readonly name: string; readonly url: string | null; readonly urlLines?: number }

export interface CloneSnapshot {
  readonly gitDir: string;
  /** HEAD as the clone records it. */
  readonly head: RefValue;
  /** The name of every reference under `refs/`, loose or packed. Names only: no value is read for them. */
  readonly names: ReadonlySet<string>;
  /** The values of the admitted references alone, loose files overriding `packed-refs`, by full name. */
  readonly refs: ReadonlyMap<string, RefValue>;
  /** Each `[remote "<name>"]` section's `url`, in file order; a remote with no url, or several, is left out. */
  readonly remotes: readonly CloneRemote[];
  /** `extensions.objectFormat` as the configuration records it; `sha1` where it records none. */
  readonly objectFormat: string;
  /** Whether `objects/info/alternates` exists (read (4)); the file is never opened. */
  readonly alternates: boolean;
  /** `core.bare` and `core.worktree` as the configuration writes them (read (3)), never honoured; null where unset. */
  readonly bare: string | null;
  readonly worktree: string | null;
}

export type CloneSnapshotRead = { readonly ok: true; readonly snapshot: CloneSnapshot } | { readonly ok: false; readonly reason: string; readonly reftable?: true };

const MAX_REF_BYTES = 4096;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_REFS = 100_000;
const OBJECT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const REF_NAME = /^refs\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;
/** The placeholder Git writes to HEAD in a reftable repository, so that a files-backend reader sees no branch. */
const REFTABLE_HEAD = 'refs/heads/.invalid';
const ORIGIN_HEAD = 'refs/remotes/origin/HEAD';

const code = (cause: unknown): string => (cause as NodeJS.ErrnoException).code ?? 'unknown-error';

/** One file's bytes as text, read through one descriptor opened without following a link, or null when it does not exist. */
function readBounded(file: string, limit: number): { readonly text: string } | { readonly reason: string } | null {
  let stats: fs.Stats;
  try { stats = fs.lstatSync(file); } catch (cause) { return code(cause) === 'ENOENT' ? null : { reason: `${file} cannot be read (${code(cause)})` }; }
  if (!stats.isFile()) return { reason: `${file} is not a regular file; it is refused, never followed` };
  if (stats.size > limit) return { reason: `${file} is larger than ${limit} bytes` };
  let fd: number;
  try { fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW); } catch (cause) { return { reason: `${file} cannot be read (${code(cause)})` }; }
  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile()) return { reason: `${file} is not a regular file; it is refused, never followed` };
    if (opened.size > limit) return { reason: `${file} is larger than ${limit} bytes` };
    const buffer = Buffer.alloc(opened.size + 1);
    let filled = 0;
    for (;;) {
      const n = fs.readSync(fd, buffer, filled, buffer.length - filled, null);
      if (n === 0) break;
      filled += n;
      if (filled > limit) return { reason: `${file} is larger than ${limit} bytes` };
      if (filled === buffer.length) return { reason: `${file} grew while being read` };
    }
    return { text: buffer.subarray(0, filled).toString('utf8') };
  } catch (cause) {
    return { reason: `${file} cannot be read (${code(cause)})` };
  } finally {
    fs.closeSync(fd);
  }
}

/** A ref file's value, or why it is not one. */
export function parseRefValue(text: string): RefValue | null {
  const line = text.endsWith('\n') ? text.slice(0, -1) : text;
  if (OBJECT_ID.test(line)) return { kind: 'oid', oid: line };
  const symbolic = /^ref: (\S+)$/.exec(line);
  if (symbolic !== null && validRefName(symbolic[1]!)) return { kind: 'symbolic', target: symbolic[1]! };
  return null;
}

export const validRefName = (name: string): boolean =>
  REF_NAME.test(name) && !name.split('/').some(part => part === '.' || part === '..' || part.endsWith('.lock'));

export interface CloneConfig {
  readonly remotes: readonly CloneRemote[];
  readonly objectFormat: string;
  /** `core.bare` and `core.worktree` as written (the last of each), to locate the repository's working trees; null where unset. */
  readonly bare: string | null;
  readonly worktree: string | null;
}

/** Read (3): each remote's url, and `extensions.objectFormat`, from the clone's `config`, as text. Section and key names are matched
 * without regard to case, as Git spells them; a subsection name (the remote's) is matched exactly. A line continued with a backslash,
 * or an include, is not followed (a remote is then read from what the file says on its own lines). No other key is used. */
export function parseConfig(config: string): CloneConfig {
  const urls = new Map<string, string[]>();
  let section: { readonly kind: 'remote'; readonly name: string } | { readonly kind: 'extensions' } | { readonly kind: 'core' } | null = null;
  let objectFormat: string | null = null, bare: string | null = null, worktree: string | null = null;
  for (const raw of config.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('[')) {
      const remote = /^\[remote "([^"\\\n]+)"\]$/i.exec(line);
      if (remote !== null) {
        section = { kind: 'remote', name: remote[1]! };
        if (!urls.has(remote[1]!)) urls.set(remote[1]!, []);
      } else section = /^\[extensions\]$/i.test(line) ? { kind: 'extensions' } : /^\[core\]$/i.test(line) ? { kind: 'core' } : null;
      continue;
    }
    if (section === null) continue;
    if (section.kind === 'remote') {
      const kv = /^url\s*=\s*(.*)$/i.exec(line);
      if (kv !== null) urls.get(section.name)!.push(kv[1]!.replace(/^"(.*)"$/, '$1').trim());
    } else if (section.kind === 'core') {
      const kv = /^(bare|worktree)\s*=\s*(.*)$/i.exec(line);
      if (kv !== null) {
        const value = kv[2]!.replace(/^"(.*)"$/, '$1').trim();
        if (kv[1]!.toLowerCase() === 'bare') bare = value; else worktree = value;
      }
    } else {
      const kv = /^objectformat\s*=\s*(.*)$/i.exec(line);
      if (kv !== null) objectFormat = kv[1]!.replace(/^"(.*)"$/, '$1').trim();
    }
  }
  return {
    remotes: [...urls].map(([name, list]): CloneRemote => (list.length === 1 && list[0] !== '' ? { name, url: list[0]! } : { name, url: null, urlLines: list.length })),
    objectFormat: objectFormat ?? 'sha1',
    bare,
    worktree,
  };
}

/** Each remote's url (read (3), the remotes alone). */
export const parseRemotes = (config: string): readonly CloneRemote[] => parseConfig(config).remotes;

/** The candidate references a `--revision` name may be, in the order Git tries a short name. Git's first rule, the name itself in the
 * Git directory, is taken for `HEAD` alone, whose value read (2) admits (R-PDJA-33-SLICE-A-1 finding 4); no other file there (such as
 * `FETCH_HEAD` or `ORIG_HEAD`) is a reference the list lets Syzygy read. */
export const revisionRefCandidates = (name: string): readonly string[] => [
  ...(name === 'HEAD' ? ['HEAD'] : []),
  ...(name.startsWith('refs/') ? [name] : [`refs/${name}`, `refs/tags/${name}`, `refs/heads/${name}`, `refs/remotes/${name}`, `refs/remotes/${name}/HEAD`]).filter(validRefName),
];

/** Whether the clone holds the candidate reference: HEAD always (read (1) refuses a clone without it), any other by its listed name. */
export const holdsRef = (snapshot: { readonly names: ReadonlySet<string> }, name: string): boolean => name === 'HEAD' || snapshot.names.has(name);

/** The remote whose `HEAD` reference the trunk rule reads, or why there is none to read. */
export function defaultRemoteOf(refs: ReadonlyMap<string, RefValue>): { readonly remote: string; readonly target: string } | { readonly none: 'none' | 'several'; readonly names: readonly string[] } {
  const recorded = [...refs].flatMap(([name, value]) => {
    const m = /^refs\/remotes\/([^/]+)\/HEAD$/.exec(name);
    return m !== null && value.kind === 'symbolic' ? [{ remote: m[1]!, target: value.target }] : [];
  });
  const origin = recorded.find(r => r.remote === 'origin');
  if (origin !== undefined) return origin;
  if (recorded.length === 1) return recorded[0]!;
  return { none: recorded.length === 0 ? 'none' : 'several', names: recorded.map(r => r.remote).sort() };
}

export function readCloneSnapshot(clone: string, options: { readonly revision?: string } = {}): CloneSnapshotRead {
  const gitDir = path.join(path.resolve(clone), '.git');
  let stats: fs.Stats;
  try { stats = fs.lstatSync(gitDir); } catch (cause) {
    return { ok: false, reason: `${gitDir} cannot be read (${code(cause)}); the clone must be a plain clone with a .git directory` };
  }
  if (stats.isSymbolicLink()) return { ok: false, reason: `${gitDir} is a symbolic link; it is refused, never followed` };
  if (!stats.isDirectory()) return { ok: false, reason: `${gitDir} is not a directory (a gitdir pointer is refused, never followed); use a plain clone` };

  const reftable = (): CloneSnapshotRead => ({ ok: false, reftable: true,
    reason: 'the clone stores its references in the reftable backend; Syzygy reads references only as loose files and packed-refs, so the run is refused before any Git process starts' });
  const headText = readBounded(path.join(gitDir, 'HEAD'), MAX_REF_BYTES);
  if (headText === null || 'reason' in headText) return { ok: false, reason: headText === null ? 'the clone has no HEAD' : headText.reason };
  const head = parseRefValue(headText.text);
  if (head === null) return { ok: false, reason: 'HEAD is neither a full commit identifier nor a reference' };
  // A reftable repository is told by the placeholder Git writes to HEAD (a value read (2) admits); no path the list does not name is
  // examined for it (R-PDJA-33-SLICE-A-1 finding 3).
  if (head.kind === 'symbolic' && head.target === REFTABLE_HEAD) return reftable();

  // Names: every packed row's name and every loose file's path. No loose file is opened here.
  const packed = readBounded(path.join(gitDir, 'packed-refs'), MAX_FILE_BYTES);
  if (packed !== null && 'reason' in packed) return { ok: false, reason: packed.reason };
  const packedRows = packed === null ? [] : packed.text.split('\n');
  const packedNames = new Set<string>();
  for (const row of packedRows) {
    const m = /^(?:[0-9a-f]{40}|[0-9a-f]{64}) (\S+)$/.exec(row);
    if (m !== null && validRefName(m[1]!)) packedNames.add(m[1]!);
  }
  const looseNames = new Set<string>();
  const pending: string[] = ['refs'];
  let seen = 0;
  while (pending.length > 0) {
    const rel = pending.pop()!;
    const abs = path.join(gitDir, ...rel.split('/'));
    let entry: fs.Stats;
    try { entry = fs.lstatSync(abs); } catch (cause) {
      if (code(cause) === 'ENOENT') continue;
      return { ok: false, reason: `${abs} cannot be read (${code(cause)})` };
    }
    if (entry.isSymbolicLink()) return { ok: false, reason: `${abs} is a symbolic link; it is refused, never followed` };
    if (entry.isDirectory()) {
      let names: string[];
      try { names = fs.readdirSync(abs); } catch (cause) { return { ok: false, reason: `${abs} cannot be listed (${code(cause)})` }; }
      for (const name of names) {
        if (++seen > MAX_REFS) return { ok: false, reason: `the clone holds more than ${MAX_REFS} reference entries` };
        pending.push(`${rel}/${name}`);
      }
      continue;
    }
    if (entry.isFile() && validRefName(rel)) looseNames.add(rel);
  }
  const names = new Set([...packedNames, ...looseNames]);

  // Values: the admitted references alone, a loose file overriding its packed row.
  const refs = new Map<string, RefValue>();
  const admit = (name: string): string | null => {
    if (refs.has(name) || !names.has(name)) return null;
    if (looseNames.has(name)) {
      const text = readBounded(path.join(gitDir, ...name.split('/')), MAX_REF_BYTES);
      if (text !== null && 'reason' in text) return text.reason;
      const value = text === null ? null : parseRefValue(text.text);
      if (value !== null) { refs.set(name, value); return null; }
      if (text !== null) return null;   // a loose file that holds no value: the name stays, the value is unknown
    }
    for (const row of packedRows) {
      const m = /^([0-9a-f]{40}|[0-9a-f]{64}) (\S+)$/.exec(row);
      if (m !== null && m[2] === name) { refs.set(name, { kind: 'oid', oid: m[1]! }); break; }
    }
    return null;
  };
  const admitAll = (list: readonly string[]): string | null => {
    for (const name of list) { const why = admit(name); if (why !== null) return why; }
    return null;
  };

  // HEAD's reference, then origin's HEAD; the other remotes' HEADs only where origin records no default, since the trunk rule takes
  // origin's default "when it records one" and only otherwise asks which remotes record one (R-PDJA-33-SLICE-A-1 finding 2).
  let why = admitAll([...(head.kind === 'symbolic' ? [head.target] : []), ORIGIN_HEAD]);
  if (why !== null) return { ok: false, reason: why };
  if (refs.get(ORIGIN_HEAD)?.kind !== 'symbolic') {
    why = admitAll([...names].filter(n => n !== ORIGIN_HEAD && /^refs\/remotes\/[^/]+\/HEAD$/.test(n)).sort());
    if (why !== null) return { ok: false, reason: why };
  }
  const chosen = defaultRemoteOf(refs);
  if ('remote' in chosen) {
    const prefix = `refs/remotes/${chosen.remote}/`;
    why = admitAll([chosen.target, ...(chosen.target.startsWith(prefix) ? [`refs/heads/${chosen.target.slice(prefix.length)}`] : [])]);
  } else if (chosen.none === 'none') {
    why = admitAll(['refs/heads/main', 'refs/heads/master']);
  }
  if (why !== null) return { ok: false, reason: why };
  if (options.revision !== undefined) {
    const named = revisionRefCandidates(options.revision).find(n => holdsRef({ names }, n));
    if (named !== undefined) { why = admit(named); if (why !== null) return { ok: false, reason: why }; }
  }

  const config = readBounded(path.join(gitDir, 'config'), MAX_FILE_BYTES);
  if (config !== null && 'reason' in config) return { ok: false, reason: config.reason };
  const parsed: CloneConfig = config === null ? { remotes: [], objectFormat: 'sha1', bare: null, worktree: null } : parseConfig(config.text);

  let alternates = false;
  try { fs.lstatSync(path.join(gitDir, 'objects', 'info', 'alternates')); alternates = true; } catch (cause) {
    if (code(cause) !== 'ENOENT') return { ok: false, reason: `${path.join(gitDir, 'objects', 'info', 'alternates')} cannot be examined (${code(cause)})` };
  }
  return { ok: true, snapshot: { gitDir, head, names, refs, remotes: parsed.remotes, objectFormat: parsed.objectFormat, alternates, bare: parsed.bare, worktree: parsed.worktree } };
}

/** A reference resolved to an object identifier from the admitted values alone, following symbolic references at most `depth` times;
 * null where a value on the way was not admitted or does not exist. */
export function resolveRef(snapshot: CloneSnapshot, name: string, depth = 5): string | null {
  let value: RefValue | undefined = name === 'HEAD' ? snapshot.head : snapshot.refs.get(name);
  for (let i = 0; value !== undefined && i <= depth; i++) {
    if (value.kind === 'oid') return value.oid;
    value = snapshot.refs.get(value.target);
  }
  return null;
}

/** Read (1), "the files of its common Git directory that locate its linked worktrees": each `worktrees/<name>/gitdir` file of the common
 * Git directory, which names the linked worktree's `.git` file; the worktree is that file's directory. Only those files are opened, each
 * bounded and never through a link. Read only in a copy-class run, to keep the copy's directory out of every working tree. */
export function linkedWorktrees(commonDir: string): { readonly ok: true; readonly dirs: readonly string[] } | { readonly ok: false; readonly reason: string } {
  const root = path.join(commonDir, 'worktrees');
  let names: string[];
  try {
    const stats = fs.lstatSync(root);
    if (!stats.isDirectory()) return { ok: false, reason: `${root} is not a directory; it is refused, never followed` };
    names = fs.readdirSync(root).sort();
  } catch (cause) {
    return code(cause) === 'ENOENT' ? { ok: true, dirs: [] } : { ok: false, reason: `${root} cannot be listed (${code(cause)})` };
  }
  if (names.length > MAX_REFS) return { ok: false, reason: `${root} holds more than ${MAX_REFS} entries` };
  const dirs: string[] = [];
  for (const name of names) {
    const text = readBounded(path.join(root, name, 'gitdir'), MAX_REF_BYTES);
    if (text === null) continue;
    if ('reason' in text) return { ok: false, reason: text.reason };
    const line = text.text.replace(/\r?\n$/, '');
    if (line === '') continue;
    dirs.push(path.dirname(path.resolve(path.join(root, name), line)));
  }
  return { ok: true, dirs };
}

