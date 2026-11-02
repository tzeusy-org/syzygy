import { describe, expect, it } from 'vitest';
import {
  computeCoverage,
  computeMissionReady,
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

// CAP1-REQ-036 — Mission-ready renders only its deferred posture (state
// projection/query).
//
// Case: a checker queries the shape answers of any project while the
// Mission contracts are unaccepted (which, within Capability 1, they
// are). Observable: the `Mission-ready` answer's three posture
// coordinates. Oracle: the served value is `not evaluated`, the basis
// `deferred`, the epistemic label `Unknown` — string comparison per
// coordinate, nothing else served as the answer's value; bounded: three
// strings. Oracle independence: the expected posture is the owner
// ruling's (SDR-36 rule 3), its coordinate spellings fixed in the spec
// text and hard-coded below — never imported from the implementation.
// Falsifier: a `Mission-ready` answer served as satisfied, `Gap`, a
// score, or omitted from the answer set, or a posture coordinate served
// with a different spelling.

const PROJECT = 'prj-shape-036' as ProjectId;
const EVALUATION = evaluation('snap-036');

const SOURCE = projectYaml({
  id: PROJECT,
  name: 'Posture Fixture',
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

// Every-other-facet-satisfied inputs: the strongest temptation for a
// favourable Mission-ready render.
function fullyEvidencedInputs(): ShapeAnswerInputs {
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

describe('CAP1-REQ-036 — Mission-ready renders only its deferred posture', () => {
  it('oracle: the three posture coordinates, verbatim — value `not evaluated`, basis `deferred`, epistemic label `Unknown`; string comparison per coordinate', () => {
    const set = computeShapeAnswers(PROJECT, EVALUATION, fullyEvidencedInputs());
    const mission = set.answers[5];
    expect(mission.name).toBe('Mission-ready');
    // The three expected spellings, hard-coded from the spec text:
    expect(mission.render.value).toBe('not evaluated');
    if (mission.render.value !== 'not evaluated') throw new Error('unreachable');
    expect(mission.render.basis).toBe('deferred');
    expect(mission.render.label).toBe('Unknown');
  });

  it('oracle: nothing else is served as the answer\'s value — the render carries exactly the three coordinates', () => {
    const set = computeShapeAnswers(PROJECT, EVALUATION, fullyEvidencedInputs());
    const mission = set.answers[5];
    expect(Object.keys(mission.render).sort()).toEqual(['basis', 'label', 'value']);
  });

  it('scenario: the deferred facet stays visible — present in the answer set of every fixture, evidence-rich or evidence-free', () => {
    const evidenced = computeShapeAnswers(PROJECT, EVALUATION, fullyEvidencedInputs());
    const bare = computeShapeAnswers(PROJECT, EVALUATION, {});
    for (const set of [evidenced, bare]) {
      const names = set.answers.map((answer) => answer.name);
      expect(names).toContain('Mission-ready'); // never omitted
      const mission = set.answers[5];
      expect(mission.render.value).toBe('not evaluated');
      // Present AND honest about its deferral — the deferral is a
      // served fact, not an invisible hole:
      expect(mission.factSet.facts.length).toBeGreaterThan(0);
    }
  });

  it('falsifier: never satisfied, never Gap, never a score — even when every other facet is satisfied', () => {
    const set = computeShapeAnswers(PROJECT, EVALUATION, fullyEvidencedInputs());
    // The other evaluable facets ARE satisfied in this fixture:
    for (const i of [0, 1, 2, 3, 4, 6] as const) {
      expect(set.answers[i].render.value).toBe('satisfied');
    }
    const mission = set.answers[5];
    expect(mission.render.value).not.toBe('satisfied');
    expect(mission.render.value).not.toBe('Gap');
    expect(typeof mission.render.value).not.toBe('number');
    expect(mission.render.value).toBe('not evaluated');
  });

  it('falsifier: the compute path admits no evaluation input at all — the posture is identical whatever the project\'s evidence', () => {
    // computeMissionReady's signature takes no facet evidence; two
    // different projects' postures differ only in scope/evaluation.
    const a = computeMissionReady('project:a', EVALUATION);
    const b = computeMissionReady('project:b', EVALUATION);
    expect(JSON.stringify(a.render)).toBe(JSON.stringify(b.render));
    expect(a.render.value).toBe('not evaluated');
  });

  it('falsifier: no coordinate is served with a different spelling — case and wording exact', () => {
    const mission = computeShapeAnswers(PROJECT, EVALUATION, {}).answers[5];
    if (mission.render.value !== 'not evaluated') throw new Error('unreachable');
    expect(mission.render.value).not.toBe('Not evaluated');
    expect(mission.render.value).not.toBe('not-evaluated');
    expect(mission.render.basis).not.toBe('Deferred');
    expect(mission.render.label).not.toBe('unknown');
  });
});
