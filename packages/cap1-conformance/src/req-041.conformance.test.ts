import { describe, expect, it } from 'vitest';
import {
  computeCoverage,
  computeShapeAnswers,
  readDeclaration,
  registerProject,
  renderHuman,
  serveMachine,
  type ConsentRecord,
  type FacetAnswer,
  type FactModel,
  type HumanPresentation,
  type ProjectId,
  type RepositoryId,
  type ServedFact,
} from '@syzygy/cap1-core';
import { compareRenderings, disclosureOf } from '@syzygy/cap1-core/testing';
import { decisionsFor, evaluation, projectYaml } from './fixtures/index.js';

// CAP1-REQ-041 — Humans and machines receive the same facts
// (invariant).
//
// Case: every (selection, evaluation, context) Capability 1 serves;
// sweep: for a fixture project, retrieve both channels' full fact sets
// for each Capability 1 answer and diff — denominator: the answer set.
// Oracle: content equality of the fact sets (presentation aside),
// labels verbatim — judged by cross-channel comparison, not by either
// channel's self-description. Falsifier: a machine answer omitting an
// Unknown the human view shows, or a human view showing evidence the
// machine answer cannot retrieve.

const PROJECT = 'prj-parity-41' as ProjectId;
const REPO_A = 'repo-parity-01' as RepositoryId;
const REPO_B = 'repo-parity-02' as RepositoryId;

const SOURCE = projectYaml({
  id: PROJECT,
  name: 'Parity Fixture',
  repositories: [
    { id: 'repo-parity-01', role: 'governance-root', consent: 'consent-p1' },
    { id: 'repo-parity-02', role: 'observed-source', consent: 'consent-p2' },
  ],
  consents: ['consent-p1', 'consent-p2'],
});

const CONSENTS: readonly ConsentRecord[] = [
  {
    id: 'consent-p1',
    projectId: PROJECT,
    repositoryId: REPO_A,
    scope: 'observe',
    attribution: 'uniquosity@gmail.com',
    grantState: 'in-force',
  },
  // repo-parity-02 has NO in-force consent — the fixture's standing
  // Unknown, so the sweep covers an Unknown-bearing answer.
];

const EVALUATION = evaluation('snap-2026-08-21-p');

// Adapter: one shape answer -> the served facts of its fact model. The
// constituent facts are observed record contents; the answer-value fact
// carries the answer's own epistemic state — Unknown answers carry
// their reasons verbatim, the deferred posture carries basis 'deferred'
// (SDR-36 rule 3), and computed satisfied/Gap values are observed
// results of the deterministic evaluation.
function factsOfAnswer(answer: FacetAnswer): readonly ServedFact[] {
  const constituent: ServedFact[] = answer.factSet.facts.map((fact) => ({
    name: `fact:${fact.name}`,
    value: fact.value,
    epistemic: { label: 'Observed' as const },
  }));
  const render = answer.render;
  const answerFact: ServedFact =
    render.value === 'Unknown'
      ? { name: 'answer', value: render.value, epistemic: { label: 'Unknown', reasons: render.reasons } }
      : render.value === 'not evaluated'
        ? { name: 'answer', value: render.value, epistemic: { label: 'Unknown', basis: 'deferred' } }
        : { name: 'answer', value: render.value, epistemic: { label: 'Observed' } };
  return [answerFact, ...constituent];
}

// The fixture's answer set — the sweep's denominator: the seven shape
// answers plus the registration answer, each as one fact model.
function answerSet(): readonly FactModel[] {
  const read = readDeclaration(SOURCE);
  if (!read.ok) throw new Error('fixture must parse');
  const registration = registerProject(read, EVALUATION.snapshot);
  const coverage = computeCoverage(read.declaration, decisionsFor(read.declaration, CONSENTS), [
    { repositoryId: REPO_A, outcome: 'captured', capturedScope: 'full' },
  ]);
  const shape = computeShapeAnswers(PROJECT, EVALUATION, {
    registration,
    coverage,
    comprehension: [],
  });

  const models: FactModel[] = shape.answers.map((answer) => ({
    selection: `shape-answer:${answer.name}@${PROJECT}`,
    evaluation: EVALUATION,
    scenarioContext: 'base',
    declaredFilters: {},
    facts: factsOfAnswer(answer),
  }));
  models.push({
    selection: `registration:${PROJECT}`,
    evaluation: EVALUATION,
    scenarioContext: 'base',
    declaredFilters: {},
    facts:
      registration.status === 'registered'
        ? [
            {
              name: 'registration',
              value: `registered at revision ${registration.facts.revision}`,
              epistemic: { label: 'Observed' },
            },
          ]
        : [
            {
              name: 'registration',
              value: 'failed',
              epistemic: { label: 'Unknown', reasons: { primary: 'missing-declaration', secondary: [] } },
            },
          ],
  });
  return models;
}

