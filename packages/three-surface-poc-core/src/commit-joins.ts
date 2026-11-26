import { createGitRunner } from './git-runner.js';
import type { WorkItemsResult } from './work-items.js';

/** POC-REQ-064 (syzygy-t3jk.25): work items joined to the observed
 * repository's commits by the naming convention (RFC4-22). A commit names an
 * item when a token of its subject exactly equals the item's identifier; the
 * subject is read for its tokens and dropped, never stored or served. */

/** How many commits, newest first from the observed revision, the read
 * takes. Older history is not read, and the observation says so. */
export const COMMIT_HISTORY_BOUND = 5000;

export interface CommitJoin {
  readonly hash: string;
  /** The committer instant, as git records it. */
  readonly at: string;
}

export interface ItemCommits {
  readonly id: string;
  /** Newest first, in the order the history read returned them. */
  readonly commits: readonly CommitJoin[];
}

export interface CommitJoinsObserved {
  readonly kind: 'observed';
  /** The repository revision the history was read from. */
  readonly revision: string;
  readonly basis: 'naming-convention';
  readonly fidelity: 'reduced-fidelity';
  readonly cause: 'derived-from-convention';
  readonly bound: number;
  /** Commits read, at most `bound`. */
  readonly read: number;
  /** True when history older than the `bound` commits read was not read. */
  readonly truncated: boolean;
  /** Commits read whose subject names at least one served item. */
  readonly joined: number;
  /** Commits read whose subject names no served item. */
  readonly unjoined: number;
  /** Served items that at least one read commit names, by ascending id. A
   * served item absent here is not observed to have no commits: no read
   * commit names it, and when `truncated` older history may. */
  readonly items: readonly ItemCommits[];
}

export const COMMIT_JOIN_UNKNOWN_REASONS = [
  'work-items-unobserved',
  'repository-revision-unavailable',
  'commit-history-read-failed',
  'commit-history-malformed',
] as const;

export type CommitJoinUnknownReason = (typeof COMMIT_JOIN_UNKNOWN_REASONS)[number];

export interface CommitJoinsUnknown {
  readonly kind: 'unknown';
  readonly reason: CommitJoinUnknownReason;
}

export type CommitJoinsResult = CommitJoinsObserved | CommitJoinsUnknown;

interface ObserveCommitJoinsInput {
  readonly repoRoot: string;
  readonly revision: string;
  readonly workItems: WorkItemsResult;
  readonly runGit?: (repoRoot: string, args: readonly string[]) => string;
}

const FIELD_SEP = '\x1f';
const REVISION = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;

function defaultRunGit(repoRoot: string, args: readonly string[]): string {
  return createGitRunner({
    prefix: ['--no-optional-locks', '-C', repoRoot],
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })(args);
}

/** A subject's tokens: maximal runs of identifier characters (letters,
 * digits, `.`, `_`, `-`), with sentence punctuation (`.`, `_`, `-`) trimmed
 * from each end. Only a token exactly equal to a served identifier joins:
 * never a prefix, a substring or a case-folded match. */
export function subjectTokens(subject: string): readonly string[] {
  const tokens: string[] = [];
  for (const run of subject.split(/[^A-Za-z0-9._-]+/)) {
    const token = run.replace(/^[._-]+|[._-]+$/g, '');
    if (token !== '') tokens.push(token);
  }
  return tokens;
}

export function observeCommitJoins(input: ObserveCommitJoinsInput): CommitJoinsResult {
  if (input.workItems.kind !== 'observed') return { kind: 'unknown', reason: 'work-items-unobserved' };
  if (!REVISION.test(input.revision)) return { kind: 'unknown', reason: 'repository-revision-unavailable' };
  const runGit = input.runGit ?? defaultRunGit;
  let raw: string;
  try {
    // One read, pinned to the observed revision: never `--all`, never a
    // ref that can move between the observation and this read.
    raw = runGit(input.repoRoot, [
      'log', `--max-count=${COMMIT_HISTORY_BOUND + 1}`, `--format=%H${FIELD_SEP}%cI${FIELD_SEP}%s`, input.revision, '--',
    ]);
  } catch {
    return { kind: 'unknown', reason: 'commit-history-read-failed' };
  }
  const served = new Set(input.workItems.items.map((item) => item.id));
  const lines = raw.split('\n');
  if (lines.at(-1) === '') lines.pop();
  const truncated = lines.length > COMMIT_HISTORY_BOUND;
  const byItem = new Map<string, CommitJoin[]>();
  let joined = 0;
  let read = 0;
  for (const line of lines.slice(0, COMMIT_HISTORY_BOUND)) {
    const first = line.indexOf(FIELD_SEP);
    const second = first === -1 ? -1 : line.indexOf(FIELD_SEP, first + 1);
    if (second === -1) return { kind: 'unknown', reason: 'commit-history-malformed' };
    const hash = line.slice(0, first);
    const at = line.slice(first + 1, second);
    if (!REVISION.test(hash) || !INSTANT.test(at)) return { kind: 'unknown', reason: 'commit-history-malformed' };
    read += 1;
    const named = new Set(subjectTokens(line.slice(second + 1)).filter((token) => served.has(token)));
    if (named.size === 0) continue;
    joined += 1;
    for (const id of named) {
      const list = byItem.get(id) ?? [];
      list.push({ hash, at });
      byItem.set(id, list);
    }
  }
  if (lines[0] === undefined || !lines[0].startsWith(`${input.revision}${FIELD_SEP}`)) {
    // A read from a commit always returns that commit first; an empty read
    // or any other first row is malformed, never an observed zero.
    return { kind: 'unknown', reason: 'commit-history-malformed' };
  }
  return {
    kind: 'observed',
    revision: input.revision,
    basis: 'naming-convention',
    fidelity: 'reduced-fidelity',
    cause: 'derived-from-convention',
    bound: COMMIT_HISTORY_BOUND,
    read,
    truncated,
    joined,
    unjoined: read - joined,
    items: [...byItem.keys()].sort().map((id) => ({ id, commits: byItem.get(id)! })),
  };
}
