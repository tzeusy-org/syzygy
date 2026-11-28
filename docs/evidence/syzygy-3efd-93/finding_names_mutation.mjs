// Recorded mutation run over finding details that name draft values (syzygy-3efd.93): the identity form at each builder fixed, and the
// screen every detail passes before check reports and records it.
// Usage: node finding_names_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files of its group, and restores the source in
// `finally`. `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs. Adapted from
// docs/evidence/syzygy-3efd-33/code_marks_mutation.mjs, without the browser.
// Run 1 (at 23f77f856) killed 10 of 12. Repairs: an unviewed relationship of a path-like identity (unviewed-relationship-unguarded), and a
// screen whose body rule matches only across a detail's words (detail-not-screened-whole).
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyAt = args.indexOf('--only');
const only = onlyAt === -1 ? null : new Set(args[onlyAt + 1].split(','));
const [root, out, scratch] = args.filter((arg, i) => !arg.startsWith('--') && (onlyAt === -1 || i !== onlyAt + 1));
if (!root || !out || !scratch) throw new Error('usage: node finding_names_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });

const PKG = 'packages/polaris-dossier/src';
const NAMES = `${PKG}/finding-names.ts`;
const MODEL = `${PKG}/system-model.ts`;
const DERIVE = `${PKG}/check-derive.ts`;
const CHECK = `${PKG}/check.ts`;
const SCENARIOS = `${PKG}/finding-names.test.ts`;
const TESTS = {
  [NAMES]: [SCENARIOS],
  [MODEL]: [SCENARIOS, `${PKG}/system-model.test.ts`],
  [DERIVE]: [SCENARIOS],
  [CHECK]: [SCENARIOS],
};
const TIMEOUT_MS = 600_000;

const MUTANTS = [
  ['unviewed-element-unguarded', MODEL, "shown.elements.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${handleOr(id, at)}:", "shown.elements.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${id}:"],
  ['unviewed-relationship-unguarded', MODEL, "shown.relationships.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${handleOr(id, at)}:", "shown.relationships.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${id}:"],
  ['unviewed-named-by-path-always', MODEL, "shown.relationships.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${handleOr(id, at)}:", "shown.relationships.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${at}:"],
  ['any-string-is-a-handle', NAMES, "typeof value === 'string' && checkShape({ root: handle, defs: {} }, value).length === 0", "typeof value === 'string'"],
  ['no-string-is-a-handle', NAMES, "typeof value === 'string' && checkShape({ root: handle, defs: {} }, value).length === 0", 'false'],
  ['words-not-screened', NAMES, "[detail, ...detail.split(/[\\s\"`'(),;]+/u).filter((word) => word.length > 0)]", '[detail]'],
  ['detail-not-screened-whole', NAMES, "[detail, ...detail.split(", "[...detail.split("],
  ['undecided-admitted', NAMES, ".every((value) => admit(value) === 'admitted')", ".every((value) => admit(value) !== 'withheld')"],
  ['backstop-dropped', CHECK, '  findings.splice(0, findings.length, ...screenFindingDetails(findings, admitOf(screen)));\n', ''],
  ['duplicate-id-unguarded', DERIVE, 'detail: `the identity ${identityWords(id)} is already used at ${first}`', 'detail: `the identity ${JSON.stringify(id)} is already used at ${first}`'],
  ['dive-section-unguarded', DERIVE, "at: `$.deepDives[${i}].sectionId`, detail: `no section has the identity ${identityWords(sectionId)}`", "at: `$.deepDives[${i}].sectionId`, detail: `no section has the identity ${JSON.stringify(sectionId)}`"],
  ['asset-unguarded', DERIVE, "${isHandle(assetId) ? JSON.stringify(assetId) : 'the identity named here'} is not this asset", '${JSON.stringify(assetId)} is not this asset'],
].filter(([id]) => only === null || only.has(id));

// A mutant no test can kill, with the reason; recorded, never run and never counted as killed.
const EQUIVALENT = [];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = [...new Set(MUTANTS.map(([, file]) => file))].sort();
// The equivalent mutants' files too, so `--only` can still check their fragments.
const originals = new Map([...new Set([...files, ...EQUIVALENT.map((m) => m.file)])].map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const wrong = [];
for (const [id, file, old] of [...MUTANTS, ...EQUIVALENT.map((m) => [m.id, m.file, m.old])]) {
  const count = originals.get(file).split(old).length - 1;
  if (count !== 1) wrong.push(`${id}: the fragment occurs ${count} times in ${file}`);
}
if (wrong.length > 0) throw new Error(wrong.join('\n'));
if (new Set(MUTANTS.map(([id]) => id)).size !== MUTANTS.length) throw new Error('a mutant id repeats');
if (dry) { process.stdout.write(`${MUTANTS.length} mutants, each fragment once\n`); process.exit(0); }
const restoreAll = () => { for (const [file, text] of originals) fs.writeFileSync(path.join(root, file), text); };
process.on('SIGINT', () => { restoreAll(); process.exit(130); });
process.on('SIGTERM', () => { restoreAll(); process.exit(143); });

async function runTests(tag, tests) {
  const report = path.join(scratch, `mutation-${tag}.json`);
  fs.rmSync(report, { force: true });
  const child = spawn('npx', ['vitest', 'run', ...tests, '--reporter=json', `--outputFile=${report}`], { cwd: root, detached: true, stdio: 'ignore' });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } }, TIMEOUT_MS);
  const code = await new Promise((resolve) => child.on('exit', (c) => resolve(c)));
  clearTimeout(timer);
  try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
  const failedTests = [];
  const perFile = {};
  let total = null;
  if (fs.existsSync(report)) {
    const json = JSON.parse(fs.readFileSync(report, 'utf8'));
    total = json.numTotalTests;
    for (const result of json.testResults) {
      const failed = result.assertionResults.filter((a) => a.status === 'failed').map((a) => `${path.relative(root, result.name)} > ${a.fullName}`);
      perFile[path.relative(root, result.name)] = { passed: result.assertionResults.filter((a) => a.status === 'passed').length, skipped: result.assertionResults.filter((a) => a.status === 'skipped' || a.status === 'pending').length };
      for (const name of failed) failedTests.push(name);
      if (failed.length === 0 && result.status === 'failed') failedTests.push(`${path.relative(root, result.name)} (file failed: ${String(result.message).slice(0, 200)})`);
    }
  }
  return { code, timedOut, failedTests, total, perFile };
}