describe('CAP1-REQ-041 — humans and machines receive the same facts', () => {
  it('sweep: both channels expose equal fact sets for every answer of the fixture project', () => {
    const models = answerSet();
    // Denominator disclosed: seven shape answers + one registration
    // answer, no sampling.
    expect(models.length).toBe(8);
    for (const model of models) {
      const machine = serveMachine(model);
      const human = renderHuman(model);
      // Judged by diffing the two channels' own outputs — never either
      // channel's self-description.
      const comparison = compareRenderings(disclosureOf(machine), disclosureOf(human));
      expect(comparison).toEqual({
        comparable: true,
        verdict: 'parity',
        comparedFacts: model.facts.length,
      });
    }
  });

  it('scenario: no machine-invisible Unknown — the human-rendered Unknown and its reason travel verbatim to the machine answer', () => {
    const models = answerSet();
    // The Observable answer is Unknown in this fixture (repo-parity-02
    // has no in-force consent).
    const observable = models.find((model) => model.selection.startsWith('shape-answer:Observable'));
    if (observable === undefined) throw new Error('fixture must serve Observable');
    const human = renderHuman(observable);
    const machine = serveMachine(observable);

    const humanAnswer = human.sections
      .flatMap((section) => section.facts)
      .find((fact) => fact.name === 'answer');
    const machineAnswer = machine.facts.find((fact) => fact.name === 'answer');
    if (humanAnswer === undefined || machineAnswer === undefined) {
      throw new Error('both channels must serve the answer fact');
    }
    // Hard-coded expected spellings, carried verbatim on BOTH channels.
    expect(humanAnswer.value).toBe('Unknown');
    expect(humanAnswer.epistemic.label).toBe('Unknown');
    expect(machineAnswer.value).toBe('Unknown');
    expect(machineAnswer.epistemic.label).toBe('Unknown');
    if (!('reasons' in humanAnswer.epistemic) || !('reasons' in machineAnswer.epistemic)) {
      throw new Error('an Unknown answer carries its reasons');
    }
    expect(humanAnswer.epistemic.reasons.primary).toBe('unconsented-source-or-provider');
    expect(machineAnswer.epistemic.reasons.primary).toBe('unconsented-source-or-provider');
  });

  it('presentation may group and order differently without touching the facts', () => {
    const [model] = answerSet();
    if (model === undefined) throw new Error('fixture must serve');
    const grouped: HumanPresentation = {
      sections: [{ heading: 'The answer', factNames: ['answer'] }],
    };
    const machine = serveMachine(model);
    const plain = renderHuman(model);
    const fancy = renderHuman(model, grouped);
    // Different presentations, same facts — parity holds against the
    // machine answer for both (RFC6-18: presentation differs, fact set
    // does not).
    expect(compareRenderings(disclosureOf(machine), disclosureOf(plain))).toMatchObject({
      comparable: true,
      verdict: 'parity',
    });
    expect(compareRenderings(disclosureOf(machine), disclosureOf(fancy))).toMatchObject({
      comparable: true,
      verdict: 'parity',
    });
    // And the two presentations really did differ.
    expect(fancy.sections[0]?.heading).toBe('The answer');
    expect(plain.sections[0]?.heading).toBe('Further facts');
  });

  it('lawful fact permutation remains parity because presentation order is not semantic', () => {
    const model: FactModel = {
      selection: 'permutation-test',
      evaluation: EVALUATION,
      scenarioContext: 'base',
      declaredFilters: {},
      facts: [
        { name: 'first', value: 'one', epistemic: { label: 'Observed' } },
        { name: 'second', value: 'two', epistemic: { label: 'Observed' } },
      ],
    };
    const machine = serveMachine(model);
    const permuted = {
      ...machine,
      facts: [...machine.facts].reverse(),
    };

    expect(compareRenderings(disclosureOf(machine), disclosureOf(permuted))).toEqual({
      comparable: true,
      verdict: 'parity',
      comparedFacts: machine.facts.length,
    });
  });

  it('a partial presentation cannot subtract a fact — minimal display never subtracts (RFC6-21)', () => {
    const [model] = answerSet();
    if (model === undefined) throw new Error('fixture must serve');
    // The presentation names only ONE fact; everything else must still
    // be disclosed by the human channel.
    const minimal: HumanPresentation = {
      sections: [{ heading: 'Status', factNames: ['answer'] }],
    };
    const human = renderHuman(model, minimal);
    const comparison = compareRenderings(disclosureOf(serveMachine(model)), disclosureOf(human));
    expect(comparison).toMatchObject({ comparable: true, verdict: 'parity' });
  });

  it('falsifier: a machine answer omitting an Unknown the human view shows is a detected parity break', () => {
    const models = answerSet();
    const observable = models.find((model) => model.selection.startsWith('shape-answer:Observable'));
    if (observable === undefined) throw new Error('fixture must serve Observable');
    const human = renderHuman(observable);
    // A hand-mutilated machine answer that drops the Unknown answer
    // fact — the endpoint-only-omission direction.
    const brokenMachine = {
      ...serveMachine(observable),
      facts: serveMachine(observable).facts.filter((fact) => fact.name !== 'answer'),
    };
    const comparison = compareRenderings(disclosureOf(brokenMachine), disclosureOf(human));
    if (comparison.comparable !== true || comparison.verdict !== 'parity-defect') {
      throw new Error('the omission must be detected');
    }
    expect(
      comparison.disagreements.some(
        (disagreement) => disagreement.factName === 'answer' && disagreement.facet === 'existence',
      ),
    ).toBe(true);
  });

  it('falsifier: a human view showing evidence the machine answer cannot retrieve is a detected parity break', () => {
    const [model] = answerSet();
    if (model === undefined) throw new Error('fixture must serve');
    const machine = serveMachine(model);
    // A hand-mutilated human view carrying a UI-only fact.
    const uiOnlyFact: ServedFact = {
      name: 'ui-only-evidence',
      value: 'shown only to humans',
      epistemic: { label: 'Observed' },
    };
    const brokenHuman = {
      ...renderHuman(model),
      sections: [
        ...renderHuman(model).sections,
        { heading: 'Extra', facts: [uiOnlyFact] },
      ],
    };
    const comparison = compareRenderings(disclosureOf(machine), disclosureOf(brokenHuman));
    if (comparison.comparable !== true || comparison.verdict !== 'parity-defect') {
      throw new Error('the UI-only fact must be detected');
    }
    expect(
      comparison.disagreements.some(
        (disagreement) =>
          disagreement.factName === 'ui-only-evidence' && disagreement.facet === 'existence',
      ),
    ).toBe(true);
  });

  it('duplicate-named facts in the model are never silently dropped by the human view (RFC6-21)', () => {
    const dupFact1: ServedFact = {
      name: 'shared-name',
      value: 'first instance',
      epistemic: { label: 'Observed' },
    };
    const dupFact2: ServedFact = {
      name: 'shared-name',
      value: 'second instance',
      epistemic: { label: 'Observed' },
    };
    const model: FactModel = {
      selection: 'dup-test',
      evaluation: EVALUATION,
      scenarioContext: 'base',
      declaredFilters: {},
      facts: [dupFact1, dupFact2],
    };
    const machine = serveMachine(model);
    const human = renderHuman(model);
    const humanFacts = human.sections.flatMap((s) => s.facts);
    expect(humanFacts).toHaveLength(2);
    expect(humanFacts[0]?.value).toBe('first instance');
    expect(humanFacts[1]?.value).toBe('second instance');
    expect(compareRenderings(disclosureOf(machine), disclosureOf(human))).toMatchObject({
      comparable: true,
      verdict: 'parity',
      comparedFacts: 2,
    });
  });

  it('duplicate-named facts with a presentation section claiming the name: both are placed', () => {
    const dupFact1: ServedFact = {
      name: 'shared-name',
      value: 'alpha',
      epistemic: { label: 'Observed' },
    };
    const dupFact2: ServedFact = {
      name: 'shared-name',
      value: 'beta',
      epistemic: { label: 'Observed' },
    };
    const other: ServedFact = {
      name: 'unique-fact',
      value: 'gamma',
      epistemic: { label: 'Observed' },
    };
    const model: FactModel = {
      selection: 'dup-placed-test',
      evaluation: EVALUATION,
      scenarioContext: 'base',
      declaredFilters: {},
      facts: [dupFact1, dupFact2, other],
    };
    const pres: HumanPresentation = {
      sections: [{ heading: 'Claimed', factNames: ['shared-name'] }],
    };
    const human = renderHuman(model, pres);
    const machine = serveMachine(model);
    const claimed = human.sections.find((s) => s.heading === 'Claimed');
    expect(claimed?.facts).toHaveLength(2);
    const humanFacts = human.sections.flatMap((s) => s.facts);
    expect(humanFacts).toHaveLength(3);
    expect(compareRenderings(disclosureOf(machine), disclosureOf(human))).toMatchObject({
      comparable: true,
      verdict: 'parity',
      comparedFacts: 3,
    });
  });
});
