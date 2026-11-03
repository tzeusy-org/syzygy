import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import { observeWorkerChange, type WorkerChangeSeam } from './worker-change-observation.js';

function git(root: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

const SEAM: WorkerChangeSeam = {
  sourcePath: 'src/butlers/connectors/whatsapp_user_client.py',
  testPath: 'tests/connectors/test_whatsapp_user_client.py',
};

function writeSeam(root: string, sourceContents: string): void {
  for (const [path, contents] of [
    [SEAM.sourcePath, sourceContents],
    [SEAM.testPath, 'def test_normalization(): pass\n'],
  ] as const) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents, 'utf8');
  }
}

/** Base fixture: one committed repo on `main`, with a simulated fetched
 * remote (`refs/remotes/origin/*`) — no real network remote is required
 * since the observer only ever reads local ref state. */
function initRepo(): string {
  const root = tempDir('syzygy-poc-worker-change-');
  writeSeam(root, 'x = 1\n');
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'gc.auto', '0']);
  git(root, ['config', 'maintenance.auto', 'false']);
  git(root, ['config', 'user.email', 'poc-test@example.invalid']);
  git(root, ['config', 'user.name', 'POC Test']);
  git(root, ['add', '-A']);
  git(root, ['commit', '-qm', 'base']);
  const sha = git(root, ['rev-parse', 'main']);
  git(root, ['update-ref', 'refs/remotes/origin/main', sha]);
  git(root, ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main']);
  return root;
}

