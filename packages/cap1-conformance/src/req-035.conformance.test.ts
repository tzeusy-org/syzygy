import { describe, expect, it } from 'vitest';
import {
  composeUnknownReasons,
  computeCoverage,
  computeShapeAnswers,
  readDeclaration,
  type ConsentRecord,
  type ObservationOutcome,
  type ProjectId,
  type RepositoryId,
} from '@syzygy/cap1-core';
import { decisionsFor, consent, evaluation, projectYaml } from './fixtures/index.js';

// CAP1-REQ-035 — Several reasons may be visible at once; one never
// hides the others (event-response).
//
// Case: a checker constructs a claim with two applicable conditions
// (here: one unconsented repository and one unreachable repository both
// constituent to the `Observable` answer — an instance of the
// requirement's "e.g."). Observable: the served reason set on the claim
// instance. Oracle: the served instance carries one primary and the
// applicable secondaries, each verbatim; set comparison against the
// fixture's known conditions; bounded — one claim, one set. Oracle
// independence: the fixture defines which conditions hold; the
// vocabulary defines the spellings — hard-coded below from RFC2-24,
// never imported. Falsifier: a claim with two known conditions served
// with one reason and no secondary, or a secondary spelling outside the
// twelve.

const TWELVE_REASONS = [
  'missing-declaration',
  'missing-evidence',
  'no-currency-bound-declared',
  'stale-beyond-currency-bound',
  'mapping-coverage-absent',
  'unconsented-source-or-provider',
  'excluded-content',
  'contradicted-pending-adjudication',
  'challenge-suspended',
  'source-uncaptured-or-unreachable',
  'reference-unresolvable',
  'execution-blocked',
] as const;

const PROJECT = 'prj-shape-035' as ProjectId;
const EVALUATION = evaluation('snap-035');

// Two repositories: repo-a has no consent record (condition 1:
// unconsented), repo-b is consented but unreachable (condition 2:
// uncaptured). Both conditions are constituent to `Observable`.
const SOURCE = projectYaml({
  id: PROJECT,
  name: 'Two Conditions Fixture',
  repositories: [
    { id: 'repo-a', role: 'governance-root', consent: 'consent-a' },
    { id: 'repo-b', role: 'observed-source', consent: 'consent-b' },
  ],
  consents: ['consent-b'],
});

const CONSENTS: ConsentRecord[] = [
  // repo-a deliberately has NO record.
  consent({
    id: 'consent-b',
    projectId: PROJECT,
    repositoryId: 'repo-b' as RepositoryId,
  }),
];

const OBSERVATIONS: ObservationOutcome[] = [
  { repositoryId: 'repo-b' as RepositoryId, outcome: 'unreachable' },
];

function observableAnswer() {
  const read = readDeclaration(SOURCE);
  if (!read.ok) throw new Error('fixture must be valid');
  const set = computeShapeAnswers(PROJECT, EVALUATION, {
    coverage: computeCoverage(
      read.declaration,
      decisionsFor(read.declaration, CONSENTS),
      OBSERVATIONS,
    ),
  });
  return set.answers[3];
}

describe('CAP1-REQ-035 — several reasons may be visible at once; one never hides the others', () => {
  it('scenario/oracle: two known conditions, both served — one primary plus the applicable secondary, each verbatim; set comparison against the fixture', () => {
    const answer = observableAnswer();
    expect(answer.name).toBe('Observable');
    expect(answer.render.value).toBe('Unknown');
    if (answer.render.value !== 'Unknown') throw new Error('unreachable');
    const { reasons } = answer.render;
    // The fixture's known conditions, hard-coded verbatim (declaration
    // order: repo-a's unconsented state first, repo-b's unreachability
    // second):
    expect(reasons.primary).toBe('unconsented-source-or-provider');
    expect(reasons.secondary).toEqual(['source-uncaptured-or-unreachable']);
    // Set comparison — served set == fixture's condition set, exactly:
    const served = [reasons.primary, ...reasons.secondary].sort();
    expect(served).toEqual(
      ['source-uncaptured-or-unreachable', 'unconsented-source-or-provider'].sort(),
    );
  });

  it('the secondary is marked as secondary and never folded into primary counts — the primary is exactly one, by shape', () => {
    const answer = observableAnswer();
    if (answer.render.value !== 'Unknown') throw new Error('fixture must render Unknown');
    // The reason set's shape carries the marking: one `primary` field
    // (a single reason, never a list) and a `secondary` list.
    expect(Object.keys(answer.render.reasons).sort()).toEqual(['primary', 'secondary']);
    expect(typeof answer.render.reasons.primary).toBe('string');
    expect(Array.isArray(answer.render.reasons.secondary)).toBe(true);
  });

  it('falsifier: two known conditions are never served with one reason and no secondary', () => {
    const answer = observableAnswer();
    if (answer.render.value !== 'Unknown') throw new Error('fixture must render Unknown');
    expect(answer.render.reasons.secondary.length).toBeGreaterThan(0);
  });

  it('falsifier: every served spelling — primary and secondary — is inside the closed twelve', () => {
    const answer = observableAnswer();
    if (answer.render.value !== 'Unknown') throw new Error('fixture must render Unknown');
    const served = [answer.render.reasons.primary, ...answer.render.reasons.secondary];
    for (const reason of served) {
      expect(TWELVE_REASONS).toContain(reason);
    }
  });

  it('composition is deterministic and duplicate-free: repeated conditions collapse, order is first-applicable-first', () => {
    const composed = composeUnknownReasons([
      'unconsented-source-or-provider',
      'source-uncaptured-or-unreachable',
      'unconsented-source-or-provider', // duplicate condition
    ]);
    expect(composed.primary).toBe('unconsented-source-or-provider');
    expect(composed.secondary).toEqual(['source-uncaptured-or-unreachable']);
  });

  it('a single-condition claim serves one primary and an empty secondary set — nothing is invented', () => {
    const composed = composeUnknownReasons(['missing-evidence']);
    expect(composed.primary).toBe('missing-evidence');
    expect(composed.secondary).toEqual([]);
  });
});
