import { describe, expect, it } from 'vitest';
import {
  computeCoverage,
  readDeclaration,
  type ConsentRecord,
  type ObservationOutcome,
  type ProjectDeclaration,
  type ProjectId,
  type RepositoryId,
} from '@syzygy/cap1-core';
import { decisionsFor, consent, projectYaml } from './fixtures/index.js';

// CAP1-REQ-013 — Coverage failure states are distinguishable.
//
// Sweep (the requirement's own case): produce each of the four named
// conditions in one fixture and record the four rendered states —
// denominator: the four conditions; six pairwise comparisons. Oracle:
// the four rendered (state, reason) values are pairwise distinct and
// each reason matches its closed-vocabulary entry verbatim (expected
// strings written literally from RFC2-24, outside the implementation).
//
// Mapping note: the machine-readable `state` discriminants swept here
// ('unconsented', 'capture-failed', 'stale', 'degraded-partial') are
// implementation vocabulary, not spec vocabulary. The spec's fourth
// condition is "an observer failure as its degradation state with
// degrade-to-last-good marked stale/broken (RFC2-23)"; in this pure
// layer the degradation renders as the partial-capture state with its
// declared scopes and Unknown remainder — degrade-to-LAST-GOOD needs an
// observation history and is the daemon slice's to test.

const PROJECT = 'prj-distinct-d4' as ProjectId;

const SOURCE = projectYaml({
  id: PROJECT,
  name: 'Distinguishability Fixture',
  repositories: [
    { id: 'repo-no-consent', role: 'observed-source', consent: 'consent-absent' },
    { id: 'repo-unreachable', role: 'observed-source', consent: 'consent-u' },
    { id: 'repo-stale', role: 'observed-source', consent: 'consent-s' },
    { id: 'repo-degraded', role: 'governance-root', consent: 'consent-d' },
  ],
  consents: ['consent-u', 'consent-s', 'consent-d'],
});

function declaration(): ProjectDeclaration {
  const read = readDeclaration(SOURCE);
  if (!read.ok) throw new Error('fixture must be valid');
  return read.declaration;
}

function inForce(id: string, repositoryId: string): ConsentRecord {
  return consent({ id, projectId: PROJECT, repositoryId: repositoryId as RepositoryId });
}

const CONSENTS: ConsentRecord[] = [
  // repo-no-consent: no record at all — condition 1 (missing consent).
  inForce('consent-u', 'repo-unreachable'),
  inForce('consent-s', 'repo-stale'),
  inForce('consent-d', 'repo-degraded'),
];

const OBSERVATIONS: ObservationOutcome[] = [
  // Condition 2: consented but unreachable at snapshot time.
  { repositoryId: 'repo-unreachable' as RepositoryId, outcome: 'unreachable' },
  // Condition 3: evidence past its currency bound.
  { repositoryId: 'repo-stale' as RepositoryId, outcome: 'stale' },
  // Condition 4: observer degradation — a partial capture.
  {
    repositoryId: 'repo-degraded' as RepositoryId,
    outcome: 'captured-partial',
    capturedScope: 'src/ only',
    declaredScope: 'full-tree',
  },
];

// The rendered (state, reason) value of an entry, for the pairwise
// comparison. For the degraded state the reason is the Unknown its
// uncaptured remainder carries.
function renderedValue(entry: {
  state: string;
  reason?: string;
  uncaptured?: { reason: string };
}): string {
  return `${entry.state}:${entry.reason ?? entry.uncaptured?.reason ?? ''}`;
}

describe('CAP1-REQ-013 — coverage failure states are distinguishable', () => {
  it('sweep: the four conditions render four states, pairwise distinct in the machine-readable state field — denominator: the full fixture repository set', () => {
    const decl = declaration();
    const result = computeCoverage(decl, decisionsFor(decl, CONSENTS), OBSERVATIONS);
    // The sweep covers every declared repository, not a sample.
    expect(result.repositories).toHaveLength(decl.repositories.length);
    expect(result.repositories).toHaveLength(4);

    const states = result.repositories.map((e) => e.state);
    expect(states).toEqual(['unconsented', 'capture-failed', 'stale', 'degraded-partial']);

    // Six pairwise comparisons over the rendered (state, reason) values.
    const values = result.repositories.map((e) => renderedValue(e));
    for (let i = 0; i < values.length; i += 1) {
      for (let j = i + 1; j < values.length; j += 1) {
        expect(values[i]).not.toBe(values[j]);
      }
    }
  });

  it('each reason matches its closed-vocabulary entry verbatim', () => {
    const result = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      OBSERVATIONS,
    );
    const byId = new Map(result.repositories.map((e) => [e.repositoryId as string, e]));

    const noConsent = byId.get('repo-no-consent');
    expect(noConsent?.state).toBe('unconsented');
    if (noConsent?.state === 'unconsented') {
      expect(noConsent.reason).toBe('unconsented-source-or-provider'); // #6
    }

    const unreachable = byId.get('repo-unreachable');
    expect(unreachable?.state).toBe('capture-failed');
    if (unreachable?.state === 'capture-failed') {
      expect(unreachable.reason).toBe('source-uncaptured-or-unreachable'); // #10
    }

    const stale = byId.get('repo-stale');
    expect(stale?.state).toBe('stale');
    if (stale?.state === 'stale') {
      expect(stale.reason).toBe('stale-beyond-currency-bound'); // #4
    }

    const degraded = byId.get('repo-degraded');
    expect(degraded?.state).toBe('degraded-partial');
    if (degraded?.state === 'degraded-partial') {
      expect(degraded.uncaptured.label).toBe('Unknown');
      expect(degraded.uncaptured.reason).toBe('source-uncaptured-or-unreachable'); // #10
    }
  });

  it('scenario: unreachable is not unconsented — the consented-but-unreachable repository and the recordless one render different reasons', () => {
    const result = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      OBSERVATIONS,
    );
    const unreachable = result.repositories.find(
      (e) => e.repositoryId === ('repo-unreachable' as RepositoryId),
    );
    const noConsent = result.repositories.find(
      (e) => e.repositoryId === ('repo-no-consent' as RepositoryId),
    );
    expect(unreachable?.state).toBe('capture-failed');
    expect(noConsent?.state).toBe('unconsented');
    if (unreachable?.state === 'capture-failed' && noConsent?.state === 'unconsented') {
      expect(unreachable.reason).toBe('source-uncaptured-or-unreachable');
      expect(noConsent.reason).toBe('unconsented-source-or-provider');
      expect(unreachable.reason).not.toBe(noConsent.reason);
    }
  });

  it('falsifier: a stale observation is not rendered as current, and an observer degradation is not rendered as missing consent', () => {
    const result = computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      OBSERVATIONS,
    );
    const stale = result.repositories.find(
      (e) => e.repositoryId === ('repo-stale' as RepositoryId),
    );
    expect(stale?.state).not.toBe('observed');
    const degraded = result.repositories.find(
      (e) => e.repositoryId === ('repo-degraded' as RepositoryId),
    );
    expect(degraded?.state).not.toBe('unconsented');
    expect(degraded?.state).not.toBe('observed');
  });
});
