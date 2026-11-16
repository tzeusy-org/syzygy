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

// CAP1-REQ-032 — Registration is never certification (invariant).
//
// Case (scope of quantification): all pairs of shape answers;
// counterexample schema: an answer whose served value changes when a
// fact OUTSIDE its own declared constituent-fact set (CAP1-REQ-030) is
// flipped. Sweep: flip one underlying fact at a time and record all
// seven served values per flip — denominator: the flip set × seven
// observations, with every flip's declared-set membership enumerated
// first. Oracle: each flip changes only the answers whose declared
// constituent-fact sets contain the flipped fact; a shared fact (the
// declaration is constituent to Registered, Shape present, and
// Observable) moving its dependents together is conformance, not
// coupling; a value moving with NO declared-set membership in the
// flipped fact is the violation. Oracle independence: the fixture
// controls the underlying facts; declared-set membership comes from
// CAP1-REQ-030's definitions (enumerated below), not from the
// implementation; the oracle observes served values only. Falsifier:
// registering a project raising any other answer above `Unknown`
// absent its own evidence, or any answer's value moving with a fact its
// declared constituent set does not contain.

const PROJECT = 'prj-shape-032' as ProjectId;
const EVALUATION = evaluation('snap-032');

const SOURCE = projectYaml({
  id: PROJECT,
  name: 'Flip Fixture',
  repositories: [
    { id: 'repo-main', role: 'governance-root', consent: 'consent-1' },
  ],
  consents: ['consent-1'],
});

// An invalid declaration source: unparseable-free but missing required
// fields, so validation fails with named failures.
const INVALID_SOURCE = `
schema_version: "1"
project:
  id: prj-shape-032
  name: Flip Fixture
`;

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

