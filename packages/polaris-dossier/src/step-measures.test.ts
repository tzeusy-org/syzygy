import { describe, expect, it } from 'vitest';
import { stepMeasures, utcInstantMs, type StepLogSnapshot } from './step-measures.js';

// REQ-polaris-generation-033 version 2.31 (syzygy-5dhm.25): the step measures over literal synthetic logs. Every expected value is a
// literal fixed before the run, never one computed by the module under test.

const at = (minute: number, second = 0): string => `2026-11-25T10:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.000Z`;
const row = (step: string, minute: number, extra: Record<string, unknown> = {}, second = 0): string =>
  JSON.stringify({ format: 'polaris-dossier-step/1', step, at: at(minute, second), ...extra });
const read = (...lines: string[]): StepLogSnapshot => ({ state: 'read', lines });
const CLOSE = Date.parse('2026-11-25T11:00:00.000Z');
const HEAD = {
  format: 'polaris-dossier-step-measures/1',
  basis: 'derived by Syzygy at close from the same bounded step-log read as the steps view; the operator agent can write that log, so the projection is Inferred, and a measure the log cannot support is Unknown, never zero',
  toolOwnedUsage: { label: 'Unknown', why: 'no-tool-owned-receipt' },
};

/** A complete valid log: baseline, a refused then two draft revisions (one repeated), a passed inventory, a render, review rounds. */
const COMPLETE = [
  row('brief', 0, { outcome: 'issued' }),
  row('check', 2, { outcome: 'refused', stage: 'schema', reason: 'r' }),
  row('check', 5, { outcome: 'findings', revision: 0, findings: 3 }),
  row('check', 9, { outcome: 'findings', revision: 0, findings: 1 }),
  row('check', 12, { outcome: 'passed', revision: 1, findings: 0 }),
  row('inventory-check', 15, { outcome: 'findings', revision: 0 }),
  row('inventory-check', 20, { outcome: 'passed', revision: 1 }),
  row('render', 25, { outcome: 'rendered', site: 'site', draftRevision: 1 }),
  row('session-prompt', 26, { outcome: 'issued', role: 'review', kind: 'fidelity', session: 1, promptSha256: 'a'.repeat(64) }),
  row('review-check', 30, { outcome: 'validated', kind: 'fidelity', number: 1, problems: 0 }),
  row('session-prompt', 31, { outcome: 'issued', role: 'review', kind: 'design', session: 2 }),
  row('review-check', 40, { outcome: 'validated', kind: 'design', number: 1, problems: 0 }),
];

