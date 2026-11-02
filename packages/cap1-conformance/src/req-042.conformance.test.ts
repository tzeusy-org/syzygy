import { describe, expect, it } from 'vitest';
import {
  answersAgree,
  assessCurrency,
  computeCoverage,
  coverageBoundary,
  designateRoots,
  deterministicLayer,
  evaluationId,
  isComplete,
  queryKey,
  readDeclaration,
  registerProject,
  renderState,
  runQuery,
  type ConsentRecord,
  type EvaluationIdentity,
  type ProjectId,
  type QueryEnvelope,
  type RepositoryId,
} from '@syzygy/cap1-core';
import { decisionsFor, evaluation, projectYaml } from './fixtures/index.js';

// CAP1-REQ-042 — Equivalent queries at one revision expose equivalent
// facts (invariant).
//
// Case: all repeated equivalent queries; sweep: issue each Capability 1
// query twice at a pinned evaluation and diff — denominator: the query
// set below. Oracle: deterministic-layer equality per pair; stamp
// present per answer — judged by comparison of independent runs, never
// by either run's own claim (oracle independence). Falsifier: an
// unstamped answer, or two equivalent queries disagreeing at one
// evaluation.

const PROJECT = 'prj-query-eq-11' as ProjectId;
const REPO = 'repo-query-eq-01' as RepositoryId;

const SOURCE = projectYaml({
  id: PROJECT,
  name: 'Query Equivalence Fixture',
  repositories: [
    { id: 'repo-query-eq-01', role: 'governance-root', consent: 'consent-q1' },
  ],
  consents: ['consent-q1'],
});

const CONSENTS: readonly ConsentRecord[] = [
  {
    id: 'consent-q1',
    projectId: PROJECT,
    repositoryId: REPO,
    scope: 'observe',
    attribution: 'uniquosity@gmail.com',
    grantState: 'in-force',
  },
];

// The pinned evaluation identity: (source snapshot, as-of instant).
const EVALUATION = evaluation('snap-2026-08-21-a');

function declaration() {
  const read = readDeclaration(SOURCE);
  if (!read.ok) throw new Error('fixture must parse');
  return read.declaration;
}

// The query set — the sweep's denominator. Every pure Capability 1
// query exported by cap1-core so far is enumerated here; each entry is
// issued twice at the pinned evaluation and the pair is diffed.
const QUERIES: readonly { readonly name: string; readonly run: () => unknown }[] = [
  { name: 'registerProject(valid)', run: () => registerProject(readDeclaration(SOURCE), EVALUATION.snapshot) },
  {
    name: 'registerProject(invalid)',
    run: () => registerProject(readDeclaration(SOURCE.replace('owner: uniquosity@gmail.com', 'owner: ""')), EVALUATION.snapshot),
  },
  {
    name: 'designateRoots',
    run: () => designateRoots([{ repositoryId: REPO, hasDeclaration: true }]),
  },
  {
    name: 'computeCoverage',
    run: () =>
      computeCoverage(declaration(), decisionsFor(declaration(), CONSENTS), [
        { repositoryId: REPO, outcome: 'captured', capturedScope: 'full' },
      ]),
  },
  {
    name: 'coverageBoundary',
    run: () =>
      coverageBoundary(
        computeCoverage(declaration(), decisionsFor(declaration(), CONSENTS), [
          { repositoryId: REPO, outcome: 'captured', capturedScope: 'full' },
        ]),
      ),
  },
  {
    name: 'isComplete',
    run: () => isComplete(computeCoverage(
      declaration(),
      decisionsFor(declaration(), CONSENTS),
      []),
    ),
  },
  {
    name: 'assessCurrency',
    run: () =>
      assessCurrency(
        'shape-claims',
        { observedAt: '2026-08-20T00:00:00Z' },
        [{ claimClass: 'shape-claims', maxAgeMs: 7 * 24 * 60 * 60 * 1000 }],
        EVALUATION.asOf,
      ),
  },
  {
    name: 'renderState',
    run: () =>
      renderState({ status: 'registered' }, [
        {
          id: 'prop-1',
          kind: 'spec-delta',
          subject: 'declaration repair',
          exclusivityGroup: 'grp-1',
          plane: 'proposed',
        },
      ]),
  },
];

