import { beforeAll, describe, expect, it } from 'vitest';
import {
  computeDiscoverability,
  type RepositoryId,
  discoverabilityRow,
} from '@syzygy/cap1-core';

// A literal README digest: the evidence identity a yes/no finding carries.
const README_DIGEST = 'sha256:5555555555555555555555555555555555555555555555555555555555555555' as const;

// CAP1-REQ-051 — yes/no require evidence; missing = Unknown with reason.
//
// Oracle: captured-linking → yes; captured-not-linking → no;
// uncaptured → Unknown with 'source-uncaptured-or-unreachable';
// unconsented → Unknown with 'unconsented-source-or-provider'.
// Expected reason strings are hard-coded literals.

const REPO_ID = 'repo-test-051' as RepositoryId;

describe('CAP1-REQ-051 — evidence-backed findings', () => {
  it('captured README linking to entry → yes', () => {
    const finding = computeDiscoverability(REPO_ID, 'governance-root', { state: 'captured', relativePath: 'README.md', digest: README_DIGEST, linksToEntry: true });
    expect(finding.value).toBe('yes');
    expect(finding.epistemic.label).toBe('Observed');
  });

  it('captured README not linking to entry → no', () => {
    const finding = computeDiscoverability(REPO_ID, 'governance-root', { state: 'captured', relativePath: 'README.md', digest: README_DIGEST, linksToEntry: false });
    expect(finding.value).toBe('no');
    expect(finding.epistemic.label).toBe('Observed');
  });

  it('uncaptured source → Unknown with source-uncaptured-or-unreachable', () => {
    const finding = computeDiscoverability(REPO_ID, 'governance-root', { state: 'uncaptured', relativePath: 'README.md', failure: 'missing' });
    expect(finding.value).toBe('Unknown');
    expect(finding.epistemic.label).toBe('Unknown');
    expect('reasons' in finding.epistemic).toBe(true);
    if ('reasons' in finding.epistemic) {
      expect(finding.epistemic.reasons.primary).toBe('source-uncaptured-or-unreachable');
    }
  });

  it('unconsented source → Unknown with unconsented-source-or-provider', () => {
    const finding = computeDiscoverability(REPO_ID, 'governance-root', {
      state: 'unconsented',
    });
    expect(finding.value).toBe('Unknown');
    expect(finding.epistemic.label).toBe('Unknown');
    expect('reasons' in finding.epistemic).toBe(true);
    if ('reasons' in finding.epistemic) {
      expect(finding.epistemic.reasons.primary).toBe('unconsented-source-or-provider');
    }
  });

  it('undeclared → Unknown with missing-declaration', () => {
    const finding = computeDiscoverability(REPO_ID, 'governance-root', {
      state: 'undeclared',
    });
    expect(finding.value).toBe('Unknown');
    expect(finding.epistemic.label).toBe('Unknown');
    expect('reasons' in finding.epistemic).toBe(true);
    if ('reasons' in finding.epistemic) {
      expect(finding.epistemic.reasons.primary).toBe('missing-declaration');
    }
  });
});

describe('CAP1-REQ-051 — yes/no rows are bound to the captured README (syzygy-u2a.7)', () => {
  it('a yes row names the README digest as its evidence and its basis', () => {
    const row = discoverabilityRow(
      computeDiscoverability(REPO_ID, 'governance-root', { state: 'captured', relativePath: 'README.md', digest: README_DIGEST, linksToEntry: true }),
      'not-produced',
    );
    expect(row).toStrictEqual({
      repositoryId: 'repo-test-051',
      value: 'yes',
      label: 'Observed',
      primaryReason: null,
      basis: { kind: 'readme-captured', relativePath: 'README.md', digest: README_DIGEST, linksToEntry: true },
      evidence: { relativePath: 'README.md', digest: README_DIGEST },
      proposal: 'not-produced',
    });
  });

  it('a declined link is a truthful no with evidence, not an error and not Unknown', () => {
    const row = discoverabilityRow(
      computeDiscoverability(REPO_ID, 'governance-root', { state: 'captured', relativePath: 'README.md', digest: README_DIGEST, linksToEntry: false }),
      'not-produced',
    );
    expect([row.value, row.label, row.primaryReason, row.evidence]).toStrictEqual([
      'no',
      'Observed',
      null,
      { relativePath: 'README.md', digest: README_DIGEST },
    ]);
  });

  it('an unreadable front door carries its failure in the basis and no evidence identity', () => {
    const row = discoverabilityRow(
      computeDiscoverability(REPO_ID, 'governance-root', { state: 'uncaptured', relativePath: 'README.md', failure: 'EACCES' }),
      'not-produced',
    );
    expect([row.value, row.primaryReason, row.basis, row.evidence]).toStrictEqual([
      'Unknown',
      'source-uncaptured-or-unreachable',
      { kind: 'readme-uncaptured', relativePath: 'README.md', failure: 'EACCES' },
      null,
    ]);
  });

  it('a governance root whose README was never read is Unknown, never no', () => {
    const finding = computeDiscoverability(REPO_ID, 'governance-root', { state: 'not-read', reason: 'no-governance-root' });
    expect([finding.value, finding.basis]).toStrictEqual([
      'Unknown',
      { kind: 'readme-uncaptured', relativePath: 'README.md', failure: 'not-read' },
    ]);
  });
});
