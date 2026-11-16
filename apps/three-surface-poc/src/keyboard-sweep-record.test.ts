import { rmSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { evaluationIdentity } from '@syzygy/three-surface-poc-core';

import { TAILNET_MOUNT_PREFIX } from './tailnet.js';
import { keyboardSweepEvidence, keyboardSweepOutput, parseKeyboardSweepArguments, servedEvaluationBinding, sweptEvaluation } from './keyboard-sweep-record.js';
import type { AccessibilityReport } from './polaris-accessibility.js';
import { renderPolarisPage } from './polaris.js';
import { buildFixtureModel } from './test-model-fixture.js';
import { ADMITTING_AUTHORITY, projectShapeFixtureGit } from './test-project-shape-fixture.js';
import { walkthroughJudgmentFixture } from './test-walkthrough-judgment-fixture.js';

const cleanups: string[] = [];
afterAll(() => { for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true }); });

const REVISION = 'a'.repeat(40);
const page = (body: string): string => `<!doctype html><html><body><main>${body}</main>`;
const probe = (revision: string): string => `<p class="currency-probe-facts" data-currency-probe-evaluation="e" data-currency-probe-pinned="${revision}" data-currency-probe-current="${revision}">`;
const footer = (snapshot: string, asOf: string): string => `<footer data-copy-role="project-fact">Evaluation <code>${snapshot}</code> as of <code>${asOf}</code>.</footer>`;
const WALKTHROUGH = 'pwb-eval-0123456789abcdef01234567';
const expectedBinding = (identity: string): string => `<p><small>Expected binding: surface version <code data-polaris-readiness-expected-surface>s</code>; evaluation <code data-polaris-readiness-expected-evaluation>${identity}</code>.</small></p>`;

describe('keyboard sweep arguments (syzygy-buzg)', () => {
  it('refuses to run without a task, and names it in the record when given', () => {
    expect(parseKeyboardSweepArguments(['--base-url', 'http://127.0.0.1:1'])).toEqual({ refused: 'no --task: name the bead this sweep is evidence for' });
    expect(parseKeyboardSweepArguments(['--task', '--base-url', 'http://127.0.0.1:1'])).toEqual({ refused: '--task "--base-url" is not a bead id' });
    expect(parseKeyboardSweepArguments(['--task', 'syzygy 1z3', '--file', 'a.html'])).toEqual({ refused: '--task "syzygy 1z3" is not a bead id' });
    expect(parseKeyboardSweepArguments(['--task', 'syzygy-buzg'])).toEqual({ refused: 'name exactly one of --base-url or --file' });
    expect(parseKeyboardSweepArguments(['--task', 'syzygy-buzg', '--base-url', 'http://127.0.0.1:1', '--file', 'a.html'])).toEqual({ refused: 'name exactly one of --base-url or --file' });
    expect(parseKeyboardSweepArguments(['--task', 'syzygy-1z3.30', '--file', 'a.html', '--file', 'b.html', '--date', '2026-10-04-x'])).toEqual({
      task: 'syzygy-1z3.30', baseUrl: undefined, files: ['a.html', 'b.html'], date: '2026-10-04-x', out: undefined,
    });
  });

  it('writes to --out and creates only its directory; the dated default goes under docs/evidence (syzygy-7dch)', () => {
    expect(keyboardSweepOutput({ date: undefined, out: '/tmp/x/sweep.json' }, '2026-10-04')).toEqual({ file: '/tmp/x/sweep.json', directory: '/tmp/x' });
    expect(keyboardSweepOutput({ date: '2026-10-04-b', out: 'scratch/r.json' }, '2026-10-05')).toEqual({ file: 'scratch/r.json', directory: 'scratch' });
    expect(keyboardSweepOutput({ date: undefined, out: undefined }, '2026-10-04')).toEqual({ file: 'docs/evidence/polaris-keyboard-sweep-2026-10-04.json', directory: 'docs/evidence' });
    expect(keyboardSweepOutput({ date: '2026-10-04-b', out: undefined }, '2026-10-05')).toEqual({ file: 'docs/evidence/polaris-keyboard-sweep-2026-10-04-b.json', directory: 'docs/evidence' });
  });
});

