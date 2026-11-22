// Recorded mutation run over the new predicates of REQ-polaris-generation-034 version 2.11, items (7) and (8) (syzygy-3efd.75).
// Usage: node spec_corrections_mutation.mjs <worktree> <out.json> <scratch-dir>
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files below, and restores the source in `finally`.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const [root, out, scratch] = process.argv.slice(2);
if (!root || !out || !scratch) throw new Error('usage: node spec_corrections_mutation.mjs <worktree> <out.json> <scratch-dir>');
fs.mkdirSync(scratch, { recursive: true });

const TESTS = [
  'apps/three-surface-poc/src/polaris-generation/dossier-computed-maps.test.ts',
  'packages/polaris-dossier/src/reading-ledger.test.ts',
  'packages/polaris-dossier/src/check.test.ts',
];
const TIMEOUT_MS = 300_000;

const SITE = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts';
const LEDGER = 'packages/polaris-dossier/src/reading-ledger.ts';
const CHECK = 'packages/polaris-dossier/src/check.ts';

const MUTANTS = [
  // Item (7): the count of Unknown files counted and not listed on a manifest map.
  ['count-all-unlisted', SITE, 'sum + r.unknown - r.files.filter(file => file.epistemic === \'unknown\').length', 'sum + r.filesNotListed'],
  ['count-ignores-listed', SITE, 'sum + r.unknown - r.files.filter(file => file.epistemic === \'unknown\').length', 'sum + r.unknown'],
  ['count-every-listed-file', SITE, 'sum + r.unknown - r.files.filter(file => file.epistemic === \'unknown\').length', 'sum + r.unknown - r.files.length'],
  ['count-item-never', SITE, 'const remainder = unknownNotListed > 0', 'const remainder = false'],
  ['count-item-past-one', SITE, 'const remainder = unknownNotListed > 0', 'const remainder = unknownNotListed > 1'],
  ['count-singular', SITE, 'unknownNotListed === 1 ? \'1 file whose', 'false ? \'1 file whose'],
  ['count-plural-words', SITE, 'files whose facts are Unknown are counted and not listed.', 'files whose facts are Unknown are not listed.'],
  ['count-keeps-every-sentence', SITE, 'listed !== \'\' || remainder !== \'\'', 'listed !== \'\''],
  ['count-before-entries', SITE, '`${listed}${remainder}`', '`${remainder}${listed}`'],
  // Item (8): the reading difference of a bounded check record.
  ['bounded-arm-removed', LEDGER, '  if (ledger === \'bounded\') return { state: \'unknown\', why: BOUNDED_FORM_HAS_NO_LEDGER, unreadableRuns: 0, unreadableCheckRecords: 0 };\n', ''],
  ['bounded-not-parse-words', LEDGER, 'why: BOUNDED_FORM_HAS_NO_LEDGER,', 'why: DRAFT_DOES_NOT_PARSE,'],
  ['bounded-runs-count', LEDGER, 'why: BOUNDED_FORM_HAS_NO_LEDGER, unreadableRuns: 0', 'why: BOUNDED_FORM_HAS_NO_LEDGER, unreadableRuns: 1'],
  ['bounded-records-count', LEDGER, 'why: BOUNDED_FORM_HAS_NO_LEDGER, unreadableRuns: 0, unreadableCheckRecords: 0', 'why: BOUNDED_FORM_HAS_NO_LEDGER, unreadableRuns: 0, unreadableCheckRecords: 1'],
  ['bounded-words-text', LEDGER, 'which keeps no reading ledger"', 'which has no reading ledger"'],
  ['check-passes-undefined', CHECK, 'full ? ledger : \'bounded\'', 'full ? ledger : undefined'],
  ['check-passes-ledger', CHECK, 'full ? ledger : \'bounded\'', 'ledger'],
];

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = [...new Set(MUTANTS.map(([, file]) => file))].sort();
const originals = new Map(files.map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
for (const [id, file, old] of MUTANTS) {
  const count = originals.get(file).split(old).length - 1;
  if (count !== 1) throw new Error(`${id}: the fragment occurs ${count} times in ${file}`);
}
const restoreAll = () => { for (const [file, text] of originals) fs.writeFileSync(path.join(root, file), text); };
process.on('SIGINT', () => { restoreAll(); process.exit(130); });

const command = ['npx', 'vitest', 'run', ...TESTS, '--reporter=json'];
async function runTests(tag) {
  const report = path.join(scratch, `mutation-${tag}.json`);
  fs.rmSync(report, { force: true });
  const child = spawn(command[0], [...command.slice(1), `--outputFile=${report}`], { cwd: root, detached: true, stdio: 'ignore' });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } }, TIMEOUT_MS);
  const code = await new Promise((resolve) => child.on('exit', (c) => resolve(c)));
  clearTimeout(timer);
  try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
  const failedTests = [];
  let total = null;
  if (fs.existsSync(report)) {
    const json = JSON.parse(fs.readFileSync(report, 'utf8'));
    total = json.numTotalTests;
    for (const result of json.testResults) {
      const failed = result.assertionResults.filter((a) => a.status === 'failed').map((a) => `${path.relative(root, result.name)} > ${a.fullName}`);
      for (const name of failed) failedTests.push(name);
      if (failed.length === 0 && result.status === 'failed') failedTests.push(`${path.relative(root, result.name)} (file failed: ${String(result.message).slice(0, 200)})`);
    }
  }
  return { code, timedOut, failedTests, total };
}

