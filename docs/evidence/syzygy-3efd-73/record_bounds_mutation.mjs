// Recorded mutation run over the new guards of REQ-polaris-generation-034 version 2.10 (syzygy-3efd.73, syzygy-3efd.74).
// Usage: node mutate.mjs <worktree> <out.json>
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files below, and restores the source in `finally`.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const [root, out] = process.argv.slice(2);
if (!root || !out) throw new Error('usage: node mutate.mjs <worktree> <out.json>');
const scratch = path.dirname(new URL(import.meta.url).pathname);

const TESTS = [
  'packages/polaris-dossier/src/check-record-read.test.ts',
  'packages/polaris-dossier/src/check.test.ts',
  'packages/polaris-dossier/src/inventory.test.ts',
  'packages/polaris-dossier/src/derived-record.test.ts',
  'packages/polaris-dossier/src/render.test.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-derived-region.test.ts',
  'apps/three-surface-poc/src/polaris-generation/dossier-computed-maps.test.ts',
];
const TIMEOUT_MS = 300_000;

const READ = 'packages/polaris-dossier/src/check-record-read.ts';
const INV = 'packages/polaris-dossier/src/inventory.ts';
const SUP = 'packages/polaris-dossier/src/polaris.ts';
const CHECK = 'packages/polaris-dossier/src/check.ts';
const DER = 'packages/polaris-dossier/src/derived-record.ts';
const SITE = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts';