describe('the evaluation a swept page names (rule 11; syzygy-buzg)', () => {
  it('reads the Butlers revision and evaluation identity a served Polaris page renders, on both mounts', () => {
    // A judgment input with no run record, as a fresh daemon serves: the
    // readiness section still renders the binding a record must name.
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() }, walkthroughJudgment: walkthroughJudgmentFixture('absent-run-record') });
    const readiness = model.walkthroughReadiness;
    if (readiness.kind !== 'evaluated') throw new Error('fixture readiness was not evaluated');
    const expected = { butlersRevision: model.evaluation.evidence.pinnedRevision, evaluationIdentity: evaluationIdentity(model), walkthroughEvaluationIdentity: readiness.readiness.expected.evaluationIdentity };
    expect(expected.butlersRevision).toMatch(/^[0-9a-f]{40}$/);
    expect(expected.walkthroughEvaluationIdentity).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    expect(expected.walkthroughEvaluationIdentity).not.toBe(expected.evaluationIdentity);
    expect(servedEvaluationBinding(renderPolarisPage(model))).toEqual(expected);
    expect(servedEvaluationBinding(renderPolarisPage(model, TAILNET_MOUNT_PREFIX))).toEqual(expected);
    const other = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() }, walkthroughJudgment: walkthroughJudgmentFixture('absent-run-record'), evaluationAsOf: '2026-09-01T00:00:00Z' });
    expect(servedEvaluationBinding(renderPolarisPage(other))).toEqual({ butlersRevision: other.evaluation.evidence.pinnedRevision, evaluationIdentity: evaluationIdentity(other), walkthroughEvaluationIdentity: expected.walkthroughEvaluationIdentity });
    expect(evaluationIdentity(other)).not.toBe(expected.evaluationIdentity);
  }, 30_000); // two fixture model builds: worst 4.9 s over 5 alone runs at load1 86-114 (docs/evidence/syzygy-bpyt-4-31/durations/keyboard-sweep-record.test.tests.json); the 5 s default failed such tests under suite load (syzygy-k66p)

  it('decodes the escaped footer and refuses a page that names no evaluation, two, or an abbreviated revision', () => {
    expect(servedEvaluationBinding(page(probe(REVISION) + footer('repository:x@y|inputs:a&amp;b', '2026-10-04T00:00:00Z') + expectedBinding(WALKTHROUGH)))).toEqual({
      butlersRevision: REVISION, evaluationIdentity: 'repository:x@y|inputs:a&b|observed:2026-10-04T00:00:00Z', walkthroughEvaluationIdentity: WALKTHROUGH,
    });
    expect(servedEvaluationBinding(page(footer('s', 't')))).toEqual({ refused: 'expected one currency-probe pinned revision, found 0' });
    expect(servedEvaluationBinding(page(probe(REVISION) + probe(REVISION) + footer('s', 't')))).toEqual({ refused: 'expected one currency-probe pinned revision, found 2' });
    expect(servedEvaluationBinding(page(probe(REVISION.slice(0, 12)) + footer('s', 't')))).toEqual({ refused: 'pinned revision "aaaaaaaaaaaa" is not a full commit id' });
    expect(servedEvaluationBinding(page(probe(REVISION)))).toEqual({ refused: 'expected one evaluation footer, found 0' });
    expect(servedEvaluationBinding(page(probe(REVISION) + footer('s', 't') + footer('s', 't')))).toEqual({ refused: 'expected one evaluation footer, found 2' });
    expect(servedEvaluationBinding(page(probe(REVISION) + footer('', 't')))).toEqual({ refused: 'the evaluation footer names no snapshot or instant' });
  });

  it('refuses a page whose walkthrough evaluation identity is missing, duplicated or not an identifier (syzygy-7dch)', () => {
    const base = probe(REVISION) + footer('s', 't');
    expect(servedEvaluationBinding(page(base))).toEqual({ refused: 'expected one walkthrough evaluation identity, found 0' });
    expect(servedEvaluationBinding(page(base + expectedBinding(WALKTHROUGH) + expectedBinding(WALKTHROUGH)))).toEqual({ refused: 'expected one walkthrough evaluation identity, found 2' });
    expect(servedEvaluationBinding(page(base + expectedBinding('')))).toEqual({ refused: 'walkthrough evaluation identity "" is not an identifier' });
    expect(servedEvaluationBinding(page(base + expectedBinding('pwb eval')))).toEqual({ refused: 'walkthrough evaluation identity "pwb eval" is not an identifier' });
    // The run record's identity is a different field and never stands in for the expected binding.
    expect(servedEvaluationBinding(page(base + `<code data-polaris-readiness-evaluation>${WALKTHROUGH}</code>`))).toEqual({ refused: 'expected one walkthrough evaluation identity, found 0' });
  });
});