const head = await new Promise((resolve) => { const c = spawn('git', ['-C', root, 'rev-parse', 'HEAD']); let s = ''; c.stdout.on('data', (d) => { s += d; }); c.on('exit', () => resolve(s.trim())); });
const record = {
  format: 'mutation-run/1',
  ranAt: new Date().toISOString(),
  commit: head,
  subject: Object.fromEntries(files.map((file) => [file, sha(originals.get(file))])),
  command: 'npx vitest run <the test files of the mutant\'s source file> --reporter=json --outputFile=<scratch>/mutation-<id>.json',
  method: `Each mutant replaces one fragment (asserted to occur exactly once) in its file, runs the test files listed for that file under vitest with the JSON reporter, and restores every source in finally. A mutant is killed when the run exits non-zero and at least one test fails (failedTests lists each) or is stopped after ${TIMEOUT_MS / 1000} s; a run that exits non-zero with no failed test and no timeout is recorded as not run, never as killed. The unmutated baseline of each group runs first and must pass.`,
  testFiles: TESTS,
  baselines: [],
  mutants: [],
  equivalent: EQUIVALENT,
  summary: null,
};
try {
  for (const file of files) {
    const baseline = await runTests(`baseline-${path.basename(file)}`, TESTS[file]);
    record.baselines.push({ file, exitCode: baseline.code, tests: baseline.total, perFile: baseline.perFile, failedTests: baseline.failedTests });
    if (baseline.code !== 0) throw new Error(`the baseline for ${file} fails: ${baseline.failedTests.join('; ')}`);
  }
  for (const [id, file, old, replacement] of MUTANTS) {
    const started = Date.now();
    try {
      fs.writeFileSync(path.join(root, file), originals.get(file).replace(old, () => replacement));
      const result = await runTests(id, TESTS[file]);
      const killed = result.timedOut || (result.code !== 0 && result.failedTests.length > 0);
      const notRun = !result.timedOut && result.code !== 0 && result.failedTests.length === 0;
      record.mutants.push({ id, file, old, new: replacement, killed, killedBy: result.timedOut ? 'timeout' : killed ? 'tests' : null, ...(notRun ? { notRun: true } : {}), tests: result.total, failedTests: result.failedTests, seconds: Math.round((Date.now() - started) / 1000) });
      process.stdout.write(`${id}: ${killed ? 'killed' : notRun ? 'NOT RUN' : 'SURVIVED'} (${result.failedTests.length} failed${result.timedOut ? ', timeout' : ''})\n`);
    } finally {
      restoreAll();
    }
  }
} finally {
  restoreAll();
  for (const file of files) if (sha(fs.readFileSync(path.join(root, file))) !== record.subject[file]) throw new Error(`${file} was not restored`);
  const killed = record.mutants.filter((m) => m.killed).length;
  record.summary = { mutants: record.mutants.length, killed, survived: record.mutants.length - killed, byTimeout: record.mutants.filter((m) => m.killedBy === 'timeout').length, equivalentNotRun: EQUIVALENT.length };
  fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
}
