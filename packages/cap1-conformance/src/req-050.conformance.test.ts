import { beforeAll, describe, expect, it } from 'vitest';
import {
  computeDiscoverability,
  type RepositoryId,
  discoverabilityRow,
  type DiscoverabilityRow,
} from '@syzygy/cap1-core';

// A literal README digest: the evidence identity a yes/no finding carries.
const README_DIGEST = 'sha256:5555555555555555555555555555555555555555555555555555555555555555' as const;

// CAP1-REQ-050 — Per-repository discoverability in four-value vocabulary.
//
// Oracle: the closed four values are yes, no, not-applicable, Unknown.
// One finding per repository; values are verbatim strings compared
// against hard-coded literals.

const REPO_ID = 'repo-test-001' as RepositoryId;

describe('CAP1-REQ-050 — closed four-value discoverability vocabulary', () => {
  it('yes is a verbatim string value', () => {
    const finding = computeDiscoverability(REPO_ID, 'governance-root', { state: 'captured', relativePath: 'README.md', digest: README_DIGEST, linksToEntry: true });
    expect(finding.value).toBe('yes');
  });

  it('no is a verbatim string value', () => {
    const finding = computeDiscoverability(REPO_ID, 'governance-root', { state: 'captured', relativePath: 'README.md', digest: README_DIGEST, linksToEntry: false });
    expect(finding.value).toBe('no');
  });

  it('not-applicable is a verbatim string value', () => {
    const finding = computeDiscoverability(REPO_ID, 'observed-source', {
      state: 'undeclared',
    });
    expect(finding.value).toBe('not-applicable');
  });

  it('Unknown is a verbatim string value', () => {
    const finding = computeDiscoverability(REPO_ID, 'governance-root', { state: 'uncaptured', relativePath: 'README.md', failure: 'missing' });
    expect(finding.value).toBe('Unknown');
  });

  it('one finding per repository carries the repository ID', () => {
    const finding = computeDiscoverability(REPO_ID, 'governance-root', { state: 'captured', relativePath: 'README.md', digest: README_DIGEST, linksToEntry: true });
    expect(finding.repositoryId).toBe(REPO_ID);
  });
});

describe('CAP1-REQ-050 — the served row carries the value verbatim (syzygy-u2a.7)', () => {
  let rows: readonly DiscoverabilityRow[] = [];
  beforeAll(() => {
    rows = [
      computeDiscoverability('repo-a' as RepositoryId, 'governance-root', { state: 'captured', relativePath: 'README.md', digest: README_DIGEST, linksToEntry: true }),
      computeDiscoverability('repo-b' as RepositoryId, 'governance-root', { state: 'captured', relativePath: 'README.md', digest: README_DIGEST, linksToEntry: false }),
      computeDiscoverability('repo-c' as RepositoryId, 'observed-source', { state: 'not-read', reason: 'no-governance-root' }),
      computeDiscoverability('repo-d' as RepositoryId, 'governance-root', { state: 'unconsented' }),
    ].map((finding) => discoverabilityRow(finding, 'not-produced'));
  });

  it('one row per finding, each value one of the four spellings, in order — denominator: 4 repositories', () => {
    expect(rows.map((row) => [row.repositoryId, row.value])).toStrictEqual([
      ['repo-a', 'yes'],
      ['repo-b', 'no'],
      ['repo-c', 'not-applicable'],
      ['repo-d', 'Unknown'],
    ]);
  });

  it('the finding is computed from the root README only: its evidence path is README.md', () => {
    expect(rows.filter((row) => row.evidence !== null).map((row) => row.evidence?.relativePath)).toStrictEqual([
      'README.md',
      'README.md',
    ]);
  });
});