function baselineInputs(): ShapeAnswerInputs {
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

// Facet order, per CAP1-REQ-030 (hard-coded).
const NAMES = [
  'Registered',
  'Shape present',
  'Human-understandable',
  'Observable',
  'Traceable',
  'Mission-ready',
  'Reconciled',
] as const;

// The flip set, declared-set membership ENUMERATED FIRST from
// CAP1-REQ-030's constituent-fact definitions (never from the
// implementation):
// - validation result           -> Registered (declaration, validation
//   result, root designation are its facts)
// - shape-reference resolution  -> Shape present (the declaration's
//   `declarations` references and their resolution results)
// - comprehension verdict       -> Human-understandable (recorded
//   walkthrough records and owner verdicts)
// - repository consent record   -> Observable (coverage boundary and
//   consent states)
// - link resolution             -> Traceable (link-resolution results)
// - reconciliation computation  -> Reconciled (reconciliation chain
//   state)
// - the declaration itself      -> shared fact: Registered, Shape
//   present, AND Observable (REQ-032's own enumeration; REQ-002
//   mandates the co-movement for an invalidated declaration)
// Mission-ready appears in no membership: its semantics are deliberately
// undefined while its contracts are unaccepted (CAP1-REQ-036), so no
// fixture fact belongs to its declared set and it must never move.
interface Flip {
  readonly fact: string;
  readonly membership: readonly (typeof NAMES)[number][];
  readonly apply: (inputs: ShapeAnswerInputs) => ShapeAnswerInputs;
}

const FLIPS: readonly Flip[] = [
  {
    fact: 'validation-result',
    membership: ['Registered'],
    apply: (inputs) => ({
      ...inputs,
      registration: registerProject(readDeclaration(INVALID_SOURCE), 'rev-1'),
    }),
  },
  {
    fact: 'shape-reference-resolution',
    membership: ['Shape present'],
    apply: (inputs) => ({
      ...inputs,
      shapeReferences: [{ reference: 'declarations/spec_root', resolution: 'missing' }],
    }),
  },
  {
    fact: 'comprehension-verdict',
    membership: ['Human-understandable'],
    apply: (inputs) => ({
      ...inputs,
      comprehension: [{ recordId: 'walkthrough-1', ownerVerdict: 'does-not-stand' }],
    }),
  },
  {
    fact: 'repository-consent-record',
    membership: ['Observable'],
    apply: (inputs) => {
      const read = readDeclaration(SOURCE);
      if (!read.ok) throw new Error('fixture must be valid');
      // Consent record removed: the repository resolves unconsented.
      return { ...inputs, coverage: computeCoverage(
        read.declaration,
        decisionsFor(read.declaration, []),
        OBSERVATIONS,
      ) };
    },
  },
  {
    fact: 'link-resolution',
    membership: ['Traceable'],
    apply: (inputs) => ({
      ...inputs,
      links: [{ link: 'overview->spec', resolved: false }],
    }),
  },
  {
    fact: 'reconciliation-computation',
    membership: ['Reconciled'],
    apply: (inputs) => ({
      ...inputs,
      reconciliation: { computed: false, mergedWork: [{ workId: 'w1' }] },
    }),
  },
  {
    fact: 'declaration (shared fact)',
    membership: ['Registered', 'Shape present', 'Observable'],
    apply: (inputs) => ({
      ...inputs,
      // No declaration: registration absent, the reference list it
      // supplies absent, the coverage over its declared repositories
      // absent — REQ-002's mandated co-movement.
      registration: undefined,
      shapeReferences: undefined,
      coverage: undefined,
    }),
  },
];

describe('CAP1-REQ-032 — registration is never certification; no answer\'s value implies another\'s', () => {
  it('sweep: each flip changes only the answers whose declared constituent-fact sets contain the flipped fact — 7 flips × 7 observations = 49, denominator disclosed', () => {
    const baseline = computeShapeAnswers(PROJECT, EVALUATION, baselineInputs());
    expect(FLIPS).toHaveLength(7); // the enumerated flip set
    let observations = 0;
    for (const flip of FLIPS) {
      const flipped = computeShapeAnswers(PROJECT, EVALUATION, flip.apply(baselineInputs()));
      const baseRenders = baseline.answers.map((answer) => JSON.stringify(answer.render));
      const moved: string[] = [];
      flipped.answers.forEach((answer, i) => {
        observations += 1;
        if (JSON.stringify(answer.render) !== baseRenders[i]) moved.push(answer.name);
      });
      // Every moved answer's declared set contains the flipped fact:
      for (const name of moved) {
        expect(flip.membership, `flip ${flip.fact} moved ${name}`).toContain(name);
      }
      // Sensitivity check: a flip that moves nothing is a broken probe,
      // not a passing sweep.
      expect(moved.length, `flip ${flip.fact} moved nothing`).toBeGreaterThan(0);
    }
    expect(observations).toBe(49); // the sweep's full denominator
  });

  it('scenario: registration raises nothing else — newly registered, no other evidence: Registered reflects the validated declaration; the other six render Unknown (or their deferred posture), each with its own reason', () => {
    const read = readDeclaration(SOURCE);
    if (!read.ok) throw new Error('fixture must be valid');
    const set = computeShapeAnswers(PROJECT, EVALUATION, {
      registration: registerProject(read, 'rev-1'),
      // The declaration exists, so its reference list exists — but no
      // resolution has been attempted yet.
      shapeReferences: [{ reference: 'declarations/spec_root', resolution: 'unattempted' }],
      comprehension: undefined,
      coverage: undefined,
      links: undefined,
      reconciliation: undefined,
    });
    expect(set.answers[0].render.value).toBe('satisfied'); // Registered
    // The other six: Unknown or the deferred posture, never favourable.
    for (const i of [1, 2, 3, 4, 6] as const) {
      const render = set.answers[i].render;
      expect(render.value).toBe('Unknown');
      if (render.value === 'Unknown') {
        expect(render.reasons.primary.length).toBeGreaterThan(0); // its own reason
      }
    }
    const mission = set.answers[5].render;
    expect(mission.value).toBe('not evaluated'); // deferred posture
  });

  it('falsifier: `Registered` reads as a relationship fact — a valid registration never renders any sibling `satisfied` absent that sibling\'s own evidence', () => {
    const read = readDeclaration(SOURCE);
    if (!read.ok) throw new Error('fixture must be valid');
    const set = computeShapeAnswers(PROJECT, EVALUATION, {
      registration: registerProject(read, 'rev-1'),
    });
    const satisfiedNames = set.answers
      .filter((answer) => answer.render.value === 'satisfied')
      .map((answer) => answer.name);
    expect(satisfiedNames).toEqual(['Registered']);
  });
});
