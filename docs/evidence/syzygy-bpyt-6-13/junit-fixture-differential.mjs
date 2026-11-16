// Old-versus-new differential for syzygy-bpyt.6.13 item 4: the two production hash sites #530 left in place, replaced by
// @syzygy/support's sha256 (review R-GP-IMPL-SUPPORT-LEAF-1 N1, confirmed byte-unchanged by round 2).
//   A  junitDigest (packages/three-surface-poc-core/src/test-artifact-verification.ts), through its only caller,
//      buildOperatorReportedTestArtifactRecord, over a byte corpus the function is handed: valid and invalid UTF-8, a BOM,
//      multi-byte names, a pooled Buffer, a plain Uint8Array, two views with a non-zero byteOffset, the 4 MiB ceiling and one
//      byte over it, an empty array. Each built record's digest is also compared with node:crypto taken directly over the same
//      bytes (the independent oracle), so a row that is equal old and new but wrong is visible.
//   B  the walkthrough-judgment fixture's local sha256 (apps/three-surface-poc/src/test-walkthrough-judgment-fixture.ts),
//      through walkthroughJudgmentFixture over every state and several run-record variants, including non-ASCII answer text and
//      a lone surrogate: the whole evaluator input (bytes as hex) and the production evaluator's verdict over it.
// Usage: node junit-fixture-differential.mjs <built clone> <out.json>
//   The clone is built with `npm run build:poc` (one command, recorded below). The output depends on no path and no clock:
//   two runs of the same tree are byte-identical, and the run at the base and at the head are compared with compare-rows.py.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [root, out] = process.argv.slice(2);
if (out === undefined) throw new Error('usage: junit-fixture-differential.mjs <built clone> <out.json>');
const load = (p) => import(pathToFileURL(join(root, p)).href);
const core = await load('packages/three-surface-poc-core/dist/index.js');
const fixture = await load('apps/three-surface-poc/dist/test-walkthrough-judgment-fixture.js');

const h = (v) => createHash('sha256').update(v).digest('hex');
const hex = (bytes) => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('hex');

// ---- A: junitDigest ---------------------------------------------------------------------------------------------------
const suite = (attributes) => `<?xml version="1.0" encoding="utf-8"?><testsuites><testsuite ${attributes}><testcase classname="a" name="b"/></testsuite></testsuites>`;
const PASSING = suite('name="pytest" errors="0" failures="0" skipped="0" tests="3" time="0.421"');
const FAILING = suite('name="pytest" errors="0" failures="2" skipped="0" tests="3" time="0.421"');
const EMPTY_RUN = '<testsuite tests="0">';
const MAX = core.MAX_JUNIT_ARTIFACT_BYTES;
const padTo = (text, size) => {
  const head = Buffer.from(text, 'utf8');
  const body = Buffer.alloc(size - head.length, 0x20);
  return Buffer.concat([head, body]);
};
const embedded = (text, front, back) => {
  const whole = Buffer.concat([Buffer.alloc(front, 0x61), Buffer.from(text, 'utf8'), Buffer.alloc(back, 0x62)]);
  return { whole, view: whole.subarray(front, front + Buffer.byteLength(text, 'utf8')) };
};
const invalidTail = Buffer.concat([Buffer.from(PASSING, 'utf8'), Buffer.from([0xff, 0xfe, 0xc3, 0x28, 0xa0, 0xa1])]);
const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(PASSING, 'utf8')]);
const multibyte = Buffer.from(suite('name="pytest-é-日本-😀" errors="0" failures="0" skipped="1" tests="4" time="1.5"'), 'utf8');
const buffer = embedded(PASSING, 17, 23);
const typed = embedded(PASSING, 5, 9);
const CORPUS = [
  ['passing-buffer', Buffer.from(PASSING, 'utf8'), 0],
  ['passing-plain-uint8array', new Uint8Array(Buffer.from(PASSING, 'utf8')), 0],
  ['passing-pooled-small-buffer', Buffer.from('<testsuite tests="1">', 'utf8'), 0],
  ['passing-subarray-view-offset-17', buffer.view, 0],
  ['passing-uint8array-view-offset-5', new Uint8Array(typed.whole.buffer, typed.whole.byteOffset + 5, Buffer.byteLength(PASSING, 'utf8')), 0],
  ['failing-exit-1', Buffer.from(FAILING, 'utf8'), 1],
  ['empty-run-exit-5', Buffer.from(EMPTY_RUN, 'utf8'), 5],
  ['invalid-utf8-tail', invalidTail, 0],
  ['utf8-bom', bom, 0],
  ['multibyte-names', multibyte, 0],
  ['at-the-ceiling', padTo(PASSING, MAX), 0],
  ['one-byte-over-the-ceiling', padTo(PASSING, MAX + 1), 0],
  ['not-xml', Buffer.from('not xml at all', 'utf8'), 0],
  ['empty-array', new Uint8Array(0), 0],
  ['inconsistent-exit-0-with-failures', Buffer.from(FAILING, 'utf8'), 0],
];
const baseInput = { command: ['python3', '-m', 'pytest', 'x', '-q'], ingestedAt: '2026-08-30T08:00:00Z', repositoryCommit: 'a'.repeat(40), scope: 'x' };
const rowsA = CORPUS.map(([id, raw, reportedExitCode]) => {
  const result = core.buildOperatorReportedTestArtifactRecord({ ...baseInput, reportedExitCode, rawJUnit: raw });
  const oracle = `sha256:${h(Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength))}`;
  return {
    id,
    byteLength: raw.byteLength,
    // The offset itself is an allocation-history accident (a pooled slab), so only whether the view sits in a larger buffer is recorded.
    viewOfLargerBuffer: raw.buffer.byteLength > raw.byteLength,
    kind: result.kind,
    result: JSON.stringify(result),
    oracleDigest: oracle,
    builtDigestEqualsOracle: result.kind === 'built' ? result.record.digest === oracle : null,
  };
});

