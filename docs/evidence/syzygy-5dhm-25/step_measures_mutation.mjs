// Recorded mutation run over the step-measures predicates (syzygy-5dhm.25), adapted from docs/evidence/syzygy-5dhm-41/worth_knowing_mutation.mjs.
// Usage: node step_measures_mutation.mjs <worktree> <out.json> [--dry]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the two test files, and restores the source in `finally`.
// `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const [root, out] = args.filter((arg) => !arg.startsWith('--'));
const env = { ...process.env, ...(process.env.MUTATION_TMPDIR ? { TMPDIR: process.env.MUTATION_TMPDIR } : {}) };
if (!root || !out) throw new Error('usage: node step_measures_mutation.mjs <worktree> <out.json> [--dry]');

const P = 'packages/polaris-dossier/src';
const MEASURES = `${P}/step-measures.ts`, CLOSE = `${P}/close.ts`;
const TESTS = [`${P}/step-measures.test.ts`, `${P}/close.test.ts`];
const MUTANTS = [
  ['span-order', MEASURES, 'if (to.ms < from.ms) return unknown(', 'if (false) return unknown('],
  ['round-order', MEASURES, 'if (end !== undefined && end.ms < row.ms) return unknown(', 'if (false) return unknown('],
  ['round-issued', MEASURES, "(row.outcome === 'delivered' || row.outcome === 'issued')", "row.outcome === 'delivered'"],
  ['round-role', MEASURES, "row.step === 'session-prompt' && row.role === 'review' && row.kind === kind", "row.step === 'session-prompt' && row.kind === kind"],
  ['round-first-validated', MEASURES, "if (later.outcome === 'validated') { end = later; break; }", "if (later.outcome === 'validated') { end = later; }"],
  ['round-next-prompt', MEASURES, '      if (isOpener(later, kind)) break;\n', ''],
  ['outcome-known', MEASURES, '(KNOWN_OUTCOMES as readonly string[]).includes(row.outcome) ? row.outcome', 'true ? row.outcome'],
  ['round-refused', MEASURES, "if (later.outcome === 'refused') refused++;", "if (later.outcome === 'refused') refused += 0;"],
  ['round-kind', MEASURES, "if (later.step !== 'review-check' || later.kind !== kind) continue;", "if (later.step !== 'review-check') continue;"],
  ['rounds-unknown', MEASURES, 'if (opened.length === 0) return unknown(', 'if (false) return unknown('],
  ['rounds-sum', MEASURES, 'ms: completed.reduce((sum, round) => sum + round.ms!, 0)', 'ms: 0'],
  ['revisions-unknown', MEASURES, 'if (own.length === 0) return unknown(', 'if (false) return unknown('],
  ['revisions-unnumbered', MEASURES, 'if (numbered.size === 0) return unknown(', 'if (false) return unknown('],
  ['first-passed-draft', MEASURES, "row.step === 'check' && row.outcome === 'passed'", "row.step === 'check'"],
  ['first-passed-inventory', MEASURES, "row.step === 'inventory-check' && row.outcome === 'passed'", "row.step === 'inventory-check'"],
  ['first-render', MEASURES, "row.step === 'render' && row.outcome === 'rendered'", "row.step === 'check'"],
  ['wall-end', MEASURES, '{ at: closedAt, ms: close }', '{ at: first.at, ms: first.ms }'],
  ['instant-shape', MEASURES, '!INSTANT.test(at)', 'false'],
  ['instant-parse', MEASURES, 'if (Number.isNaN(ms)) return null;', ''],
  ['count-nonnegative', MEASURES, 'value >= 0 ?', 'value >= -1 ?'],
  ['empty-reason', MEASURES, "unreadable === 0 ? 'the step log records no step'", "true ? 'the step log records no step'"],
  ['close-field', CLOSE, '    stepMeasures: closeStepMeasures(run, isoOf(now)),\n', ''],
  ['close-unreadable', CLOSE, 'if (!read.ok) return stepMeasures({ why: read.why }, closedAt);', 'if (!read.ok) return stepMeasures([], closedAt);'],
  ['close-over-cap', CLOSE, 'unreadableRows: measures.unreadableRows + over', 'unreadableRows: measures.unreadableRows'],
];

const sha = (text) => createHash('sha256').update(text).digest('hex');
const head = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const results = [];
for (const [id, file, from, to] of MUTANTS) {
  const full = path.join(root, file);
  const original = fs.readFileSync(full, 'utf8');
  const occurrences = original.split(from).length - 1;
  if (occurrences !== 1) throw new Error(`${id}: fragment occurs ${occurrences} times in ${file}`);
  if (dry) continue;
  try {
    fs.writeFileSync(full, original.replace(from, to));
    const run = spawnSync('npx', ['vitest', 'run', '--testTimeout', '120000', ...TESTS], { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const failed = (run.stdout.match(/Tests\s+(\d+) failed/u) ?? [])[1] ?? '0';
    const outcome = run.status === 0 ? 'SURVIVED' : 'killed';
    results.push({ id, file, old: from, new: to, outcome, failedTests: Number(failed), exit: run.status });
    console.log(`${id}: ${outcome} (${failed} failed)`);
  } finally {
    fs.writeFileSync(full, original);
  }
}
if (!dry) {
  const record = {
    format: 'syzygy-5dhm-25-step-measures-mutation/1',
    commit: head,
    subjects: Object.fromEntries([MEASURES, CLOSE].map((file) => [file, sha(fs.readFileSync(path.join(root, file), 'utf8'))])),
    tests: TESTS,
    mutants: results.length,
    killed: results.filter((r) => r.outcome === 'killed').length,
    results,
  };
  fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
}
console.log(dry ? `dry: ${MUTANTS.length} fragments each occur once` : 'done');