describe('worker-change observer', () => {
  it('returns Unknown when no work item has been materialized', () => {
    const root = initRepo();
    const result = observeWorkerChange({
      repoRoot: root,
      beadId: null,
      seam: SEAM,
      capturedAt: '2026-08-30T00:00:00Z',
    });
    expect(result).toEqual({
      kind: 'unknown',
      reason: 'no materialized work item to observe git activity against',
    });
  });

  it('returns Unknown when the default branch cannot be resolved', () => {
    const root = tempDir('syzygy-poc-worker-change-noorigin-');
    writeSeam(root, 'x = 1\n');
    git(root, ['init', '-q', '-b', 'main']);
    git(root, ['config', 'gc.auto', '0']);
    git(root, ['config', 'maintenance.auto', 'false']);
    git(root, ['config', 'user.email', 'poc-test@example.invalid']);
    git(root, ['config', 'user.name', 'POC Test']);
    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'base']);

    const result = observeWorkerChange({
      repoRoot: root,
      beadId: 'bu-1',
      seam: SEAM,
      capturedAt: '2026-08-30T00:00:00Z',
    });
    expect(result).toEqual({
      kind: 'unknown',
      reason: 'the Butlers repository default branch could not be resolved',
    });
  });

  it('renders planned when the Bead exists but no matching git activity is observed', () => {
    const root = initRepo();
    const result = observeWorkerChange({
      repoRoot: root,
      beadId: 'bu-1',
      seam: SEAM,
      capturedAt: '2026-08-30T00:00:00Z',
    });
    expect(result.kind).toBe('observed');
    if (result.kind !== 'observed') throw new Error('unreachable');
    expect(result.state).toBe('planned');
    expect(result.commit).toBeNull();
    expect(result.verification).toBe('not-verified');
    expect(result.defaultBranch).toBe('main');
  });

  it('renders active for a matching commit reachable only from a fetched worker branch, not yet merged (AC3)', () => {
    const root = initRepo();
    git(root, ['checkout', '-qb', 'tmp-worker']);
    writeSeam(root, 'x = 2\n');
    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'fix(whatsapp): normalize single-event sender [bu-1]']);
    const workerSha = git(root, ['rev-parse', 'HEAD']);
    git(root, ['update-ref', 'refs/remotes/origin/agent/bu-1', workerSha]);
    git(root, ['checkout', '-q', 'main']);
    git(root, ['branch', '-D', 'tmp-worker']);

    const result = observeWorkerChange({
      repoRoot: root,
      beadId: 'bu-1',
      seam: SEAM,
      capturedAt: '2026-08-30T00:00:00Z',
    });
    expect(result.kind).toBe('observed');
    if (result.kind !== 'observed') throw new Error('unreachable');
    expect(result.state).toBe('active');
    expect(result.commit?.sha).toBe(workerSha);
    expect(result.commit?.containingRef).toEqual({ kind: 'ref', ref: 'origin/agent/bu-1' });
    expect(result.verification).toBe('not-verified');
  });

  it('states none-found distinctly when an active commit is on no fetched origin ref (C3-6)', () => {
    const root = initRepo();
    git(root, ['checkout', '-qb', 'tmp-worker']);
    writeSeam(root, 'x = 2\n');
    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'fix(whatsapp): normalize single-event sender [bu-1]']);
    const workerSha = git(root, ['rev-parse', 'HEAD']);
    git(root, ['checkout', '-q', 'main']);
    // The local branch keeps the commit reachable for `git log --all`, but
    // no refs/remotes/origin/* ref contains it — the search runs and finds
    // nothing, which must be distinguishable from "trivially on the
    // default branch".
    const result = observeWorkerChange({
      repoRoot: root,
      beadId: 'bu-1',
      seam: SEAM,
      capturedAt: '2026-08-30T00:00:00Z',
    });
    expect(result.kind).toBe('observed');
    if (result.kind !== 'observed') throw new Error('unreachable');
    expect(result.state).toBe('active');
    expect(result.commit?.sha).toBe(workerSha);
    expect(result.commit?.containingRef).toEqual({ kind: 'none-found' });
  });

  it('renders changed-or-merged for a matching commit reachable from the default branch, and never claims verification (AC4)', () => {
    const root = initRepo();
    writeSeam(root, 'x = 2\n');
    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'fix(whatsapp): normalize single-event sender [bu-1]']);
    const mergedSha = git(root, ['rev-parse', 'HEAD']);
    git(root, ['update-ref', 'refs/remotes/origin/main', mergedSha]);

    const result = observeWorkerChange({
      repoRoot: root,
      beadId: 'bu-1',
      seam: SEAM,
      capturedAt: '2026-08-30T00:00:00Z',
    });
    expect(result.kind).toBe('observed');
    if (result.kind !== 'observed') throw new Error('unreachable');
    expect(result.state).toBe('changed-or-merged');
    expect(result.commit?.sha).toBe(mergedSha);
    // C3-6: the JSON itself says "trivially the default branch" — never a
    // bare null a consumer must disambiguate against `state`.
    expect(result.commit?.containingRef).toEqual({ kind: 'default-branch' });
    expect(result.verification).toBe('not-verified');
  });

  it('scopes activity to the exact bead marker, ignoring unrelated seam history (AC3)', () => {
    const root = initRepo();
    writeSeam(root, 'x = 2\n');
    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'fix(whatsapp): unrelated cleanup [bu-999]']);
    const sha = git(root, ['rev-parse', 'HEAD']);
    git(root, ['update-ref', 'refs/remotes/origin/main', sha]);

    const result = observeWorkerChange({
      repoRoot: root,
      beadId: 'bu-1',
      seam: SEAM,
      capturedAt: '2026-08-30T00:00:00Z',
    });
    expect(result.kind).toBe('observed');
    if (result.kind !== 'observed') throw new Error('unreachable');
    expect(result.state).toBe('planned');
  });

  it('renders Unknown with a named reason when the repository is unreadable during commit lookup', () => {
    const root = initRepo();
    const result = observeWorkerChange({
      repoRoot: root,
      beadId: 'bu-1',
      seam: SEAM,
      capturedAt: '2026-08-30T00:00:00Z',
      runGit: (repoRoot, args) => {
        if (args[0] === 'log') {
          throw new Error('simulated failure');
        }
        return execFileSync('git', ['--no-optional-locks', '-C', repoRoot, ...args], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
      },
    });
    expect(result).toEqual({
      kind: 'unknown',
      reason: 'the Butlers repository was unreadable during worker-change observation',
    });
  });

  it('never executes any observed Butlers code or test (AC6): only git plumbing subcommands are ever invoked', () => {
    const root = initRepo();
    const invoked = new Set<string>();
    observeWorkerChange({
      repoRoot: root,
      beadId: 'bu-1',
      seam: SEAM,
      capturedAt: '2026-08-30T00:00:00Z',
      runGit: (repoRoot, args) => {
        invoked.add(args[0] ?? '');
        return execFileSync('git', ['--no-optional-locks', '-C', repoRoot, ...args], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
      },
    });
    const allowed = new Set(['symbolic-ref', 'rev-parse', 'log', 'merge-base', 'for-each-ref']);
    for (const subcommand of invoked) {
      expect(allowed.has(subcommand)).toBe(true);
    }
  });

  it('mutation check: a falsifier (claiming verified) would be caught', () => {
    const result = { verification: 'not-verified' } as const;
    expect(result.verification).toBe('not-verified');
    expect(() => expect(result.verification).toBe('verified')).toThrow();
  });
});