// ---- B: the walkthrough-judgment fixture -----------------------------------------------------------------------------
const STATES = ['lawful-state-1', 'lawful-state-2', 'unlawful', 'absent-run-record', 'absent-judgment'];
const answers = fixture.fixtureAnswers();
const unicode = answers.map((answer, i) => (i === 0 ? { ...answer, text: 'Why: é日本 😀 resumé.' } : answer));
const lone = answers.map((answer, i) => (i === 0 ? { ...answer, text: 'lone surrogate \ud800 here' } : answer));
const VARIANTS = [
  ['default', {}],
  ['traversed-one-route', { traversed: ['/polaris'] }],
  ['no-answers-section', { answers: null }],
  ['non-ascii-answer-text', { answers: unicode }],
  ['lone-surrogate-answer-text', { answers: lone }],
];
const serial = (input) => JSON.stringify(input, (key, value) => {
  if (value instanceof Uint8Array) return { bytesHex: hex(value) };
  if (typeof value === 'function') return { function: value.name || '(anonymous)', returns: value === core.JUDGMENT_CORRELATION_UNAVAILABLE ? 'unavailable' : String(value()) };
  return value;
});
const rowsB = [];
for (const [variant, options] of VARIANTS) {
  for (const state of STATES) {
    const input = fixture.walkthroughJudgmentFixture(state, 'judgment-eval-0001', options);
    const verdict = core.evaluateWalkthroughJudgment(input);
    rowsB.push({ id: `${variant}/${state}`, input: serial(input), inputSha256: h(serial(input)), evaluation: JSON.stringify(verdict), evaluationSha256: h(JSON.stringify(verdict)) });
  }
}

const rows = [...rowsA.map((r) => ({ family: 'A-junitDigest', ...r })), ...rowsB.map((r) => ({ family: 'B-walkthrough-judgment-fixture', ...r }))];
writeFileSync(out, JSON.stringify({
  node: process.version,
  buildCommand: 'npm run build:poc',
  rowsCompared: rows.length,
  familyA: rowsA.length,
  familyB: rowsB.length,
  junitBuiltRowsEqualToOracle: rowsA.filter((r) => r.builtDigestEqualsOracle === true).length,
  junitBuiltRows: rowsA.filter((r) => r.kind === 'built').length,
  evaluationOutcomeKinds: Object.fromEntries([...new Set(rowsB.map((r) => JSON.parse(r.evaluation).outcome?.kind ?? 'none'))].sort().map((k) => [k, rowsB.filter((r) => (JSON.parse(r.evaluation).outcome?.kind ?? 'none') === k).length])),
  viewsOfLargerBuffers: rowsA.filter((r) => r.viewOfLargerBuffer).length,
  rows,
}, null, 1) + '\n');
console.log(`wrote ${out}: ${rows.length} rows`);
