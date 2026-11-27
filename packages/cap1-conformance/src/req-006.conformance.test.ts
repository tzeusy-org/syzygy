import { describe, expect, it } from 'vitest';
import { designateRoots } from '@syzygy/cap1-core';
import type { RepositoryId, RootCandidate } from '@syzygy/cap1-core';

// CAP1-REQ-006 — Governance-root count violations surface; they are
// never repaired.
//
// Case: two repositories declaring the same project identity (two
// roots), and separately a project with no declaration (zero roots).
// Oracle: the two-root case returns a contradiction on the adjudication
// route with no single chosen root. The zero-root case returns Unknown
// with the verbatim reason. Expectations are literal from RFC1-1,
// RFC1-21 and RFC2-24 reason 8.

const repoA = 'repo-opaque-01' as RepositoryId;
const repoB = 'repo-opaque-02' as RepositoryId;

function candidate(id: RepositoryId, hasDeclaration: boolean): RootCandidate {
  return { repositoryId: id, hasDeclaration };
}

describe('CAP1-REQ-006 — root-count violations surface, never repaired', () => {
  it('exactly one declaring repository is designated the root', () => {
    const result = designateRoots([candidate(repoA, true), candidate(repoB, false)]);
    expect(result.status).toBe('designated');
    if (result.status === 'designated') {
      expect(result.root).toBe(repoA);
    }
  });

  it('scenario: two governance roots — a contradiction routed to adjudication with reason 8', () => {
    const result = designateRoots([candidate(repoA, true), candidate(repoB, true)]);
    expect(result).toStrictEqual({
      status: 'contradiction',
      kind: 'multiple-roots',
      roots: [repoA, repoB],
      routedTo: 'adjudication',
      reason: 'contradicted-pending-adjudication',
    });
  });

  it('scenario: zero governance roots — Unknown with reason `missing-declaration` at the workspace level', () => {
    const result = designateRoots([candidate(repoA, false), candidate(repoB, false)]);
    expect(result.status).toBe('unknown');
    if (result.status === 'unknown') {
      expect(result.scope).toBe('workspace');
      // Verbatim from the closed twelve-reason vocabulary (RFC2-24).
      expect(result.reason).toBe('missing-declaration');
    }
    // Never dropped, never rendered as an empty project, never a minted
    // contradiction (RFC1-1's zero-roots rule).
    expect(result.status).not.toBe('contradiction');
  });

  it('an empty candidate set is the zero-root case, not an error and not silence', () => {
    const result = designateRoots([]);
    expect(result.status).toBe('unknown');
    if (result.status === 'unknown') {
      expect(result.reason).toBe('missing-declaration');
    }
  });

  it('falsifier: input order and observation time cannot select a root', () => {
    const older = { ...candidate(repoA, true), observedAt: '2026-01-01T00:00:00Z' };
    const newer = { ...candidate(repoB, true), observedAt: '2026-01-02T00:00:00Z' };
    for (const candidates of [[older, newer], [newer, older]]) {
      const result = designateRoots(candidates);
      expect(result).toStrictEqual({
        status: 'contradiction',
        kind: 'multiple-roots',
        roots: candidates.map((root) => root.repositoryId),
        routedTo: 'adjudication',
        reason: 'contradicted-pending-adjudication',
      });
    }
  });

  it('the three candidate counts produce three distinct result shapes', () => {
    const zero = designateRoots([candidate(repoA, false)]);
    const one = designateRoots([candidate(repoA, true)]);
    const two = designateRoots([candidate(repoA, true), candidate(repoB, true)]);
    expect(new Set([zero.status, one.status, two.status]).size).toBe(3);
  });
});
