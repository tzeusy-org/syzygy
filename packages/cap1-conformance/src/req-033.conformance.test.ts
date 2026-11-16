import { describe, expect, it } from 'vitest';
import {
  computeCoverage,
  computeShapeAnswers,
  readDeclaration,
  registerProject,
  type ConsentRecord,
  type EvaluationIdentity,
  type ObservationOutcome,
  type ProjectId,
  type RepositoryId,
  type ShapeAnswerInputs,
} from '@syzygy/cap1-core';
import { decisionsFor, consent, evaluation, projectYaml } from './fixtures/index.js';

// CAP1-REQ-033 — Every answer exposes its constituent facts and scope
// (state projection/query).
//
// Case: a checker selects one shape answer and requests its facts.
// Observable: the fact set — constituent facts, declared scope,
// producing evaluation. Oracle: the served fact set is non-empty, names
// the scope, every fact resolves (is served in full), and the served
// value's stated basis references only facts present in the set;
// per-answer check, bounded at seven answers. Oracle independence:
// resolvability is checked by following the served facts, not by
// trusting the answer. Falsifier: an answer served with no reachable
// constituent facts, or facts that do not support the served value's
// stated basis.

const PROJECT = 'prj-shape-033' as ProjectId;
const EVALUATION = evaluation('snap-033');

const SOURCE = projectYaml({
  id: PROJECT,
  name: 'Facts Fixture',
  repositories: [
    { id: 'repo-main', role: 'governance-root', consent: 'consent-1' },
    { id: 'repo-unconsented', role: 'observed-source', consent: 'consent-2' },
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

function evidencedInputs(): ShapeAnswerInputs {
  const read = readDeclaration(SOURCE);
  if (!read.ok) throw new Error('fixture must be valid');
  return {
    registration: registerProject(read, 'rev-1'),
    shapeReferences: [{ reference: 'declarations/spec_root', resolution: 'resolved' }],
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

// The all-absent fixture: no evidence anywhere — the hardest case for
// "an answer whose constituent facts cannot be served is not a servable
// answer": absence itself must be served as a fact.
const ABSENT_INPUTS: ShapeAnswerInputs = {};

function checkFactSet(answer: {
  readonly name: string;
  readonly factSet: {
    readonly scope: string;
    readonly evaluation: EvaluationIdentity;
    readonly facts: readonly { readonly name: string; readonly value: string }[];
    readonly basis: readonly string[];
  };
}): void {
  const { factSet } = answer;
  // Non-empty:
  expect(factSet.facts.length, answer.name).toBeGreaterThan(0);
  // Names the scope:
  expect(factSet.scope, answer.name).toBe(`project:${PROJECT}`);
  // Carries the producing evaluation:
  expect(factSet.evaluation, answer.name).toEqual(EVALUATION);
  // Every fact resolves — served in full, name and value both present:
  for (const fact of factSet.facts) {
    expect(fact.name.length, answer.name).toBeGreaterThan(0);
    expect(fact.value.length, answer.name).toBeGreaterThan(0);
  }
  // The stated basis references only facts present in the set, and is
  // itself non-empty (a value resting on nothing is unsupported):
  expect(factSet.basis.length, answer.name).toBeGreaterThan(0);
  const factNames = factSet.facts.map((fact) => fact.name);
  for (const basisName of factSet.basis) {
    expect(factNames, answer.name).toContain(basisName);
  }
}

describe('CAP1-REQ-033 — every answer exposes its constituent facts and scope', () => {
  it('oracle: per-answer check over the evidenced fixture — seven fact sets, each non-empty, scoped, evaluation-bearing, basis-supported', () => {
    const set = computeShapeAnswers(PROJECT, EVALUATION, evidencedInputs());
    expect(set.answers).toHaveLength(7); // denominator disclosed
    for (const answer of set.answers) checkFactSet(answer);
  });

  it('oracle: per-answer check over the all-absent fixture — absence is itself a served fact, never a factless answer', () => {
    const set = computeShapeAnswers(PROJECT, EVALUATION, ABSENT_INPUTS);
    expect(set.answers).toHaveLength(7); // denominator disclosed
    for (const answer of set.answers) checkFactSet(answer);
  });

  it('scenario: the facts behind `Observable` — the coverage and consent states and the producing evaluation it was computed from are served', () => {
    const set = computeShapeAnswers(PROJECT, EVALUATION, evidencedInputs());
    const observable = set.answers[3];
    expect(observable.name).toBe('Observable');
    const facts = observable.factSet.facts;
    // One fact per declared repository (the coverage boundary):
    const names = facts.map((fact) => fact.name);
    expect(names).toContain('repository:repo-main');
    expect(names).toContain('repository:repo-unconsented');
    // Consent state is served: the observed repository cites its consent
    // record by id; the unconsented one names its policy state.
    const main = facts.find((fact) => fact.name === 'repository:repo-main');
    expect(main?.value).toContain('consent consent-1 in-force');
    const unconsented = facts.find((fact) => fact.name === 'repository:repo-unconsented');
    expect(unconsented?.value).toContain('unconsented');
    // The producing evaluation:
    expect(observable.factSet.evaluation).toEqual(EVALUATION);
  });

  it('falsifier: no answer in either fixture is served with unreachable constituent facts — the sweep covers all 14 fact sets', () => {
    const evidenced = computeShapeAnswers(PROJECT, EVALUATION, evidencedInputs());
    const absent = computeShapeAnswers(PROJECT, EVALUATION, ABSENT_INPUTS);
    const population = [...evidenced.answers, ...absent.answers];
    expect(population).toHaveLength(14); // denominator disclosed
    for (const answer of population) {
      expect(answer.factSet.facts.length, answer.name).toBeGreaterThan(0);
    }
  });

  it('falsifier: the served value\'s stated basis never references a fact outside the set', () => {
    const set = computeShapeAnswers(PROJECT, EVALUATION, evidencedInputs());
    for (const answer of set.answers) {
      const factNames = new Set(answer.factSet.facts.map((fact) => fact.name));
      const outside = answer.factSet.basis.filter((name) => !factNames.has(name));
      expect(outside, answer.name).toEqual([]);
    }
  });
});
