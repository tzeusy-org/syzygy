import { describe, expect, it } from 'vitest';
import {
  computeCoverage,
  computeShapeAnswers,
  readDeclaration,
  registerProject,
  type ConsentRecord,
  type ObservationOutcome,
  type ProjectId,
  type RepositoryId,
  type ShapeAnswerInputs,
} from '@syzygy/cap1-core';
import { decisionsFor, consent, evaluation, projectYaml } from './fixtures/index.js';

// CAP1-REQ-030 — The seven project-shape answers, defined here and
// answered independently (state projection/query).
//
// Case: a checker queries the shape answers for a registered project.
// Oracle: the answer set contains exactly the seven names ruled by
// SDR-36, each carrying its own value and fact set; count and name
// comparison, bounded at seven. Oracle independence: the expected names
// are hard-coded below from the recorded owner ruling (SDR-36) as the
// spec authors them — never imported from the implementation.
// Falsifier: a missing or extra answer, an answer whose value is a
// function of another answer's value, or a renamed answer.

// The seven names, verbatim from SDR-36 as authored at CAP1-REQ-030 —
// hard-coded, in the requirement's own order.
const SEVEN_NAMES = [
  'Registered',
  'Shape present',
  'Human-understandable',
  'Observable',
  'Traceable',
  'Mission-ready',
  'Reconciled',
] as const;

// The closed value domain: the three SDR-35 spellings plus
// Mission-ready's deferred-posture value (CAP1-REQ-036) — hard-coded.
const VALUE_DOMAIN = ['satisfied', 'Gap', 'Unknown', 'not evaluated'] as const;

const PROJECT = 'prj-shape-030' as ProjectId;
const EVALUATION = evaluation('snap-030');

const SOURCE = projectYaml({
  id: PROJECT,
  name: 'Shape Fixture',
  repositories: [
    { id: 'repo-main', role: 'governance-root', consent: 'consent-1' },
  ],
  consents: ['consent-1'],
});

const CONSENTS: ConsentRecord[] = [
  consent({
    id: 'consent-1',
    projectId: PROJECT,
    repositoryId: 'repo-main' as RepositoryId,
  }),
];

const OBSERVATIONS: ObservationOutcome[] = [
  { repositoryId: 'repo-main' as RepositoryId, outcome: 'captured', capturedScope: 'full-tree' },
];

function registeredInputs(): ShapeAnswerInputs {
  const read = readDeclaration(SOURCE);
  if (!read.ok) throw new Error('fixture must be valid');
  return {
    registration: registerProject(read, 'rev-1'),
    shapeReferences: [
      { reference: 'declarations/spec_root', resolution: 'resolved' },
      { reference: 'declarations/topology', resolution: 'resolved' },
    ],
    comprehension: [{ recordId: 'walkthrough-1', ownerVerdict: 'stands' }],
    coverage: computeCoverage(
      read.declaration,
      decisionsFor(read.declaration, CONSENTS),
      OBSERVATIONS,
    ),
    links: [{ link: 'overview->spec', resolved: true }],
    reconciliation: {
      computed: true,
      outcome: 'satisfied',
      declaredScope: 'merged-work',
      mergedWork: [{ workId: 'w1' }],
    },
  };
}

describe('CAP1-REQ-030 — the seven project-shape answers, answered independently', () => {
  it('oracle: exactly the seven SDR-36 names, in order — count and name comparison against the hard-coded ruling', () => {
    const set = computeShapeAnswers(PROJECT, EVALUATION, registeredInputs());
    expect(set.answers).toHaveLength(7); // bounded: seven entries
    expect(set.answers.map((answer) => answer.name)).toEqual([...SEVEN_NAMES]);
  });

  it('oracle: each answer carries its own value and its own constituent-fact set', () => {
    const set = computeShapeAnswers(PROJECT, EVALUATION, registeredInputs());
    for (const answer of set.answers) {
      expect(typeof answer.render.value).toBe('string');
      expect(answer.factSet.facts.length).toBeGreaterThan(0);
      expect(answer.factSet.evaluation).toEqual(EVALUATION);
    }
  });

  it('the value domain is closed at three spellings plus the deferred posture — `satisfied` verbatim, swept over all seven', () => {
    const set = computeShapeAnswers(PROJECT, EVALUATION, registeredInputs());
    expect(set.answers).toHaveLength(7); // denominator disclosed
    for (const answer of set.answers) {
      expect(VALUE_DOMAIN).toContain(answer.render.value);
    }
    // The satisfied state renders with the verbatim spelling `satisfied`
    // — lowercase, exactly this string (CAP1-REQ-030's authored value).
    const registered = set.answers[0];
    expect(registered.render.value).toBe('satisfied');
    expect(registered.render.value).not.toBe('Satisfied');
  });

  it('falsifier: no answer is renamed, missing, or extra — strict name-set equality against the ruling', () => {
    const set = computeShapeAnswers(PROJECT, EVALUATION, registeredInputs());
    const served = set.answers.map((answer) => answer.name);
    // No extra name:
    for (const name of served) expect(SEVEN_NAMES).toContain(name);
    // No missing name:
    for (const name of SEVEN_NAMES) expect(served).toContain(name);
  });

  it('falsifier: no answer\'s value is a function of another answer\'s value — flipping one facet\'s own facts moves no sibling', () => {
    const baseline = computeShapeAnswers(PROJECT, EVALUATION, registeredInputs());
    // Flip Traceable's own constituent fact (a link stops resolving):
    const flipped = computeShapeAnswers(PROJECT, EVALUATION, {
      ...registeredInputs(),
      links: [{ link: 'overview->spec', resolved: false }],
    });
    expect(flipped.answers[4].render.value).toBe('Gap'); // Traceable moved
    // Every sibling's render is byte-identical to baseline:
    const siblings = [0, 1, 2, 3, 5, 6] as const;
    for (const i of siblings) {
      expect(JSON.stringify(flipped.answers[i].render)).toBe(
        JSON.stringify(baseline.answers[i].render),
      );
    }
  });

  it('scenario: seven independent answers served for a registered project, each with constituent facts', () => {
    const set = computeShapeAnswers(PROJECT, EVALUATION, registeredInputs());
    expect(set.projectId).toBe(PROJECT);
    // Each answer's stated basis references only facts present in its
    // own set — its value rests on its own facts, nothing else.
    for (const answer of set.answers) {
      const factNames = answer.factSet.facts.map((fact) => fact.name);
      for (const basisName of answer.factSet.basis) {
        expect(factNames).toContain(basisName);
      }
    }
  });
});
