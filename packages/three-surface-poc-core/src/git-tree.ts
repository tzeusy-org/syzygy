// Git tree metadata — the parsed form of `git ls-tree -r -z [-l] <rev>`.
//
// Tree metadata names paths, modes and object ids; it never carries blob
// content. PWB phase A discovery (`project-shape-manifest.ts`) and the
// phase B exact-object reader both consume this shape, so the one parser
// lives here. Callers must pass `-z`: a quoted (escaped) path from the
// newline format is rejected as malformed rather than guessed at.

const GIT_TREE_OBJECT_TYPES = ['blob', 'tree', 'commit'] as const;
type GitTreeObjectType = (typeof GIT_TREE_OBJECT_TYPES)[number];

export interface GitTreeEntry {
  readonly mode: string;
  readonly type: GitTreeObjectType;
  readonly objectId: string;
  // Present only when the listing was taken with `-l`; `-` for non-blobs.
  readonly sizeBytes?: number;
  readonly path: string;
}

type ParsedGitTree =
  | { readonly kind: 'parsed'; readonly entries: readonly GitTreeEntry[] }
  | { readonly kind: 'malformed'; readonly record: string };

const LS_TREE_RECORD = /^([0-7]{6}) (blob|tree|commit) ([0-9a-f]{40,64})(?:\s+(\d+|-))?\t(.+)$/s;

export function parseGitLsTree(raw: string): ParsedGitTree {
  const records = raw.includes('\0') ? raw.split('\0') : raw.split('\n');
  const entries: GitTreeEntry[] = [];
  for (const record of records) {
    if (record === '') continue;
    const match = LS_TREE_RECORD.exec(record);
    const path = match?.[5];
    const type = match?.[2];
    if (match === null || match === undefined || path === undefined || path.startsWith('"') || path.includes('\n')) {
      return { kind: 'malformed', record };
    }
    if (type !== 'blob' && type !== 'tree' && type !== 'commit') return { kind: 'malformed', record };
    const size = match[4];
    entries.push({
      mode: match[1] ?? '',
      type,
      objectId: match[3] ?? '',
      ...(size === undefined || size === '-' ? {} : { sizeBytes: Number(size) }),
      path,
    });
  }
  return { kind: 'parsed', entries };
}

// Read-only lookup over one revision's listing.
export interface GitTreeIndex {
  readonly entries: readonly GitTreeEntry[];
  readonly entryAt: (path: string) => GitTreeEntry | undefined;
  // True when at least one entry lies strictly below `path`.
  readonly hasDirectory: (path: string) => boolean;
}

export function indexGitTree(entries: readonly GitTreeEntry[]): GitTreeIndex {
  const byPath = new Map<string, GitTreeEntry>();
  const directories = new Set<string>();
  for (const entry of entries) {
    byPath.set(entry.path, entry);
    const segments = entry.path.split('/');
    for (let depth = 1; depth < segments.length; depth += 1) {
      directories.add(segments.slice(0, depth).join('/'));
    }
  }
  return {
    entries,
    entryAt: (path) => byPath.get(path),
    hasDirectory: (path) => directories.has(path),
  };
}

// POSIX-normalize a repository-relative path. Returns undefined when the
// path is absolute, empty, NUL-bearing, or escapes above the repository
// root; `.` segments are dropped and `..` segments consumed.
export function normalizeRepositoryPath(path: string): string | undefined {
  if (path === '' || path.startsWith('/') || path.includes('\0')) return undefined;
  const out: string[] = [];
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (out.length === 0) return undefined;
      out.pop();
      continue;
    }
    out.push(segment);
  }
  return out.length === 0 ? undefined : out.join('/');
}

export function posixDirname(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? '' : path.slice(0, slash);
}

export function posixBasename(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash < 0 ? path : path.slice(slash + 1);
}