describe('CAP1-REQ-042 — equivalent queries at one evaluation expose equivalent facts', () => {
  it('sweep: each Capability 1 query issued twice at the pinned evaluation agrees, pair by pair', () => {
    // Denominator disclosed: the whole query set, no sampling.
    expect(QUERIES.length).toBe(8);
    for (const query of QUERIES) {
      const envelope: QueryEnvelope = {
        selection: query.name,
        evaluation: EVALUATION,
        filters: {},
        scenarioContext: 'none',
      };
      const first = runQuery(envelope, query.run);
      const second = runQuery(envelope, query.run);
      // Deterministic-layer equality, judged by comparing the two
      // independent runs — not by any self-report.
      expect(deterministicLayer(second.answer)).toBe(deterministicLayer(first.answer));
      expect(answersAgree(first, second)).toBe(true);
    }
  });

  it('every answer names the evaluation identity it was computed at', () => {
    for (const query of QUERIES) {
      const stamped = runQuery(
        { selection: query.name, evaluation: EVALUATION, filters: {}, scenarioContext: 'none' },
        query.run,
      );
      // The stamp is present and names the pinned pair — expected
      // spellings hard-coded, not read back from the implementation.
      expect(stamped.evaluation.snapshot).toBe('snap-2026-08-21-a');
      expect(stamped.evaluation.asOf).toBe('2026-08-21T00:00:00Z');
    }
  });

  it('the canonical evaluation id is built from the pair and nothing else (RFC2-3)', () => {
    expect(evaluationId(EVALUATION)).toBe('snap-2026-08-21-a@2026-08-21T00:00:00Z');
  });

  it('equivalence ignores filter key order — same selection, evaluation, filters, context is one query', () => {
    const a: QueryEnvelope = {
      selection: 'coverage',
      evaluation: EVALUATION,
      filters: { repo: 'repo-query-eq-01', state: 'observed' },
      scenarioContext: 'none',
    };
    const b: QueryEnvelope = {
      selection: 'coverage',
      evaluation: EVALUATION,
      filters: { state: 'observed', repo: 'repo-query-eq-01' },
      scenarioContext: 'none',
    };
    expect(queryKey(b)).toBe(queryKey(a));
  });

  it('falsifier: two answers disagreeing at one evaluation are detected as disagreement', () => {
    const first = { evaluation: EVALUATION, answer: { value: 'satisfied' } };
    const second = { evaluation: EVALUATION, answer: { value: 'Gap' } };
    expect(answersAgree(first, second)).toBe(false);
  });

  it('falsifier: answers stamped with different evaluations never count as one agreeing pair', () => {
    const other: EvaluationIdentity = { snapshot: 'snap-other', asOf: EVALUATION.asOf };
    const first = { evaluation: EVALUATION, answer: { value: 1 } };
    const second = { evaluation: other, answer: { value: 1 } };
    expect(answersAgree(first, second)).toBe(false);
  });

  it('a different evaluation may lawfully answer differently — equivalence is scoped to one identity', () => {
    const envelopeA: QueryEnvelope = {
      selection: 'assessCurrency',
      evaluation: EVALUATION,
      filters: {},
      scenarioContext: 'none',
    };
    const laterEvaluation: EvaluationIdentity = {
      snapshot: EVALUATION.snapshot,
      asOf: '2026-12-01T00:00:00Z',
    };
    const bounds = [{ claimClass: 'shape-claims', maxAgeMs: 7 * 24 * 60 * 60 * 1000 }];
    const evidence = { observedAt: '2026-08-20T00:00:00Z' };
    const atPinned = runQuery(envelopeA, (e) =>
      assessCurrency('shape-claims', evidence, bounds, e.evaluation.asOf),
    );
    const atLater = runQuery({ ...envelopeA, evaluation: laterEvaluation }, (e) =>
      assessCurrency('shape-claims', evidence, bounds, e.evaluation.asOf),
    );
    // Different identity, different (lawful) answer — and each answer
    // names its own evaluation, so the difference is never silent.
    expect(atPinned.answer.state).toBe('current');
    expect(atLater.answer.state).toBe('stale');
    expect(atPinned.evaluation).not.toEqual(atLater.evaluation);
  });
});
