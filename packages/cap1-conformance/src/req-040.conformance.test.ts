import { describe, expect, it } from 'vitest';
import {
  EXPLANATION_CLASSES,
  WHY_THIS_ANSWER,
  computeCoverage,
  coverageBoundary,
  deterministicLayer,
  explainAnswer,
  internalReferences,
  presentClasses,
  readDeclaration,
  renderHuman,
  resolveExplanationReferences,
  serveMachine,
  type ConsentRecord,
  type ExplanationFactSet,
  type FactModel,
  type ProjectId,
  type RepositoryId,
} from '@syzygy/cap1-core';
import { decisionsFor, evaluation, projectYaml } from './fixtures/index.js';

// CAP1-REQ-040 — Every answer is explainable: "Why this answer?"
// (state projection/query).
//
// Case: a checker selects one answer and requests its explanation
// through both channels. Oracle: the served fact set carries the
// applicable RFC6-19 classes for the selection, and each internal
// reference in it resolves; per-class presence check, bounded: one fact
// set. Oracle independence: the class list is the accepted contract's;
// resolvability is checked by following references. Falsifier: an
// answer with no reachable explanation, an explanation missing an
// applicable class, or a fact-set field no accepted clause warrants.

const PROJECT = 'prj-drawer-40' as ProjectId;
const REPO = 'repo-drawer-01' as RepositoryId;

const SOURCE = projectYaml({
  id: PROJECT,
  name: 'Drawer Fixture',
  repositories: [
    { id: 'repo-drawer-01', role: 'governance-root', consent: 'consent-d1' },
  ],
  consents: ['consent-d1'],
});

const CONSENTS: readonly ConsentRecord[] = [
  {
    id: 'consent-d1',
    projectId: PROJECT,
    repositoryId: REPO,
    scope: 'observe',
    attribution: 'uniquosity@gmail.com',
    grantState: 'in-force',
  },
];

const EVALUATION = evaluation('snap-2026-08-21-d');

function fixtureBoundary() {
  const read = readDeclaration(SOURCE);
  if (!read.ok) throw new Error('fixture must parse');
  return coverageBoundary(
    computeCoverage(read.declaration, decisionsFor(read.declaration, CONSENTS), [
      { repositoryId: REPO, outcome: 'captured', capturedScope: 'full' },
    ]),
  );
}

// The one explanation fact set for a shape answer rendered Unknown —
// carrying the classes applicable to that selection.
function shapeAnswerExplanation(): ExplanationFactSet {
  return {
    selection: 'shape-answer:Observable@prj-drawer-40',
    evaluation: EVALUATION,
    scenarioContext: 'base',
    owningAuthority: {
      authority: 'openspec-change:project-registration-and-honest-shape-visibility',
      governingRevision: 'digest:spec-rev-7',
    },
    sourceRevision: 'digest:snapshot-rev-3',
    statePlane: 'observed',
    evidenceClassification: {
      label: 'Unknown',
      reasons: { primary: 'missing-evidence', secondary: [] },
      tier: 'declared-only',
      freshness: 'stale',
    },
    freshness: 'stale',
    unknownReasons: { primary: 'missing-evidence', secondary: [] },
    coverageAndConsentBoundary: fixtureBoundary(),
    challengeState: [{ challengeId: 'challenge-9', lifecycle: 'submitted' }],
    contradictionState: [],
    relatedWorkState: [{ workId: 'work-12' }],
    reconciliationState: 'reconciliation-pending',
  };
}

// The fixture's internal-reference registry — what the checker follows
// references INTO. Resolvability is judged by following, never by any
// self-report.
const RESOLVABLE = new Set<string>([
  'openspec-change:project-registration-and-honest-shape-visibility',
  'digest:spec-rev-7',
  'digest:snapshot-rev-3',
  'repo-drawer-01',
  'consent-d1',
  'challenge-9',
  'work-12',
]);

