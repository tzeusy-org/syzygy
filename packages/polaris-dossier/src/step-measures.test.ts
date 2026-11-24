import { describe, expect, it } from 'vitest';
import { readStepRow, stepMeasures } from './step-measures.js';

// Literal step-log lines in the form `logStep` writes; every expected figure below is computed by hand from these instants.
const row = (fields: Record<string, unknown>): string => JSON.stringify({ format: 'polaris-dossier-step/1', ...fields });
const LOG = [
  row({ step: 'session-prompt', at: '2026-11-06T10:00:00.000Z', outcome: 'issued', role: 'all', mode: 'waiting' }),
  row({ step: 'await', at: '2026-11-06T10:00:10.000Z', outcome: 'delivered', role: 'inventory', session: 1, round: 1 }),
  row({ step: 'check', at: '2026-11-06T10:05:00.000Z', outcome: 'findings', revision: 0, findings: 4 }),
  row({ step: 'check', at: '2026-11-06T10:07:30.000Z', outcome: 'passed', revision: 1, findings: 0 }),
  row({ step: 'inventory-check', at: '2026-11-06T10:08:00.000Z', outcome: 'refused', stage: 'authoring-session' }),
  row({ step: 'inventory-check', at: '2026-11-06T10:09:00.000Z', outcome: 'passed', revision: 0, findings: 0 }),
  row({ step: 'session-prompt', at: '2026-11-06T10:10:00.000Z', outcome: 'delivered', role: 'review', kind: 'fidelity', session: 1, round: 1 }),
  row({ step: 'review-check', at: '2026-11-06T10:12:00.000Z', outcome: 'refused', kind: 'fidelity', number: 0, problems: 3 }),
  row({ step: 'review-check', at: '2026-11-06T10:15:00.500Z', outcome: 'validated', kind: 'fidelity', number: 1, problems: 0 }),
  row({ step: 'render', at: '2026-11-06T10:16:00.000Z', outcome: 'rendered', site: 'site/0', draftRevision: 1 }),
  row({ step: 'session-prompt', at: '2026-11-06T10:17:00.000Z', outcome: 'delivered', role: 'review', kind: 'design', session: 1, round: 1 }),
  row({ step: 'review-check', at: '2026-11-06T10:20:00.000Z', outcome: 'validated', kind: 'design', number: 0, problems: 0 }),
  row({ step: 'session-prompt', at: '2026-11-06T10:21:00.000Z', outcome: 'delivered', role: 'review', kind: 'fidelity', session: 1, round: 2 }),
  'not json',
];
const CLOSED = '2026-11-06T10:30:00.000Z';

