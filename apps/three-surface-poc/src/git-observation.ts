import { createGitRunner } from '@syzygy/three-surface-poc-core';
import { realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { sha256 } from '@syzygy/support';

// Test seam: exported for the tests; production code reaches it only inside this file.
export const PWB_APPROVED_REPOSITORY_LOCATOR = '/home/tze/GitHub/butlers';

export type PwbRepositoryBinding =
  | { readonly kind: 'bound'; readonly locator: string; readonly gitCommonDirectory: string }
  | { readonly kind: 'rejected'; readonly reason: 'locator-mismatched' | 'git-common-directory-mismatched' | 'binding-unreadable' };

interface ResolvePwbRepositoryBindingOptions {
  readonly approvedLocator?: string;
  readonly realpath?: (path: string) => string;
  readonly runGit?: (root: string, args: readonly string[]) => string;
}

// Test seam: exported type the tests name; production code uses it only inside this file.
export interface GitObservation {
  readonly revision: string;
  readonly committerInstant: string;
  readonly worktreeMetadataDigest: string;
  readonly clean: boolean;
  readonly changedPaths: readonly string[];
}

function readGit(root: string, args: readonly string[]): string {
  return createGitRunner({
    prefix: ['--no-optional-locks', '-C', root],
    encoding: 'utf8',
    env: () => ({ ...process.env, GIT_OPTIONAL_LOCKS: '0' }),
    stdio: ['ignore', 'pipe', 'ignore'],
  })(args);
}

export function resolvePwbRepositoryBinding(
  configuredLocator: string,
  options: ResolvePwbRepositoryBindingOptions = {},
): PwbRepositoryBinding {
  const realpath = options.realpath ?? realpathSync;
  const runGit = options.runGit ?? readGit;
  try {
    const approvedLocator = realpath(resolve(options.approvedLocator ?? PWB_APPROVED_REPOSITORY_LOCATOR));
    const locator = realpath(resolve(configuredLocator));
    if (locator !== approvedLocator) return { kind: 'rejected', reason: 'locator-mismatched' };
    const gitCommonDirectory = realpath(
      resolve(locator, runGit(locator, ['rev-parse', '--path-format=absolute', '--git-common-dir']).trim()),
    );
    const approvedGitCommonDirectory = realpath(join(approvedLocator, '.git'));
    if (gitCommonDirectory !== approvedGitCommonDirectory) {
      return { kind: 'rejected', reason: 'git-common-directory-mismatched' };
    }
    return { kind: 'bound', locator, gitCommonDirectory };
  } catch {
    return { kind: 'rejected', reason: 'binding-unreadable' };
  }
}

function nulSeparatedPaths(record: string): readonly string[] {
  return record.split('\0').filter((candidate) => candidate !== '');
}

export function observeGitRepository(root: string): GitObservation {
  const revision = readGit(root, ['rev-parse', 'HEAD']).trim();
  const committerInstant = readGit(root, ['show', '-s', '--format=%cI', revision]).trim();
  const worktreeRecord = readGit(root, [
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
  ]);
  const changedPaths = [
    ...nulSeparatedPaths(
      readGit(root, ['diff', '--no-renames', '--name-only', '-z', 'HEAD', '--']),
    ),
    ...nulSeparatedPaths(
      readGit(root, ['ls-files', '--others', '--exclude-standard', '-z']),
    ),
  ];
  return {
    revision,
    committerInstant,
    worktreeMetadataDigest: `sha256:${sha256(worktreeRecord)}`,
    clean: worktreeRecord.length === 0,
    changedPaths: [...new Set(changedPaths)].sort(),
  };
}

export interface GitHorizonObservation {
  readonly pinnedRevision: string;
  readonly currentRevision: string;
  readonly currentCommitterInstant: string;
  readonly changedSources: number;
  readonly addedSources: number;
}

interface ObserveGitHorizonOptions {
  readonly runGit?: (root: string, args: readonly string[]) => string;
}

/** Compare revision metadata only; no source body is opened. */
export function observeGitHorizon(
  root: string,
  pinnedRevision: string,
  options: ObserveGitHorizonOptions = {},
): GitHorizonObservation {
  const runGit = options.runGit ?? readGit;
  const currentRevision = runGit(root, ['rev-parse', 'HEAD']).trim();
  const currentCommitterInstant = runGit(root, ['show', '-s', '--format=%cI', currentRevision]).trim();
  return { pinnedRevision, currentRevision, currentCommitterInstant, ...countRevisionChange(runGit, root, pinnedRevision, currentRevision) };
}

function countRevisionChange(
  runGit: (root: string, args: readonly string[]) => string,
  root: string,
  fromRevision: string,
  toRevision: string,
): { readonly changedSources: number; readonly addedSources: number } {
  if (fromRevision === toRevision) return { changedSources: 0, addedSources: 0 };
  const diff = runGit(root, ['diff', '--name-status', '--no-renames', '-z', `${fromRevision}..${toRevision}`]);
  const entries = diff.split('\0').filter((entry) => entry !== '');
  let changedSources = 0;
  let addedSources = 0;
  const records = entries.some((entry) => entry.includes('\t'))
    ? entries
    : entries.filter((_entry, index) => index % 2 === 0);
  for (const entry of records) {
    const tab = entry.indexOf('\t');
    const status = tab < 0 ? entry : entry.slice(0, tab);
    if (status.startsWith('A')) addedSources += 1;
    else changedSources += 1;
  }
  return { changedSources, addedSources };
}

/** The observed-project limb between two evaluated revisions (syzygy-u05.2):
 * revision metadata only, no source body opened. Null when either revision
 * or the comparison cannot be read — Unknown, never zero. */
export function observeRevisionChange(
  root: string,
  fromRevision: string,
  toRevision: string,
  options: ObserveGitHorizonOptions = {},
): { readonly changedSources: number; readonly addedSources: number } | null {
  try {
    return countRevisionChange(options.runGit ?? readGit, root, fromRevision, toRevision);
  } catch {
    return null;
  }
}

/** The observatory limb (syzygy-u05.2): Syzygy commits on the observer
 * checkout since the revision the running daemon was started from. Read on
 * the owner's request only; null counts are Unknown, never zero. */
export function observeObservatoryDrift(
  root: string,
  buildRevision: string,
  options: ObserveGitHorizonOptions = {},
): { readonly buildRevision: string; readonly currentRevision: string | null; readonly commitsSinceBuild: number | null } {
  const runGit = options.runGit ?? readGit;
  let currentRevision: string | null;
  try {
    currentRevision = runGit(root, ['rev-parse', 'HEAD']).trim();
  } catch {
    return { buildRevision, currentRevision: null, commitsSinceBuild: null };
  }
  try {
    // Only a plain non-negative integer is a count; empty output is not zero.
    const reply = runGit(root, ['rev-list', '--count', `${buildRevision}..${currentRevision}`]).trim();
    return { buildRevision, currentRevision, commitsSinceBuild: /^[0-9]+$/.test(reply) ? Number(reply) : null };
  } catch {
    return { buildRevision, currentRevision, commitsSinceBuild: null };
  }
}

export function pocObserverInputsAreClean(
  observation: Pick<GitObservation, 'changedPaths'>,
): boolean {
  // scripts/clean_build.mjs holds what `build:poc` removes and how it runs tsc (syzygy-bpyt.4.2).
  const exactInputs = new Set(['package.json', 'package-lock.json', 'tsconfig.base.json', 'scripts/clean_build.mjs']);
  // Every project the POC start compiles or loads needs a prefix here (owner direction GP-B2 Q3, syzygy-bpyt.56): the projects
  // build:poc names, every project their tsconfig references reach, and the workspaces main.ts imports. git-observation.test.ts
  // derives that set and requires the gate to refuse exactly it.
  const inputPrefixes = [
    'apps/three-surface-poc/',
    'packages/three-surface-poc-core/',
    'packages/cap1-daemon/',
    'packages/http-host/',
    'packages/cap1-core/',
    'packages/support/',
    'packages/polaris-generation-core/',
    'packages/polaris-generation-consent/',
  ];
  return observation.changedPaths.every(
    (changedPath) =>
      !exactInputs.has(changedPath) &&
      inputPrefixes.every((prefix) => !changedPath.startsWith(prefix)),
  );
}