const head = await new Promise((resolve) => { const c = spawn('git', ['-C', root, 'rev-parse', 'HEAD']); let s = ''; c.stdout.on('data', (d) => { s += d; }); c.on('exit', () => resolve(s.trim())); });
const record = {
  format: 'mutation-run/1',
  ranAt: new Date().toISOString(),
  commit: head,
  subject: Object.fromEntries(files.map((file) => [file, sha(originals.get(file))])),
  command: `${command.join(' ')} --outputFile=<scratch>/mutation-<id>.json`,
  method: `Each mutant replaces one fragment (asserted to occur exactly once) in its file, runs the ${TESTS.length} test files above under vitest with the JSON reporter, and restores every source in finally. A mutant is killed when the run exits non-zero (failedTests lists each failing test) or is stopped after ${TIMEOUT_MS / 1000} s. The unmutated baseline runs first and must pass.`,
  testFiles: TESTS,
  baseline: null,
  mutants: [],
  summary: null,
};
try {
  const baseline = await runTests('baseline');
  record.baseline = { exitCode: baseline.code, tests: baseline.total, failedTests: baseline.failedTests };
  if (baseline.code !== 0) throw new Error(`the baseline fails: ${baseline.failedTests.join('; ')}`);
  for (const [id, file, old, replacement] of MUTANTS) {
    const started = Date.now();
    try {
      fs.writeFileSync(path.join(root, file), originals.get(file).replace(old, () => replacement));
      const result = await runTests(id);
      const killed = result.timedOut || result.code !== 0;
      record.mutants.push({ id, file, old, new: replacement, killed, killedBy: result.timedOut ? 'timeout' : killed ? 'tests' : null, failedTests: result.failedTests, seconds: Math.round((Date.now() - started) / 1000) });
      process.stdout.write(`${id}: ${killed ? 'killed' : 'SURVIVED'} (${result.failedTests.length} failed${result.timedOut ? ', timeout' : ''})\n`);
    } finally {
      restoreAll();
    }
  }
} finally {
  restoreAll();
  for (const file of files) if (sha(fs.readFileSync(path.join(root, file))) !== record.subject[file]) throw new Error(`${file} was not restored`);
  const killed = record.mutants.filter((m) => m.killed).length;
  record.summary = { mutants: record.mutants.length, killed, survived: record.mutants.length - killed };
  fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
}