describe('stepMeasures (REQ-polaris-generation-033 version 2.29)', () => {
  it('derives stage timings, revisions and review rounds from a literal step log, Inferred', () => {
    expect(stepMeasures(LOG, CLOSED)).toEqual({
      label: 'Inferred',
      basis: 'derived by Syzygy at close from the run\'s step log, which the agent sessions can write; every figure is Inferred, and a figure whose rows the log does not carry is Unknown, never zero',
      rows: 13,
      unreadableRows: 1,
      wall: { state: 'measured', ms: 1_800_000, from: '2026-11-06T10:00:00.000Z', to: '2026-11-06T10:30:00.000Z' },
      toFirstDraftCheck: { state: 'measured', ms: 300_000, from: '2026-11-06T10:00:00.000Z', to: '2026-11-06T10:05:00.000Z' },
      toFirstPassedDraft: { state: 'measured', ms: 450_000, from: '2026-11-06T10:00:00.000Z', to: '2026-11-06T10:07:30.000Z' },
      toFirstPassedInventory: { state: 'measured', ms: 540_000, from: '2026-11-06T10:00:00.000Z', to: '2026-11-06T10:09:00.000Z' },
      toFirstRender: { state: 'measured', ms: 960_000, from: '2026-11-06T10:00:00.000Z', to: '2026-11-06T10:16:00.000Z' },
      draftRevisions: { state: 'counted', revisions: 2, rows: { findings: 1, passed: 1 } },
      inventoryRevisions: { state: 'counted', revisions: 1, rows: { passed: 1, refused: 1 } },
      reviewRounds: {
        fidelity: {
          state: 'counted', opened: 2, completed: 1, unfinished: 1, refusedSubmissions: 1, ms: 300_500,
          rounds: [{ round: 1, session: 1, ms: 300_500, refusedSubmissions: 1 }, { round: 2, session: 1, ms: null, refusedSubmissions: 0 }],
        },
        design: {
          state: 'counted', opened: 1, completed: 1, unfinished: 0, refusedSubmissions: 0, ms: 180_000,
          rounds: [{ round: 1, session: 1, ms: 180_000, refusedSubmissions: 0 }],
        },
      },
      roundPredicate: 'a round opens at a session-prompt row with role review, a kind and outcome delivered or issued, and ends at the next review-check row of that kind with outcome validated; the review-check rows of that kind with outcome refused between are its refused submissions; a round that reaches the next such prompt of its kind first, or no validated row, is unfinished and adds no time',
    });
  });

  it('gives each figure whose rows are missing Unknown with its reason, never zero', () => {
    const measures = stepMeasures([LOG[0]!, LOG[1]!], CLOSED);
    expect(measures).toMatchObject({
      label: 'Inferred',
      wall: { state: 'measured', ms: 1_800_000 },
      toFirstDraftCheck: { state: 'unknown', why: 'the step log records no check row' },
      toFirstPassedDraft: { state: 'unknown', why: 'the step log records no passed check row' },
      toFirstPassedInventory: { state: 'unknown', why: 'the step log records no passed inventory-check row' },
      toFirstRender: { state: 'unknown', why: 'the step log records no rendered render row' },
      draftRevisions: { state: 'unknown', why: 'the step log records no check row' },
      inventoryRevisions: { state: 'unknown', why: 'the step log records no inventory-check row' },
      reviewRounds: {
        fidelity: { state: 'unknown', why: 'the step log records no delivered or issued fidelity review prompt' },
        design: { state: 'unknown', why: 'the step log records no delivered or issued design review prompt' },
      },
    });
    // An inventory check that names no revision counts no revision: Unknown, not zero revisions.
    expect(stepMeasures([LOG[0]!, LOG[4]!], CLOSED)).toMatchObject({ inventoryRevisions: { state: 'unknown', why: 'no inventory-check row in the step log names a revision' } });
  });

  it('is Unknown whole for an unreadable, empty or wholly unreadable log', () => {
    expect(stepMeasures({ why: 'steps.jsonl cannot be read (EISDIR)' }, CLOSED)).toEqual({
      label: 'Unknown', basis: expect.any(String), why: 'steps.jsonl cannot be read (EISDIR)',
    });
    expect(stepMeasures([], CLOSED)).toMatchObject({ label: 'Unknown', why: 'the step log records no step' });
    expect(stepMeasures(['{}', 'x'], CLOSED)).toMatchObject({ label: 'Unknown', why: 'no row of the step log is readable (2 unreadable)' });
  });

  it('opens a round at an issued review prompt too (the handover mode), and never at another role\'s or kind\'s prompt', () => {
    const issued = row({ step: 'session-prompt', at: '2026-11-06T10:00:00.000Z', outcome: 'issued', role: 'review', kind: 'design', session: 2, round: 1 });
    const inventory = row({ step: 'session-prompt', at: '2026-11-06T10:00:30.000Z', outcome: 'issued', role: 'inventory', kind: 'design' });
    const otherKind = row({ step: 'review-check', at: '2026-11-06T10:01:00.000Z', outcome: 'validated', kind: 'fidelity' });
    const ends = row({ step: 'review-check', at: '2026-11-06T10:02:00.000Z', outcome: 'validated', kind: 'design' });
    expect(stepMeasures([issued, inventory, otherKind, ends], CLOSED)).toMatchObject({
      reviewRounds: {
        design: { state: 'counted', opened: 1, completed: 1, ms: 120_000, rounds: [{ round: 1, session: 2, ms: 120_000, refusedSubmissions: 0 }] },
        fidelity: { state: 'unknown' },
      },
    });
  });

  it('ends a round at its first validated check, and at the next prompt of its kind, so no two rounds share a check (review F2)', () => {
    const prompt = (at: string, round: number): string => row({ step: 'session-prompt', at, outcome: 'delivered', role: 'review', kind: 'fidelity', session: 1, round });
    const check = (at: string, outcome: string): string => row({ step: 'review-check', at, outcome, kind: 'fidelity' });
    // Round 1 ends at its first validated check; the second validated check, with no prompt between, ends no round.
    expect(stepMeasures([prompt('2026-11-06T10:00:00.000Z', 1), check('2026-11-06T10:01:00.000Z', 'validated'), check('2026-11-06T10:05:00.000Z', 'validated')], CLOSED))
      .toMatchObject({ reviewRounds: { fidelity: { opened: 1, completed: 1, ms: 60_000 } } });
    // Two prompts before one validated check: the first round is unfinished at the second prompt, and the refused check after the
    // second prompt counts once, for the second round.
    expect(stepMeasures([prompt('2026-11-06T10:00:00.000Z', 1), check('2026-11-06T10:01:00.000Z', 'refused'), prompt('2026-11-06T10:02:00.000Z', 2),
      check('2026-11-06T10:03:00.000Z', 'refused'), check('2026-11-06T10:04:00.000Z', 'validated')], CLOSED)).toMatchObject({
      reviewRounds: {
        fidelity: {
          state: 'counted', opened: 2, completed: 1, unfinished: 1, refusedSubmissions: 2, ms: 120_000,
          rounds: [{ round: 1, ms: null, refusedSubmissions: 1 }, { round: 2, ms: 120_000, refusedSubmissions: 1 }],
        },
      },
    });
  });

  it('counts an outcome Syzygy does not log under other, never copying an agent-written string into a key (review F1)', () => {
    const odd = row({ step: 'check', at: '2026-11-06T10:05:00.000Z', outcome: 'AKIA-like text written by a session', revision: 3 });
    const none = row({ step: 'check', at: '2026-11-06T10:06:00.000Z', revision: 4 });
    const measures = stepMeasures([LOG[0]!, LOG[2]!, odd, none], CLOSED);
    expect(measures).toMatchObject({ draftRevisions: { state: 'counted', revisions: 3, rows: { findings: 1, other: 2 } } });
    expect(JSON.stringify(measures)).not.toContain('AKIA-like');
  });

  it('refuses out-of-order instants rather than reporting a negative time', () => {
    const late = row({ step: 'session-prompt', at: '2026-11-06T10:40:00.000Z', outcome: 'issued', role: 'all' });
    expect(stepMeasures([late, LOG[2]!], CLOSED)).toMatchObject({
      wall: { state: 'unknown', why: 'the step log\'s instants are out of order: 2026-11-06T10:30:00.000Z precedes 2026-11-06T10:40:00.000Z' },
      toFirstDraftCheck: { state: 'unknown', why: 'the step log\'s instants are out of order: 2026-11-06T10:05:00.000Z precedes 2026-11-06T10:40:00.000Z' },
    });
    const prompt = row({ step: 'session-prompt', at: '2026-11-06T10:20:00.000Z', outcome: 'delivered', role: 'review', kind: 'design', round: 1 });
    const early = row({ step: 'review-check', at: '2026-11-06T10:10:00.000Z', outcome: 'validated', kind: 'design' });
    expect(stepMeasures([prompt, early], CLOSED)).toMatchObject({
      reviewRounds: { design: { state: 'unknown', why: 'the step log\'s instants are out of order: 2026-11-06T10:10:00.000Z precedes 2026-11-06T10:20:00.000Z' } },
    });
  });

  it('reads a row only with a step name and a UTC instant', () => {
    expect(readStepRow(row({ step: 'check', at: '2026-11-06T10:05:00Z', revision: 2 }))).toMatchObject({ step: 'check', revision: 2, outcome: null });
    for (const bad of [row({ at: '2026-11-06T10:05:00Z' }), row({ step: 'check' }), row({ step: 'check', at: '2026-11-06 10:05:00' }),
      row({ step: 'check', at: '2026-13-45T10:05:00Z' }), '[]', 'null']) expect(readStepRow(bad)).toBeNull();
    // A revision, round or session that is not a non-negative integer is read as absent.
    expect(readStepRow(row({ step: 'check', at: '2026-11-06T10:05:00Z', revision: -1, round: 1.5, session: '1' }))).toMatchObject({ revision: null, round: null, session: null });
  });
});