describe('the sweep record (syzygy-buzg)', () => {
  const evaluation = { butlersRevision: REVISION, evaluationIdentity: 'repository:x@y|inputs:z|observed:2026-10-04T00:00:00Z', walkthroughEvaluationIdentity: WALKTHROUGH };
  const at = (snapshot: string, revision = REVISION, walkthrough = WALKTHROUGH): string => page(probe(revision) + footer(snapshot, '2026-10-04T00:00:00Z') + expectedBinding(walkthrough));

  it('takes the one evaluation every mount renders, and refuses a mount that names none or another', () => {
    expect(sweptEvaluation([{ mount: 'direct', html: at('repository:x@y|inputs:z') }, { mount: 'tailnet', html: at('repository:x@y|inputs:z') }])).toEqual(evaluation);
    expect(sweptEvaluation([{ mount: 'direct', html: at('repository:x@y|inputs:z') }, { mount: 'tailnet', html: at('repository:x@y|inputs:w') }])).toEqual({
      refused: "tailnet renders evaluation repository:x@y|inputs:w|observed:2026-10-04T00:00:00Z at aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa, not direct's repository:x@y|inputs:z|observed:2026-10-04T00:00:00Z at aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    expect('refused' in sweptEvaluation([{ mount: 'direct', html: at('s') }, { mount: 'tailnet', html: at('s', 'b'.repeat(40)) }])).toBe(true);
    expect(sweptEvaluation([{ mount: 'file:a.html', html: page(footer('s', 't')) }])).toEqual({ refused: 'file:a.html: the page names no evaluation to record (expected one currency-probe pinned revision, found 0)' });
    expect(sweptEvaluation([])).toEqual({ refused: 'no page to sweep' });
  });

  it('refuses mounts that agree on the footer but disagree on the walkthrough evaluation identity, or where one names none (syzygy-7dch)', () => {
    expect(sweptEvaluation([{ mount: 'direct', html: at('repository:x@y|inputs:z') }, { mount: 'tailnet', html: at('repository:x@y|inputs:z', REVISION, 'pwb-eval-ffffffffffffffffffffffff') }])).toEqual({
      refused: `tailnet renders walkthrough evaluation pwb-eval-ffffffffffffffffffffffff, not direct's ${WALKTHROUGH}`,
    });
    expect(sweptEvaluation([{ mount: 'direct', html: at('repository:x@y|inputs:z') }, { mount: 'tailnet', html: page(probe(REVISION) + footer('repository:x@y|inputs:z', '2026-10-04T00:00:00Z')) }])).toEqual({
      refused: 'tailnet: the page names no evaluation to record (expected one walkthrough evaluation identity, found 0)',
    });
  });

  it('names the task, the Butlers revision and the evaluation identity beside each mount digest', () => {
    const report = { focusTrace: { population: 3, reached: 3 }, activations: [{}], disclosures: 1, contrast: { measured: 2 }, violations: [{ kind: 'focus-lost' }] } as unknown as AccessibilityReport;
    const record = keyboardSweepEvidence({
      task: 'syzygy-buzg', evaluation, capturedAt: '2026-10-04T01:00:00Z', syzygyHead: 'c'.repeat(40), surfaceVersion: 'polaris@0123456789ab',
      browser: { executable: 'chromium', version: '1' },
      sweeps: [{ mount: 'direct', measuredOn: { path: '/polaris' }, bytes: 10, sha256: 'd'.repeat(64), report }],
    });
    expect(record).toMatchObject({
      task: 'syzygy-buzg',
      butlersRevision: REVISION,
      evaluationIdentity: 'repository:x@y|inputs:z|observed:2026-10-04T00:00:00Z',
      walkthroughEvaluationIdentity: WALKTHROUGH,
      syzygyHead: 'c'.repeat(40),
      mounts: [{ mount: 'direct', sha256: 'd'.repeat(64), violations: 1, violationsByKind: { 'focus-lost': 1 } }],
      totals: { mounts: 1, violations: 1 },
    });
    expect(JSON.stringify(record)).not.toContain('1z3.30');
  });
});
