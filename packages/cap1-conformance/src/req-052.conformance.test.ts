import { beforeAll, describe, expect, it } from 'vitest';
import {
  computeDiscoverability,
  type RepositoryId,
  discoverabilityRow,
} from '@syzygy/cap1-core';

// A literal README digest: the evidence identity a yes/no finding carries.
const README_DIGEST = 'sha256:5555555555555555555555555555555555555555555555555555555555555555' as const;

// CAP1-REQ-052 — not-applicable only for repositories with no governance root.
//
// Oracle: observed-source → not-applicable; governance-root must never
// get not-applicable. Falsifier: not-applicable on governance-root, or
// no on observed-source.

const REPO_ID = 'repo-test-052' as RepositoryId;

describe('CAP1-REQ-052 — not-applicable only for observed-source', () => {
  it('observed-source gets not-applicable regardless of evidence', () => {
    const finding = computeDiscoverability(REPO_ID, 'observed-source', { state: 'captured', relativePath: 'README.md', digest: README_DIGEST, linksToEntry: true });
    expect(finding.value).toBe('not-applicable');
    expect(finding.basis).toStrictEqual({ kind: 'no-governance-root' });
  });

  it('observed-source with uncaptured evidence still gets not-applicable', () => {
    const finding = computeDiscoverability(REPO_ID, 'observed-source', { state: 'uncaptured', relativePath: 'README.md', failure: 'missing' });
    expect(finding.value).toBe('not-applicable');
  });

  it('falsifier: governance-root never gets not-applicable (captured linking)', () => {
    const finding = computeDiscoverability(REPO_ID, 'governance-root', { state: 'captured', relativePath: 'README.md', digest: README_DIGEST, linksToEntry: true });
    expect(finding.value).not.toBe('not-applicable');
  });

  it('falsifier: governance-root never gets not-applicable (uncaptured)', () => {
    const finding = computeDiscoverability(REPO_ID, 'governance-root', { state: 'uncaptured', relativePath: 'README.md', failure: 'missing' });
    expect(finding.value).not.toBe('not-applicable');
  });

  it('falsifier: observed-source never gets no', () => {
    const finding = computeDiscoverability(REPO_ID, 'observed-source', { state: 'captured', relativePath: 'README.md', digest: README_DIGEST, linksToEntry: false });
    expect(finding.value).not.toBe('no');
  });
});

describe('CAP1-REQ-052 — not-applicable is never an Unknown reason (syzygy-u2a.7)', () => {
  it('the not-applicable row carries its declared basis and no Unknown reason', () => {
    const row = discoverabilityRow(
      computeDiscoverability(REPO_ID, 'observed-source', { state: 'not-read', reason: 'no-governance-root' }),
      'not-produced',
    );
    expect([row.value, row.label, row.primaryReason, row.basis, row.evidence]).toStrictEqual([
      'not-applicable',
      'Observed',
      null,
      { kind: 'no-governance-root' },
      null,
    ]);
  });

  it('role precedes consent: an unconsented observed source is not-applicable', () => {
    expect(computeDiscoverability(REPO_ID, 'observed-source', { state: 'unconsented' }).value).toBe('not-applicable');
  });
});
