import { execFileSync } from 'node:child_process';

const WORKER_CHANGE_LIFECYCLE_STATES = ['planned', 'active', 'changed-or-merged'] as const;

type WorkerChangeLifecycleState = (typeof WORKER_CHANGE_LIFECYCLE_STATES)[number];

export interface WorkerChangeSeam {
  readonly sourcePath: string;
  readonly testPath: string;
}

/** Where this commit was found, stated distinctly in the JSON itself:
 * `default-branch` — no ref search was needed, the commit is already
 * reachable from the default branch; `ref` — a containing ref was found
 * by search; `none-found` — the search ran and found no containing ref.
 * A machine consumer never has to cross-reference the sibling `state`
 * field to tell "trivially the default branch" from "search came back
 * empty". */
export type WorkerChangeContainingRef =
  | { readonly kind: 'default-branch' }
  | { readonly kind: 'ref'; readonly ref: string }
  | { readonly kind: 'none-found' };

export interface WorkerChangeCommit {
  readonly sha: string;
  readonly authoredAt: string;
  readonly subject: string;
  readonly containingRef: WorkerChangeContainingRef;
}

export interface WorkerChangeObserved {
  readonly kind: 'observed';
  readonly beadId: string;
  readonly seam: WorkerChangeSeam;
  readonly defaultBranch: string;
  readonly defaultBranchRevision: string;
  readonly state: WorkerChangeLifecycleState;
  /** Activity or a merge is never rendered as satisfaction (POC-REQ-043
   * precedent, AC4/AC5): this field is always the disclosed Unknown until
   * a separate test-artifact-ingestion observer (syzygy-0r9) supplies real
   * evidence. */
  readonly verification: 'not-verified';
  readonly commit: WorkerChangeCommit | null;
  readonly capturedAt: string;
}

interface WorkerChangeUnknown {
  readonly kind: 'unknown';
  readonly reason: string;
}

export type WorkerChangeResult = WorkerChangeObserved | WorkerChangeUnknown;

interface ObserveWorkerChangeInput {
  readonly repoRoot: string;
  /** The materialized Bead this observation is scoped to; `null` when no
   * work item has been materialized yet (nothing to observe git activity
   * against). */
  readonly beadId: string | null;
  readonly seam: WorkerChangeSeam;
  readonly capturedAt: string;
  readonly runGit?: (repoRoot: string, args: readonly string[]) => string;
}

