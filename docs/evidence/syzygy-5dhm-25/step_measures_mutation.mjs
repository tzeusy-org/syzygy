#!/usr/bin/env node
// Rule-6 mutation run for syzygy-5dhm.25 (REQ-polaris-generation-033 version 2.31 step measures).
// Usage: node docs/evidence/syzygy-5dhm-25/step_measures_mutation.mjs <out.json>
// Applies each mutant (an exact, unique old -> new fragment) to a clean tree, runs the two step-measure test files, records the
// failed-test count read from vitest's output, and restores the file byte for byte. Refuses to start on a dirty source file.
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';

const CLOSE = 'packages/polaris-dossier/src/close.ts';
const MEASURES = 'packages/polaris-dossier/src/step-measures.ts';
const TESTS = ['packages/polaris-dossier/src/step-measures.test.ts', 'packages/polaris-dossier/src/close-step-measures.test.ts'];

const MUTANTS = [
  ['steps-view-rereads', CLOSE, 'steps: stepInstantsOf(stepLog),', 'steps: stepInstants(run),'],
  ['measures-reread', CLOSE, 'stepMeasures: stepMeasures(stepLog, now),', 'stepMeasures: stepMeasures(readStepLog(run), now),'],
  ['no-compact-form', CLOSE, ", `${JSON.stringify(candidate)}\\n`]", ']'],
  ['no-capacity-fallback', CLOSE, "[record, { ...record, stepMeasures: CAPACITY_UNKNOWN }]", '[record]'],
  ['capacity-not-refused', CLOSE, 'if (encoded === null) {', 'if (false) {'],
  ['byte-check-chars', CLOSE, "Buffer.byteLength(text, 'utf8') > CLOSE_RECORD_MAX_BYTES", 'text.length > CLOSE_RECORD_MAX_BYTES'],
  ['format-unchecked', MEASURES, "entry['format'] !== STEP_LOG_FORMAT || ", ''],
  ['instant-no-roundtrip', MEASURES, ' || new Date(ms).toISOString() !== at', ''],
  ['instant-ms-optional', MEASURES, '\\d{2}:\\d{2}\\.\\d{3}Z$/u', '\\d{2}:\\d{2}(?:\\.\\d{3})?Z$/u'],
  ['absent-as-unreadable', MEASURES, "why: 'step-log-absent' };", "why: 'step-log-unreadable' };"],
  ['empty-not-unknown', MEASURES, "prefix.length === 0 ? 'step-log-empty'", "false ? 'step-log-empty'"],
  ['malformed-not-unknown', MEASURES, "counts.rejected > 0 ? 'step-log-malformed-row'", "false ? 'step-log-malformed-row'"],
  ['over-limit-off-by-one', MEASURES, "counts.omitted > 0 ? 'step-log-over-retained-limit'", "counts.omitted > 1 ? 'step-log-over-retained-limit'"],
  ['prefix-uncapped', MEASURES, 'snapshot.lines.slice(0, STEP_LINES_MAX)', 'snapshot.lines'],
  ['retained-limit-larger', MEASURES, 'export const STEP_LINES_MAX = 10_000;', 'export const STEP_LINES_MAX = 10_001;'],
  ['missing-ending-zero', MEASURES, "if (end === undefined) return { state: 'unknown', why: 'no-ending-observation' };", "if (end === undefined) return { state: 'measured', ms: 0 };"],
  ['backward-ending-allowed', MEASURES, 'if (end < start) return', 'if (false) return'],
  ['attempt-excludes-refused', MEASURES, "first((row) => row.step === 'check')),", "first((row) => row.step === 'check' && row.outcome !== 'refused')),"],
  ['passed-draft-any-completed', MEASURES, "row.step === 'check' && row.outcome === 'passed'", "row.step === 'check' && row.outcome !== 'refused'"],
  ['passed-inventory-any', MEASURES, "row.step === 'inventory-check' && row.outcome === 'passed'", "row.step === 'inventory-check'"],
  ['render-any-outcome', MEASURES, "row.step === 'render' && row.outcome === 'rendered'", "row.step === 'render'"],
  ['revisions-not-distinct', MEASURES, 'new Set(completed.map((row) => row.revision)).size', 'completed.length'],
  ['revisions-include-refused', MEASURES, "(row.outcome === 'passed' || row.outcome === 'findings')", 'row.outcome !== undefined'],
  ['unusable-revision-ignored', MEASURES, 'if (!completed.every((row) => nonnegative(row.revision)))', 'if (false)'],
  ['revision-zero-rejected', MEASURES, 'Number.isSafeInteger(value) && value >= 0', 'Number.isSafeInteger(value) && value > 0'],
  ['no-completed-check-zero', MEASURES, "if (completed.length === 0) return { state: 'unknown', why: 'no-completed-check' };", "if (completed.length === 0) return { state: 'counted', distinct: 0 };"],
  ['opener-any-role', MEASURES, "row.step === 'session-prompt' && row.role === 'review' && ", "row.step === 'session-prompt' && "],
  ['opener-issued-only', MEASURES, "(row.outcome === 'issued' || row.outcome === 'delivered')", "row.outcome === 'issued'"],
  ['issued-uses-row-round', MEASURES, "row.outcome === 'issued' ? 1 : row.round", 'row.round'],
  ['session-unchecked', MEASURES, 'if (!positive(row.session) || !positive(round))', 'if (!positive(round))'],
  ['repeat-allowed', MEASURES, 'if (seen.has(identity))', 'if (false)'],
  ['earliest-opener-kept', MEASURES, 'if (pending !== null) unfinished++;\n      pending = row;', 'if (pending === null) pending = row; else unfinished++;'],
  ['validation-pairs-repeatedly', MEASURES, 'pending = null;\n    }\n  }', '}\n  }'],
  ['refused-check-pairs', MEASURES, "row.outcome === 'validated' && pending !== null", 'pending !== null'],
  ['kind-unfiltered', MEASURES, 'if (row.kind !== kind) continue;', "if (row.step === 'session-prompt' && row.kind !== kind) continue;"],
  ['backward-pair-summed', MEASURES, "backwards ? { state: 'unknown', why: 'paired-interval-backwards' }", "false ? { state: 'unknown', why: 'paired-interval-backwards' }"],
  ['no-pair-zero', MEASURES, "paired === 0 ? { state: 'unknown', why: 'no-paired-round' }", "false ? { state: 'unknown', why: 'no-paired-round' }"],
  ['sum-unchecked', MEASURES, '!Number.isSafeInteger(sum) ?', 'false ?'],
  // Second-order: byte-check-chars and instant-ms-optional are each redundant with a second guard (the bounded JSON parse counts UTF-8
  // bytes against the same ceiling; the ISO round trip rejects an instant without milliseconds), so each pair is mutated together.
  ['byte-check-chars+no-parse-check', CLOSE, [
    ["Buffer.byteLength(text, 'utf8') > CLOSE_RECORD_MAX_BYTES", 'text.length > CLOSE_RECORD_MAX_BYTES'],
    ['try { parseBoundedJson(text, CLOSE_RECORD_JSON_LIMITS); return true; } catch { return false; }', 'return true;'],
  ]],
  ['instant-ms-optional+no-roundtrip', MEASURES, [
    ['\\d{2}:\\d{2}\\.\\d{3}Z$/u', '\\d{2}:\\d{2}(?:\\.\\d{3})?Z$/u'],
    [' || new Date(ms).toISOString() !== at', ''],
  ]],
  ['label-observed', MEASURES, "label: 'Inferred',\n    rows: counts,", "label: 'Observed',\n    rows: counts,"],
];