describe('CAP1-REQ-040 — every answer is explainable: "Why this answer?"', () => {
  it('serves one fact set under the literal human-view name', () => {
    const serving = explainAnswer(shapeAnswerExplanation());
    // The literal name, hard-coded — never read back from the
    // implementation constant.
    expect(WHY_THIS_ANSWER).toBe('Why this answer?');
    if (!serving.served) throw new Error('fact set must serve');
    expect(serving.name).toBe('Why this answer?');
  });

  it('scenario: a shape answer explanation carries owning authority, evidence classification, evaluation identity, and Unknown reasons', () => {
    const serving = explainAnswer(shapeAnswerExplanation());
    if (!serving.served) throw new Error('fact set must serve');
    expect(serving.factSet.owningAuthority?.authority).toBe(
      'openspec-change:project-registration-and-honest-shape-visibility',
    );
    expect(serving.factSet.owningAuthority?.governingRevision).toBe('digest:spec-rev-7');
    expect(serving.factSet.evidenceClassification?.label).toBe('Unknown');
    expect(serving.factSet.evaluation).toEqual({
      snapshot: 'snap-2026-08-21-d',
      asOf: '2026-08-21T00:00:00Z',
    });
    expect(serving.factSet.unknownReasons?.primary).toBe('missing-evidence');
  });

  it('per-class presence check over the closed class list, bounded: one fact set', () => {
    const present = presentClasses(shapeAnswerExplanation());
    // The applicable classes for this selection — every one of the
    // twelve, hard-coded (the class list is the accepted contract's,
    // RFC6-19; the enumeration order is the contract-mirroring type's).
    expect(present).toEqual([
      'owningAuthority',
      'sourceRevision',
      'statePlane',
      'evidenceClassification',
      'evaluation',
      'freshness',
      'unknownReasons',
      'coverageAndConsentBoundary',
      'challengeState',
      'contradictionState',
      'relatedWorkState',
      'reconciliationState',
    ]);
  });

  it('presence is per-class, never assumed: a sparse fact set reports only what it carries', () => {
    const sparse: ExplanationFactSet = {
      selection: 'registration:prj-drawer-40',
      evaluation: EVALUATION,
      scenarioContext: 'base',
      owningAuthority: {
        authority: 'openspec-change:project-registration-and-honest-shape-visibility',
        governingRevision: 'digest:spec-rev-7',
      },
    };
    expect(presentClasses(sparse)).toEqual(['owningAuthority', 'evaluation']);
  });

  it('the class enumeration is closed at twelve and matches the accepted contract classes', () => {
    // Hard-coded: no field outside the accepted contract's classes is
    // invented, and none of the twelve is dropped.
    expect(EXPLANATION_CLASSES.length).toBe(12);
    expect([...EXPLANATION_CLASSES]).toEqual([
      'owningAuthority',
      'sourceRevision',
      'statePlane',
      'evidenceClassification',
      'evaluation',
      'freshness',
      'unknownReasons',
      'coverageAndConsentBoundary',
      'challengeState',
      'contradictionState',
      'relatedWorkState',
      'reconciliationState',
    ]);
  });

  it('falsifier: a fact-set field no accepted clause warrants is unrepresentable — served keys stay inside envelope + classes', () => {
    const factSet = shapeAnswerExplanation();
    const envelope = ['selection', 'evaluation', 'scenarioContext'];
    const warranted = new Set<string>([...envelope, ...EXPLANATION_CLASSES]);
    for (const key of Object.keys(factSet)) {
      expect(warranted.has(key)).toBe(true);
    }
  });

  it('each internal reference resolves, checked by following references — with the denominator enumerated', () => {
    const factSet = shapeAnswerExplanation();
    const references = internalReferences(factSet);
    // The denominator: authority, governing revision, source revision,
    // repository, consent record, challenge, work item — seven.
    expect(references.length).toBe(7);
    const resolution = resolveExplanationReferences(factSet, (ref) => RESOLVABLE.has(ref));
    expect(resolution.allResolve).toBe(true);
    expect(resolution.unresolved).toEqual([]);
  });

  it('falsifier: an unresolvable internal reference is enumerated by name, never swallowed', () => {
    const factSet = shapeAnswerExplanation();
    const withoutChallenge = new Set(RESOLVABLE);
    withoutChallenge.delete('challenge-9');
    const resolution = resolveExplanationReferences(factSet, (ref) => withoutChallenge.has(ref));
    expect(resolution.allResolve).toBe(false);
    expect(resolution.unresolved).toEqual(['challenge-9']);
  });

  it('the fact set is served in full through the machine plane', () => {
    const serving = explainAnswer(shapeAnswerExplanation());
    if (!serving.served) throw new Error('fact set must serve');
    // The machine-plane serialization round-trips every present class —
    // nothing is a UI-only fact (RFC6-13).
    const parsed = JSON.parse(deterministicLayer(serving.factSet)) as Record<string, unknown>;
    for (const cls of presentClasses(serving.factSet)) {
      expect(parsed[cls]).toBeDefined();
    }
    // Spot-check verbatim content through the machine plane.
    expect(deterministicLayer(serving.factSet)).toContain('"primary":"missing-evidence"');
    expect(deterministicLayer(serving.factSet)).toContain('"lifecycle":"submitted"');
  });

  it('the explanation is reachable from the human view under the literal name', () => {
    // The human channel for any answer carries the literal reachable
    // name on its own rendered structure.
    const model: FactModel = {
      selection: 'shape-answer:Observable@prj-drawer-40',
      evaluation: EVALUATION,
      scenarioContext: 'base',
      declaredFilters: {},
      facts: [
        {
          name: 'Observable',
          value: 'Unknown',
          epistemic: { label: 'Unknown', reasons: { primary: 'missing-evidence', secondary: [] } },
        },
      ],
    };
    expect(renderHuman(model).explanationReachableAs).toBe('Why this answer?');
    // And the machine channel serves the same facts (RFC6-13) — the
    // fact set is not a human-only artifact.
    expect(serveMachine(model).facts.length).toBe(1);
  });

  it('falsifier: an answer with no reachable explanation renders the unavailability, never nothing', () => {
    const serving = explainAnswer(undefined);
    expect(serving.served).toBe(false);
    if (serving.served) throw new Error('unreachable');
    expect(serving.value).toBe('Unknown');
    expect(serving.reasons.primary).toBe('missing-evidence');
  });
});
