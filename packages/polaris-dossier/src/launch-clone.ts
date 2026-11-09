import * as fs from 'node:fs';
import * as path from 'node:path';

/** What a launch reads of the operator's clone before any consent exists (REQ-polaris-generation-046, 047): its references and its
 * remotes' URLs, from the clone's own `.git` files, with no process run and nothing honoured.
 *
 * REQ-polaris-generation-046 permits, before the answer, "the clone's references"; REQ-polaris-generation-047 reads "the branch the
 * clone records as its remote's default (the remote's `HEAD` reference)" and the clone's `main` and `master` branches; and the identity
 * rule reads "the URL of the clone's remote". Reading `config` for a remote's `url` is not honouring it: no other key is used. Every file
 * is read with `lstat` first, a symbolic link is refused, never followed, and each read is bounded. A `.git` that is a file (a gitdir
 * pointer) is refused, as `clone-head.ts` refuses it. All of this lies within the agent sessions' write reach, so every value read here
 * is a claim: the pinned revision is re-hashed by the object reader, and the URL is a locator hint labelled Inferred. */

export type RefValue = { readonly kind: 'oid'; readonly oid: string } | { readonly kind: 'symbolic'; readonly target: string };

export interface CloneSnapshot {
  readonly gitDir: string;
  /** HEAD as the clone records it. */
  readonly head: RefValue;
  /** Every reference under `refs/`, loose files overriding `packed-refs`, by full name. */
  readonly refs: ReadonlyMap<string, RefValue>;
  /** Each `[remote "<name>"]` section's `url`, in file order; a remote with no url, or several, is left out. */
  readonly remotes: readonly { readonly name: string; readonly url: string }[];
}

export type CloneSnapshotRead = { readonly ok: true; readonly snapshot: CloneSnapshot } | { readonly ok: false; readonly reason: string };

const MAX_REF_BYTES = 4096;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_REFS = 100_000;
const OBJECT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const REF_NAME = /^refs\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;

const code = (cause: unknown): string => (cause as NodeJS.ErrnoException).code ?? 'unknown-error';

function readBounded(file: string, limit: number): { readonly text: string } | { readonly reason: string } | null {
  let stats: fs.Stats;
  try { stats = fs.lstatSync(file); } catch (cause) { return code(cause) === 'ENOENT' ? null : { reason: `${file} cannot be read (${code(cause)})` }; }
  if (!stats.isFile()) return { reason: `${file} is not a regular file; it is refused, never followed` };
  if (stats.size > limit) return { reason: `${file} is larger than ${limit} bytes` };
  try { return { text: fs.readFileSync(file, 'utf8') }; } catch (cause) { return { reason: `${file} cannot be read (${code(cause)})` }; }
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

/** Each remote's url from the clone's `config`. Only `[remote "<name>"]` headers and their `url` lines are read; a line continued with a
 * backslash, or an include, is not followed (the remote is then read from what the file says on its own lines). */
export function parseRemotes(config: string): readonly { readonly name: string; readonly url: string }[] {
  const urls = new Map<string, string[]>();
  let current: string | null = null;
  for (const raw of config.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('[')) {
      const m = /^\[remote "([^"\\\n]+)"\]$/.exec(line);
      current = m === null ? null : m[1]!;
      if (current !== null && !urls.has(current)) urls.set(current, []);
      continue;
    }
    if (current === null) continue;
    const kv = /^url\s*=\s*(.*)$/i.exec(line);
    if (kv !== null) urls.get(current)!.push(kv[1]!.replace(/^"(.*)"$/, '$1').trim());
  }
  return [...urls].flatMap(([name, list]) => (list.length === 1 && list[0] !== '' ? [{ name, url: list[0]! }] : []));
}

export function readCloneSnapshot(clone: string): CloneSnapshotRead {
  const gitDir = path.join(path.resolve(clone), '.git');
  let stats: fs.Stats;
  try { stats = fs.lstatSync(gitDir); } catch (cause) {
    return { ok: false, reason: `${gitDir} cannot be read (${code(cause)}); the clone must be a plain clone with a .git directory` };
  }
  if (stats.isSymbolicLink()) return { ok: false, reason: `${gitDir} is a symbolic link; it is refused, never followed` };
  if (!stats.isDirectory()) return { ok: false, reason: `${gitDir} is not a directory (a gitdir pointer is refused, never followed); use a plain clone` };

  const headText = readBounded(path.join(gitDir, 'HEAD'), MAX_REF_BYTES);
  if (headText === null || 'reason' in headText) return { ok: false, reason: headText === null ? 'the clone has no HEAD' : headText.reason };
  const head = parseRefValue(headText.text);
  if (head === null) return { ok: false, reason: 'HEAD is neither a full commit identifier nor a reference' };

  const refs = new Map<string, RefValue>();
  const packed = readBounded(path.join(gitDir, 'packed-refs'), MAX_FILE_BYTES);
  if (packed !== null && 'reason' in packed) return { ok: false, reason: packed.reason };
  if (packed !== null) {
    for (const row of packed.text.split('\n')) {
      const m = /^([0-9a-f]{40}|[0-9a-f]{64}) (\S+)$/.exec(row);
      if (m !== null && validRefName(m[2]!)) refs.set(m[2]!, { kind: 'oid', oid: m[1]! });
    }
  }
  // Loose refs, walked one entry at a time against one bound; a link anywhere is refused.
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
    if (!entry.isFile() || !validRefName(rel)) continue;
    const text = readBounded(abs, MAX_REF_BYTES);
    if (text === null) continue;
    if ('reason' in text) return { ok: false, reason: text.reason };
    const value = parseRefValue(text.text);
    if (value !== null) refs.set(rel, value);
  }

  const config = readBounded(path.join(gitDir, 'config'), MAX_FILE_BYTES);
  if (config !== null && 'reason' in config) return { ok: false, reason: config.reason };
  const remotes = config === null ? [] : parseRemotes(config.text);
  return { ok: true, snapshot: { gitDir, head, refs, remotes } };
}

/** A reference resolved to an object identifier, following symbolic references at most `depth` times. */
export function resolveRef(snapshot: CloneSnapshot, name: string, depth = 5): string | null {
  let value: RefValue | undefined = name === 'HEAD' ? snapshot.head : snapshot.refs.get(name);
  for (let i = 0; value !== undefined && i <= depth; i++) {
    if (value.kind === 'oid') return value.oid;
    value = snapshot.refs.get(value.target);
  }
  return null;
}