function defaultRunGit(repoRoot: string, args: readonly string[]): string {
  return execFileSync('git', ['--no-optional-locks', '-C', repoRoot, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const FIELD_SEP = '\x1f';

function resolveDefaultBranch(
  repoRoot: string,
  runGit: (repoRoot: string, args: readonly string[]) => string,
): { readonly branch: string; readonly ref: string } | null {
  let symbolic: string;
  try {
    symbolic = runGit(repoRoot, ['symbolic-ref', 'refs/remotes/origin/HEAD']).trim();
  } catch {
    return null;
  }
  const prefix = 'refs/remotes/origin/';
  if (!symbolic.startsWith(prefix)) {
    return null;
  }
  return { branch: symbolic.slice(prefix.length), ref: symbolic };
}

interface RawCommit {
  readonly sha: string;
  readonly authoredAt: string;
  readonly subject: string;
}

function findSeamCommits(
  repoRoot: string,
  runGit: (repoRoot: string, args: readonly string[]) => string,
  beadId: string,
  seam: WorkerChangeSeam,
): readonly RawCommit[] {
  const format = `%H${FIELD_SEP}%aI${FIELD_SEP}%s`;
  const raw = runGit(repoRoot, [
    'log',
    '--all',
    `--format=${format}`,
    '--fixed-strings',
    `--grep=[${beadId}]`,
    '--',
    seam.sourcePath,
    seam.testPath,
  ]);
  const commits: RawCommit[] = [];
  for (const line of raw.split('\n')) {
    if (line.trim() === '') {
      continue;
    }
    const [sha, authoredAt, ...subjectParts] = line.split(FIELD_SEP);
    if (sha === undefined || authoredAt === undefined) {
      continue;
    }
    commits.push({ sha, authoredAt, subject: subjectParts.join(FIELD_SEP) });
  }
  return commits;
}

function isAncestor(
  repoRoot: string,
  runGit: (repoRoot: string, args: readonly string[]) => string,
  sha: string,
  ref: string,
): boolean {
  try {
    runGit(repoRoot, ['merge-base', '--is-ancestor', sha, ref]);
    return true;
  } catch {
    return false;
  }
}

function findContainingRef(
  repoRoot: string,
  runGit: (repoRoot: string, args: readonly string[]) => string,
  sha: string,
): WorkerChangeContainingRef {
  let raw: string;
  try {
    raw = runGit(repoRoot, [
      'for-each-ref',
      '--contains',
      sha,
      '--format=%(refname:short)',
      'refs/remotes/origin',
    ]);
  } catch {
    return { kind: 'none-found' };
  }
  const refs = raw.split('\n').map((line) => line.trim()).filter((line) => line !== '');
  const first = refs[0];
  return first === undefined ? { kind: 'none-found' } : { kind: 'ref', ref: first };
}

/**
 * Reads only the configured Butlers repository's git references — never
 * executes any observed code or test (AC6). Lifecycle state is scoped to
 * the one materialized Bead: commits are matched by an exact
 * `[<beadId>]` marker in the subject, touching the bounded source seam,
 * so unrelated history on the same files is never mistaken for this
 * work's activity.
 */
export function observeWorkerChange(input: ObserveWorkerChangeInput): WorkerChangeResult {
  if (input.beadId === null) {
    return { kind: 'unknown', reason: 'no materialized work item to observe git activity against' };
  }

  const runGit = input.runGit ?? defaultRunGit;

  const defaultBranch = resolveDefaultBranch(input.repoRoot, runGit);
  if (defaultBranch === null) {
    return {
      kind: 'unknown',
      reason: 'the Butlers repository default branch could not be resolved',
    };
  }

  let defaultBranchRevision: string;
  try {
    defaultBranchRevision = runGit(input.repoRoot, ['rev-parse', defaultBranch.ref]).trim();
  } catch {
    return {
      kind: 'unknown',
      reason: 'the Butlers repository default branch revision could not be read',
    };
  }

  let commits: readonly RawCommit[];
  try {
    commits = findSeamCommits(input.repoRoot, runGit, input.beadId, input.seam);
  } catch {
    return {
      kind: 'unknown',
      reason: 'the Butlers repository was unreadable during worker-change observation',
    };
  }

  const sorted = [...commits].sort((a, b) => (a.authoredAt < b.authoredAt ? 1 : a.authoredAt > b.authoredAt ? -1 : 0));

  const merged = sorted.find((commit) => isAncestor(input.repoRoot, runGit, commit.sha, defaultBranch.ref));
  if (merged !== undefined) {
    return {
      kind: 'observed',
      beadId: input.beadId,
      seam: input.seam,
      defaultBranch: defaultBranch.branch,
      defaultBranchRevision,
      state: 'changed-or-merged',
      verification: 'not-verified',
      commit: {
        sha: merged.sha,
        authoredAt: merged.authoredAt,
        subject: merged.subject,
        containingRef: { kind: 'default-branch' },
      },
      capturedAt: input.capturedAt,
    };
  }

  const mostRecent = sorted[0];
  if (mostRecent !== undefined) {
    return {
      kind: 'observed',
      beadId: input.beadId,
      seam: input.seam,
      defaultBranch: defaultBranch.branch,
      defaultBranchRevision,
      state: 'active',
      verification: 'not-verified',
      commit: {
        sha: mostRecent.sha,
        authoredAt: mostRecent.authoredAt,
        subject: mostRecent.subject,
        containingRef: findContainingRef(input.repoRoot, runGit, mostRecent.sha),
      },
      capturedAt: input.capturedAt,
    };
  }

  return {
    kind: 'observed',
    beadId: input.beadId,
    seam: input.seam,
    defaultBranch: defaultBranch.branch,
    defaultBranchRevision,
    state: 'planned',
    verification: 'not-verified',
    commit: null,
    capturedAt: input.capturedAt,
  };
}