const out = process.argv[2];
if (!out) throw new Error('usage: step_measures_mutation.mjs <out.json>');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = execFileSync('git', ['status', '--porcelain', '--', CLOSE, MEASURES, ...TESTS], { encoding: 'utf8' });
if (dirty !== '') throw new Error(`refusing: source or test files differ from HEAD:\n${dirty}`);

const run = () => {
  const result = spawnSync('npx', ['vitest', 'run', '--project', 'unit', '--project', 'integration', ...TESTS], { encoding: 'utf8', env: process.env, maxBuffer: 64 * 1024 * 1024 });
  const text = `${result.stdout}\n${result.stderr}`.replace(/\u001b\[[0-9;]*m/gu, '');
  const failed = Number(/Tests\s+(\d+) failed/u.exec(text)?.[1] ?? 0);
  const passed = Number(/(\d+) passed/u.exec(/Tests\s+[^\n]*/u.exec(text)?.[0] ?? '')?.[1] ?? 0);
  const fileFailures = Number(/Test Files\s+(\d+) failed/u.exec(text)?.[1] ?? 0);
  return { exit: result.status, failed, passed, fileFailures };
};

const baseline = run();
if (baseline.exit !== 0 || baseline.failed !== 0 || baseline.passed === 0) throw new Error(`baseline not green: ${JSON.stringify(baseline)}`);
const results = [];
for (const [id, file, oldOrPairs, maybeNew] of MUTANTS) {
  const pairs = Array.isArray(oldOrPairs) ? oldOrPairs : [[oldOrPairs, maybeNew]];
  const oldText = pairs.length === 1 ? pairs[0][0] : pairs.map(([o]) => o);
  const newText = pairs.length === 1 ? pairs[0][1] : pairs.map(([, n]) => n);
  const original = fs.readFileSync(file, 'utf8');
  const counts = pairs.map(([o]) => original.split(o).length - 1);
  if (counts.some((count) => count !== 1)) { results.push({ id, file, old: oldText, new: newText, outcome: 'not-applied', occurrences: counts }); continue; }
  fs.writeFileSync(file, pairs.reduce((text, [o, n]) => text.replace(o, () => n), original));
  try {
    const outcome = run();
    results.push({ id, file, old: oldText, new: newText, outcome: outcome.exit !== 0 && (outcome.failed > 0 || outcome.fileFailures > 0) ? 'killed' : 'survived', ...outcome });
  } finally {
    fs.writeFileSync(file, original);
  }
  console.log(id, results.at(-1).outcome);
}
const after = run();
const record = {
  subject: 'REQ-polaris-generation-033 version 2.31 step measures (syzygy-5dhm.25)',
  commit,
  files: [CLOSE, MEASURES],
  tests: TESTS,
  command: `npx vitest run --project unit --project integration ${TESTS.join(' ')}`,
  baseline,
  restored: after,
  mutants: results.length,
  killed: results.filter((r) => r.outcome === 'killed').length,
  survived: results.filter((r) => r.outcome === 'survived').map((r) => r.id),
  notApplied: results.filter((r) => r.outcome === 'not-applied').map((r) => r.id),
  results,
};
fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({ mutants: record.mutants, killed: record.killed, survived: record.survived, notApplied: record.notApplied }));
