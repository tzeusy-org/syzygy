import { rmSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import { escapeHtml } from '@syzygy/http-host';

import { compositeEvaluationLine, substrateEvaluationFooter } from './evaluation-footer.js';
import { buildFixtureModel } from './test-model-fixture.js';

const cleanups: string[] = [];
afterEach(() => {
  for (const directory of cleanups.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('compositeEvaluationLine', () => {
  it('renders exactly model.evaluation.snapshot and model.evaluation.asOf, never a recomputed identity', () => {
    const model = buildFixtureModel(cleanups);
    const line = compositeEvaluationLine(model, escapeHtml);
    expect(line).toBe(
      `Evaluation <code>${model.evaluation.snapshot}</code> as of <code>${model.evaluation.asOf}</code>.`,
    );
  });

  it('escapes the snapshot and asOf values through the injected escaper', () => {
    const model = buildFixtureModel(cleanups, { evaluationAsOf: '2026-08-30T12:00:00Z' });
    const line = compositeEvaluationLine(
      { ...model, evaluation: { ...model.evaluation, snapshot: '<b>x</b>' } },
      escapeHtml,
    );
    expect(line).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(line).not.toContain('<b>x</b>');
  });
});

describe('substrateEvaluationFooter', () => {
  it('names Unknown, with no revision span, when revision is null', () => {
    const model = buildFixtureModel(cleanups);
    const footer = substrateEvaluationFooter({
      model,
      escapeHtml,
      revisionOf: 'the thing under test',
      revision: null,
      skewChecks: [],
    });
    expect(footer).toContain(compositeEvaluationLine(model, escapeHtml));
    expect(footer).toContain('the thing under test: Unknown — this surface has no observed substrate revision to name.');
    expect(footer).not.toContain('data-parity-field="surface-substrate-revision"');
  });

  it('names what the revision is a revision of, with no Skew line, when every check matches', () => {
    const model = buildFixtureModel(cleanups);
    const footer = substrateEvaluationFooter({
      model,
      escapeHtml,
      revisionOf: 'the thing under test',
      revision: 'rev-123',
      skewChecks: [{ label: 'a check', observed: 'same', expected: 'same' }],
    });
    expect(footer).toContain('<code data-parity-field="surface-substrate-revision">rev-123</code>');
    expect(footer).toContain('is a revision of the thing under test');
    expect(footer).not.toContain('data-parity-field="evaluation-skew"');
  });

  it('mutation check: any one differing check renders an explicit Skew line naming both values, and leaves matching checks out of it', () => {
    const model = buildFixtureModel(cleanups);
    const footer = substrateEvaluationFooter({
      model,
      escapeHtml,
      revisionOf: 'the thing under test',
      revision: 'rev-123',
      skewChecks: [
        { label: 'matching check', observed: 'same', expected: 'same' },
        { label: 'differing check', observed: 'a', expected: 'b' },
      ],
    });
    expect(footer).toContain('<strong data-parity-field="evaluation-skew">Skew</strong>');
    expect(footer).toContain('differing check is <code>a</code>, not <code>b</code>');
    expect(footer).not.toContain('matching check is');
  });

  it('joins multiple differing checks with "; " rather than dropping all but one', () => {
    const model = buildFixtureModel(cleanups);
    const footer = substrateEvaluationFooter({
      model,
      escapeHtml,
      revisionOf: 'the thing under test',
      revision: 'rev-123',
      skewChecks: [
        { label: 'first', observed: 'a1', expected: 'b1' },
        { label: 'second', observed: 'a2', expected: 'b2' },
      ],
    });
    expect(footer).toContain('first is <code>a1</code>, not <code>b1</code>; second is <code>a2</code>, not <code>b2</code>');
  });
});
