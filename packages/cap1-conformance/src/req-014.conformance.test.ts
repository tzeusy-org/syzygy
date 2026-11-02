import { describe, expect, it } from 'vitest';
import {
  computeCoverage,
  coverageBoundary,
  isComplete,
  readDeclaration,
  type ConsentRecord,
  type ObservationOutcome,
  type ProjectDeclaration,
  type ProjectId,
  type RepositoryId,
} from '@syzygy/cap1-core';
import { decisionsFor, consent, projectYaml } from './fixtures/index.js';

// CAP1-REQ-014 — Incomplete coverage is never rendered as complete
// coverage.
//
// Case: a fixture where one of two consented repositories could not be
// fully captured. Oracle: the partial capture carries an explicit
// captured-scope declaration, the uncaptured portion renders Unknown,
// and no full-scope claim renders as whole (RFC2-23 "Partial snapshot").
// Oracle independence: the fixture defines which source is partial; the
// disclosure obligation comes from RFC2-23, not from the implementation.
//
// The "enumerated aggregate set" of the pure layer is small by design:
// the full-scope claims this layer can serve are `isComplete` and the
// boundary's declared scopes — both swept below. Human-view aggregates
// arrive with later slices and take their own sweeps then.

const PROJECT = 'prj-partial-e5' as ProjectId;

const SOURCE = projectYaml({
  id: PROJECT,
  name: 'Partial Snapshot Fixture',
  repositories: [
    { id: 'repo-full', role: 'governance-root', consent: 'consent-f' },
    { id: 'repo-partial', role: 'observed-source', consent: 'consent-p' },
  ],
  consents: ['consent-f', 'consent-p'],
});

function declaration(): ProjectDeclaration {
  const read = readDeclaration(SOURCE);
  if (!read.ok) throw new Error('fixture must be valid');
  return read.declaration;
}

const CONSENTS: ConsentRecord[] = [
  consent({
    id: 'consent-f',
    projectId: PROJECT,
    repositoryId: 'repo-full' as RepositoryId,
  }),
  consent({
    id: 'consent-p',
    projectId: PROJECT,
    repositoryId: 'repo-partial' as RepositoryId,
  }),
];

const OBSERVATIONS: ObservationOutcome[] = [
  {
    repositoryId: 'repo-full' as RepositoryId,
    outcome: 'captured',
    capturedScope: 'full-tree',
  },
  {
    repositoryId: 'repo-partial' as RepositoryId,
    outcome: 'captured-partial',
    capturedScope: 'docs/ only',
    declaredScope: 'full-tree',
  },
];

describe('CAP1-REQ-014 — incomplete coverage is never rendered as complete coverage', () => {
  it('scenario: partial snapshot disclosed — the partial capture declares its captured scope and renders its uncaptured portion Unknown', () => {
    const result = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      OBSERVATIONS,
    );
    const partial = result.repositories.find(
      (e) => e.repositoryId === ('repo-partial' as RepositoryId),
    );
    expect(partial?.state).toBe('degraded-partial');
    if (partial?.state === 'degraded-partial') {
      // The explicit captured-scope declaration (RFC2-23).
      expect(partial.capturedScope).toBe('docs/ only');
      expect(partial.declaredScope).toBe('full-tree');
      // The uncaptured portion renders Unknown, verbatim reason #10.
      expect(partial.uncaptured.label).toBe('Unknown');
      expect(partial.uncaptured.reason).toBe('source-uncaptured-or-unreachable');
    }
  });

  it('isComplete is false for any partial capture', () => {
    const result = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      OBSERVATIONS,
    );
    expect(isComplete(result)).toBe(false);
  });

  it('isComplete is true only when every repository is fully observed', () => {
    const fullOnly: ObservationOutcome[] = [
      { repositoryId: 'repo-full' as RepositoryId, outcome: 'captured', capturedScope: 'full-tree' },
      { repositoryId: 'repo-partial' as RepositoryId, outcome: 'captured', capturedScope: 'full-tree' },
    ];
    const whole = computeCoverage(declaration(), decisionsFor(declaration(), CONSENTS), fullOnly);
    expect(isComplete(whole)).toBe(true);
    // Removing one repository's capture flips completeness — the claim
    // tracks the full denominator, not the captured part.
    const missingOne = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      [fullOnly[0] as ObservationOutcome],
    );
    expect(isComplete(missingOne)).toBe(false);
  });

  it('falsifier: a full-scope claim over partial data is impossible — a partial outcome can never render as observed', () => {
    const result = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      OBSERVATIONS,
    );
    const partial = result.repositories.find(
      (e) => e.repositoryId === ('repo-partial' as RepositoryId),
    );
    // The state machine has no path from 'captured-partial' to
    // 'observed': the whole is never claimed from a part.
    expect(partial?.state).not.toBe('observed');
    expect(isComplete(result)).toBe(false);
  });

  it('the boundary over a partial snapshot carries the declared captured scopes, not an undisclosed whole', () => {
    const result = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      OBSERVATIONS,
    );
    const boundary = coverageBoundary(result);
    const declared = boundary.declaredCapturedScopes.find(
      (s) => s.repositoryId === ('repo-partial' as RepositoryId),
    );
    expect(declared?.capturedScope).toBe('docs/ only');
  });
});