const MUTANTS = [
  // The reader rule (syzygy-3efd.74).
  ['read-nonblock', READ, 'fs.constants.O_RDONLY | fs.constants.O_NONBLOCK', 'fs.constants.O_RDONLY'],
  ['read-regular-file', READ, 'if (!stats.isFile()) throw new NotARegularFileError();', 'if (false) throw new NotARegularFileError();'],
  ['read-size-first', READ, 'if (stats.size > maxBytes) throw new BoundedJsonError(\'byte-limit\');', 'if (false) throw new BoundedJsonError(\'byte-limit\');'],
  ['read-limit-plus-one', READ, 'const limit = maxBytes + 1;', 'const limit = maxBytes + 2;'],
  ['read-grown-refused', READ, 'if (total > maxBytes) throw new BoundedJsonError(\'byte-limit\');', 'if (total > maxBytes + 1) throw new BoundedJsonError(\'byte-limit\');'],
  ['read-check-bound', READ, 'readBoundedFile(file, CHECK_RECORD_LIMITS.maxBytes)', 'readBoundedFile(file, CHECK_RECORD_LIMITS.maxBytes * 2)'],
  ['inventory-old-reader', INV, 'try { const read = readCheckRecord(path.join(run, INVENTORY_CHECKS, `rev-${revision}.json`)); check = isRecord(read) ? read : undefined; } catch { check = undefined; }', 'check = readRecord(path.join(run, INVENTORY_CHECKS, `rev-${revision}.json`));'],
  ['supervisor-inventory-reader', SUP, 'inventory: latestRecord(path.join(run, INVENTORY_CHECKS), REVISION_FILE, readCheckRecord)', 'inventory: latestRecord(path.join(run, INVENTORY_CHECKS), REVISION_FILE, readReviewCheckUnbounded)'],
  // The bounded form (syzygy-3efd.73 (a)).
  ['check-injected-measure', CHECK, '(deps.measureRecord ?? measureCheckRecord)(fullText)', 'measureCheckRecord(fullText)'],
  ['check-bytes-at-bound', CHECK, 'measure.bytes <= CHECK_RECORD_LIMITS.maxBytes', 'measure.bytes < CHECK_RECORD_LIMITS.maxBytes'],
  ['check-bytes-arm', CHECK, 'measure.bytes <= CHECK_RECORD_LIMITS.maxBytes', 'true'],
  ['check-values-at-bound', CHECK, 'measure.values <= CHECK_RECORD_LIMITS.maxNodes', 'measure.values < CHECK_RECORD_LIMITS.maxNodes'],
  ['check-values-arm', CHECK, 'measure.values <= CHECK_RECORD_LIMITS.maxNodes', 'true'],
  ['check-depth-at-bound', CHECK, 'measure.depth <= CHECK_RECORD_LIMITS.maxDepth', 'measure.depth < CHECK_RECORD_LIMITS.maxDepth'],
  ['check-depth-arm', CHECK, 'measure.depth <= CHECK_RECORD_LIMITS.maxDepth', 'true'],
  ['check-writes-bounded', CHECK, 'full ? fullText : `${JSON.stringify(written, null, 2)}\\n`', 'fullText'],
  ['check-log-outcome', CHECK, 'outcome: full ? outcome : \'findings\', revision', 'outcome, revision'],
  ['check-log-findings', CHECK, 'findings: full ? findings.length : 1 }', 'findings: findings.length }'],
  ['check-no-mechanism-advice', CHECK, 'if (full) mechanismAdvice =', 'mechanismAdvice ='],
  ['check-no-report-fit', CHECK, 'fit === undefined || !full ? {}', 'fit === undefined ? {}'],
  ['check-findings-left-out', CHECK, 'const leftOut = full ? {} : { findingsLeftOut: findings };', 'const leftOut = {};'],
  ['check-difference-no-ledger', CHECK, 'full ? ledger : undefined', 'ledger'],
  ['measure-values', CHECK, '    values += 1;\n', '    values += 2;\n'],
  ['measure-array-depth', CHECK, 'for (const item of value) walk(item, level + 1);', 'for (const item of value) walk(item, level);'],
  ['measure-object-depth', CHECK, 'for (const item of Object.values(value)) walk(item, level + 1);', 'for (const item of Object.values(value)) walk(item, level);'],
  ['measure-utf8-bytes', CHECK, 'Buffer.byteLength(text, \'utf8\')', 'text.length'],
  ['bounded-drops-credential', CHECK, '\'screeningPolicy\', \'credential\', \'limits\',', '\'screeningPolicy\', \'limits\','],
  ['bounded-drops-counts', CHECK, '\'counts\', \'completeness\', \'label\',', '\'label\','],
  ['bounded-keeps-quotations', CHECK, '\'counts\', \'completeness\', \'label\',', '\'counts\', \'completeness\', \'label\', \'quotations\','],
  ['bounded-outcome', CHECK, 'key === \'outcome\' ? \'findings\' :', 'key === \'outcome\' ? value :'],
  ['bounded-findings', CHECK, 'key === \'findings\' ? [finding] : value', 'key === \'findings\' ? value : value'],
  ['bound-detail-excluded', CHECK, '${counts.excluded} excluded quotations', '${counts.quotations} excluded quotations'],
  ['bound-detail-cited', CHECK, '${counts.citedFiles} cited files', '${counts.quotations} cited files'],
  // Unusable told apart from missing (syzygy-3efd.73 (b)).
  ['derived-reader-bound', DER, 'readBoundedFile(derivedRecordFile(run, revision), RECORD_LIMITS.maxBytes)', 'readBoundedFile(derivedRecordFile(run, revision), RECORD_LIMITS.maxBytes * 512)'],
  ['no-entry-enotdir', DER, 'return code === \'ENOENT\' || code === \'ENOTDIR\';', 'return code === \'ENOENT\';'],
  ['no-entry-any-error', DER, 'return code === \'ENOENT\' || code === \'ENOTDIR\';', 'return code !== undefined;'],
  ['no-entry-follows-link', DER, 'fs.lstatSync(file);', 'fs.statSync(file);'],
  ['unusable-unread', DER, 'if (record === undefined) return { state: \'unusable\',', 'if (record === undefined) return { state: \'missing\','],
  ['unusable-foreign', DER, 'if (record.facts.some(foreign)) return { state: \'unusable\',', 'if (record.facts.some(foreign)) return { state: \'missing\','],
  ['no-entry-skipped', DER, 'if (holdsNoEntry(derivedRecordFile(run, revision))) return', 'if (false) return'],
  ['words-by-reason', SITE, 'unknownWords[derived.state]', 'unknownWords[derived.unknownReason === \'missing-evidence\' ? \'missing\' : \'unknown\']'],
  ['words-unusable-text', SITE, 'something this render cannot use or cannot examine;', 'something this render cannot use;'],
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
  let failedTests = [];
  let total = null;
  if (fs.existsSync(report)) {
    const json = JSON.parse(fs.readFileSync(report, 'utf8'));
    total = json.numTotalTests;
    for (const result of json.testResults) {
      const failed = result.assertionResults.filter((a) => a.status === 'failed').map((a) => `${path.relative(root, result.name)} > ${a.fullName}`);
      failedTests.push(...failed);
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
  method: `Each mutant replaces one fragment (asserted to occur exactly once) in its file, runs the ${TESTS.length} test files above under vitest with the JSON reporter, and restores every source in finally. A mutant is killed when the run exits non-zero (failedTests lists each failing test) or is stopped after ${TIMEOUT_MS / 1000} s (killedBy "timeout": a reader that blocks on a FIFO cannot be interrupted by vitest's own test timeout). The unmutated baseline runs first and must pass.`,
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