describe('step measures (REQ-polaris-generation-033 v2.31)', () => {
  it('gives literal Inferred intervals, distinct revisions and paired rounds for a complete log', () => {
    expect(stepMeasures(read(...COMPLETE), CLOSE)).toEqual({
      ...HEAD,
      label: 'Inferred',
      rows: { retained: 12, rejected: 0, omitted: 0 },
      elapsedMs: {
        toClose: { state: 'measured', ms: 3_600_000 },
        toFirstDraftCheckAttempt: { state: 'measured', ms: 120_000 },
        toFirstPassedDraftCheck: { state: 'measured', ms: 720_000 },
        toFirstPassedInventoryCheck: { state: 'measured', ms: 1_200_000 },
        toFirstRender: { state: 'measured', ms: 1_500_000 },
      },
      revisions: { draft: { state: 'counted', distinct: 2 }, inventory: { state: 'counted', distinct: 2 } },
      reviewRounds: {
        fidelity: { state: 'counted', opened: 1, paired: 1, unfinished: 0, pairedMs: { state: 'measured', ms: 240_000 } },
        design: { state: 'counted', opened: 1, paired: 1, unfinished: 0, pairedMs: { state: 'measured', ms: 540_000 } },
      },
    });
  });

  it('copies no instant, digest or stored text into the measures', () => {
    const text = JSON.stringify(stepMeasures(read(...COMPLETE), CLOSE));
    expect(text).not.toContain('2026-');
    expect(text).not.toContain('aaaa');
    expect(text).not.toContain('site');
    expect(text).not.toContain('Observed');
  });

  it('gives each unusable whole log its fixed Unknown, with row counts when readable', () => {
    expect(stepMeasures({ state: 'absent' }, CLOSE)).toEqual({ ...HEAD, label: 'Unknown', why: 'step-log-absent' });
    expect(stepMeasures({ state: 'unreadable', why: 'steps.jsonl cannot be read (EISDIR)' }, CLOSE)).toEqual({ ...HEAD, label: 'Unknown', why: 'step-log-unreadable' });
    expect(stepMeasures(read(), CLOSE)).toEqual({ ...HEAD, label: 'Unknown', why: 'step-log-empty', rows: { retained: 0, rejected: 0, omitted: 0 } });
    for (const bad of ['not json', '[1]', JSON.stringify({ step: 'brief', at: at(1) }), JSON.stringify({ format: 'polaris-dossier-step/1', at: at(1) }),
      JSON.stringify({ format: 'polaris-dossier-step/1', step: 'brief', at: '2026-02-30T10:00:00.000Z' }),
      JSON.stringify({ format: 'polaris-dossier-step/1', step: 'brief', at: '2026-11-25T10:00:00Z' })]) {
      expect(stepMeasures(read(COMPLETE[0]!, bad, COMPLETE[4]!), CLOSE)).toEqual({ ...HEAD, label: 'Unknown', why: 'step-log-malformed-row', rows: { retained: 2, rejected: 1, omitted: 0 } });
    }
  });

  it('is complete at 10,000 nonempty lines and Unknown at one more', () => {
    const lines = Array.from({ length: 10_000 }, () => COMPLETE[0]!);
    expect(stepMeasures(read(...lines), CLOSE)).toMatchObject({ label: 'Inferred', rows: { retained: 10_000, rejected: 0, omitted: 0 } });
    expect(stepMeasures(read(...lines, COMPLETE[0]!), CLOSE)).toEqual({ ...HEAD, label: 'Unknown', why: 'step-log-over-retained-limit', rows: { retained: 10_000, rejected: 0, omitted: 1 } });
  });

  it('never turns a missing stage into zero, and a backward ending is Unknown', () => {
    const measures = stepMeasures(read(row('brief', 10)), Date.parse(at(5)));
    expect(measures).toMatchObject({
      label: 'Inferred',
      elapsedMs: {
        toClose: { state: 'unknown', why: 'ending-before-start' },
        toFirstDraftCheckAttempt: { state: 'unknown', why: 'no-ending-observation' },
        toFirstPassedDraftCheck: { state: 'unknown', why: 'no-ending-observation' },
        toFirstPassedInventoryCheck: { state: 'unknown', why: 'no-ending-observation' },
        toFirstRender: { state: 'unknown', why: 'no-ending-observation' },
      },
      revisions: { draft: { state: 'unknown', why: 'no-completed-check' }, inventory: { state: 'unknown', why: 'no-completed-check' } },
      reviewRounds: {
        fidelity: { state: 'counted', opened: 0, paired: 0, unfinished: 0, pairedMs: { state: 'unknown', why: 'no-paired-round' } },
        design: { state: 'counted', opened: 0, paired: 0, unfinished: 0, pairedMs: { state: 'unknown', why: 'no-paired-round' } },
      },
    });
    const backward = stepMeasures(read(row('brief', 10), row('check', 4, { outcome: 'passed', revision: 0 })), CLOSE);
    expect(backward).toMatchObject({ elapsedMs: { toFirstDraftCheckAttempt: { state: 'unknown', why: 'ending-before-start' }, toFirstPassedDraftCheck: { state: 'unknown', why: 'ending-before-start' } } });
  });

  it('counts only completed checks, and an unusable revision is Unknown', () => {
    const refusedOnly = stepMeasures(read(row('brief', 0), row('check', 1, { outcome: 'refused' })), CLOSE);
    expect(refusedOnly).toMatchObject({ elapsedMs: { toFirstDraftCheckAttempt: { state: 'measured', ms: 60_000 } }, revisions: { draft: { state: 'unknown', why: 'no-completed-check' } } });
    for (const revision of [-1, 1.5, '2', null]) {
      const unusable = stepMeasures(read(row('brief', 0), row('inventory-check', 1, { outcome: 'passed', revision })), CLOSE);
      expect(unusable).toMatchObject({ revisions: { inventory: { state: 'unknown', why: 'unusable-revision' } } });
    }
    const rendered = stepMeasures(read(row('brief', 0), row('render', 1, { outcome: 'refused' }), row('render', 3, { outcome: 'rendered' })), CLOSE);
    expect(rendered).toMatchObject({ elapsedMs: { toFirstRender: { state: 'measured', ms: 180_000 } } });
  });

  it('pairs a review validation once with the latest pending opener of its own kind', () => {
    const measures = stepMeasures(read(
      row('brief', 0),
      row('session-prompt', 1, { outcome: 'delivered', role: 'review', kind: 'fidelity', session: 3, round: 1 }),
      row('session-prompt', 2, { outcome: 'delivered', role: 'review', kind: 'fidelity', session: 3, round: 2 }),
      row('session-prompt', 3, { outcome: 'delivered', role: 'review', kind: 'design', session: 4, round: 1 }),
      row('await', 4, { outcome: 'delivered', role: 'review', kind: 'fidelity', session: 3, round: 2 }),
      row('review-check', 5, { outcome: 'refused', kind: 'fidelity', number: 1 }),
      row('review-check', 6, { outcome: 'refused', kind: 'design', number: 1 }),
      row('review-check', 7, { outcome: 'validated', kind: 'fidelity', number: 2 }),
      row('review-check', 8, { outcome: 'validated', kind: 'fidelity', number: 3 }),
    ), CLOSE);
    expect(measures).toMatchObject({
      reviewRounds: {
        fidelity: { state: 'counted', opened: 2, paired: 1, unfinished: 1, pairedMs: { state: 'measured', ms: 300_000 } },
        design: { state: 'counted', opened: 1, paired: 0, unfinished: 1, pairedMs: { state: 'unknown', why: 'no-paired-round' } },
      },
    });
  });

  it('ignores a validation before any opener and a prompt of another role', () => {
    const measures = stepMeasures(read(
      row('brief', 0),
      row('review-check', 1, { outcome: 'validated', kind: 'fidelity', number: 1 }),
      row('session-prompt', 2, { outcome: 'issued', role: 'inventory', kind: 'fidelity', session: 1 }),
      row('session-prompt', 3, { outcome: 'issued', role: 'all', sessions: [{ role: 'review', kind: 'fidelity', session: 2 }] }),
    ), CLOSE);
    expect(measures).toMatchObject({ reviewRounds: { fidelity: { state: 'counted', opened: 0, paired: 0, unfinished: 0 } } });
  });

  it('makes a kind Unknown for a repeated or invalid round identity, and leaves the other kind counted', () => {
    const fidelity = (session: unknown, round: unknown, outcome = 'delivered', minute = 1): string =>
      row('session-prompt', minute, { outcome, role: 'review', kind: 'fidelity', session, round });
    const design = row('session-prompt', 9, { outcome: 'issued', role: 'review', kind: 'design', session: 5 });
    const repeated = stepMeasures(read(row('brief', 0), fidelity(1, 1), fidelity(1, 1, 'delivered', 2), design), CLOSE);
    expect(repeated).toMatchObject({ reviewRounds: { fidelity: { state: 'unknown', why: 'repeated-round-identity' }, design: { state: 'counted', opened: 1 } } });
    // An issued prompt opens round 1 of its session, so a delivered round 1 of that session repeats its identity.
    expect(stepMeasures(read(row('brief', 0), fidelity(1, undefined, 'issued'), fidelity(1, 1, 'delivered', 2)), CLOSE))
      .toMatchObject({ reviewRounds: { fidelity: { state: 'unknown', why: 'repeated-round-identity' } } });
    expect(stepMeasures(read(row('brief', 0), fidelity(1, 1), fidelity(2, 1, 'delivered', 2)), CLOSE))
      .toMatchObject({ reviewRounds: { fidelity: { state: 'counted', opened: 2, unfinished: 2 } } });
    for (const [session, round] of [[0, 1], [1, 0], [1, undefined], ['1', 1], [1.5, 1], [1, -2]] as const) {
      expect(stepMeasures(read(row('brief', 0), fidelity(session, round)), CLOSE))
        .toMatchObject({ reviewRounds: { fidelity: { state: 'unknown', why: 'invalid-round-identity' } } });
    }
    expect(stepMeasures(read(row('brief', 0), fidelity(0, undefined, 'issued')), CLOSE))
      .toMatchObject({ reviewRounds: { fidelity: { state: 'unknown', why: 'invalid-round-identity' } } });
  });

  it('gives no paired sum when a paired interval runs backwards', () => {
    const measures = stepMeasures(read(
      row('brief', 0),
      row('session-prompt', 9, { outcome: 'issued', role: 'review', kind: 'design', session: 1 }),
      row('review-check', 4, { outcome: 'validated', kind: 'design', number: 1 }),
    ), CLOSE);
    expect(measures).toMatchObject({ reviewRounds: { design: { state: 'counted', opened: 1, paired: 1, unfinished: 0, pairedMs: { state: 'unknown', why: 'paired-interval-backwards' } } } });
  });

  it('gives no paired sum outside exact integer representation', () => {
    const far = (step: string, year: string, extra: Record<string, unknown>): string =>
      JSON.stringify({ format: 'polaris-dossier-step/1', step, at: `${year}-01-01T00:00:00.000Z`, ...extra });
    const lines = [far('brief', '0000', {})];
    for (let session = 1; session <= 30; session++) {
      lines.push(far('session-prompt', '0000', { outcome: 'issued', role: 'review', kind: 'fidelity', session }));
      lines.push(far('review-check', '9999', { outcome: 'validated', kind: 'fidelity', number: session }));
    }
    expect(stepMeasures(read(...lines), CLOSE)).toMatchObject({ reviewRounds: { fidelity: { state: 'counted', paired: 30, pairedMs: { state: 'unknown', why: 'sum-not-exact-integer' } } } });
  });

  it('reads only valid UTC instants in the form Syzygy writes', () => {
    expect(utcInstantMs('2026-11-25T10:00:00.000Z')).toBe(1_795_600_800_000);
    for (const bad of ['2026-11-25T10:00:00Z', '2026-11-25T10:00:00.000+00:00', '2026-13-01T00:00:00.000Z', '2026-11-31T00:00:00.000Z', 1, null]) {
      expect(utcInstantMs(bad)).toBeNull();
    }
  });
});
