// Recorded mutation run over syzygy-3efd.83: the clone HEAD resolver (init), the clone snapshot reader (launch) and the verify --text read,
// each through the version 2.10 reader rule (readBoundedFile) under its code-stated bound, the clone readers without following a link.
// Usage: node clone_ref_bounds_mutation.mjs <worktree> <out.json> <scratch dir>
// Copied from docs/evidence/syzygy-3efd-80/run_tree_bounds_mutation.mjs; only the test files, the mutants and this header differ.
// Five mutants added after review R83 (docs/reviews/syzygy-3efd-83/R83-REVIEW-RAW.md, notes 1 to 3).
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files below, and restores the source in `finally`.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const [root, out, scratch] = process.argv.slice(2);
if (!root || !out || !scratch) throw new Error('usage: node clone_ref_bounds_mutation.mjs <worktree> <out.json> <scratch dir>');

const TESTS = [
  'packages/polaris-dossier/src/clone-ref-read-bounds.test.ts',
  'packages/polaris-dossier/src/launch-clone.test.ts',
  'packages/polaris-dossier/src/check-record-read.test.ts',
];
const TIMEOUT_MS = 120_000;

const SRC = 'packages/polaris-dossier/src/';
const READ = `${SRC}check-record-read.ts`;
const HEAD = `${SRC}clone-head.ts`;
const LAUNCH = `${SRC}launch-clone.ts`;
const VERIFY = `${SRC}verify-text-run.ts`;

const NEW_CLONE = 'readBoundedFile(file, limit, { followLink: false }).toString(\'utf8\')';

const MUTANTS = [
  // The shared reader: no-follow where asked, and its refusal named as no regular file.
  ['reader-no-nofollow', READ, '!followLink || privateFile ? flags | fs.constants.O_NOFOLLOW : flags', 'privateFile ? flags | fs.constants.O_NOFOLLOW : flags'],
  ['reader-eloop-not-mapped', READ, "if (!followLink && (cause as NodeJS.ErrnoException).code === 'ELOOP') throw new NotARegularFileError();", ''],
  ['reader-default-no-follow', READ, 'options.followLink ?? true', 'options.followLink ?? false'],
  ['reader-drops-nonblock', READ, 'const flags = fs.constants.O_RDONLY | fs.constants.O_NONBLOCK | fs.constants.O_NOCTTY;', 'const flags = fs.constants.O_RDONLY | fs.constants.O_NOCTTY;'],
  // init: the clone HEAD resolver.
  ['head-follows-link', HEAD, '{ followLink: false }', '{ followLink: true }'],
  ['head-bound-wider', HEAD, 'readBoundedFile(file, limit,', 'readBoundedFile(file, limit + 1,'],
  ['head-ref-bound-wider', HEAD, 'const MAX_REF_BYTES = 4096;', 'const MAX_REF_BYTES = 4097;'],
  ['head-packed-bound-wider', HEAD, 'const MAX_PACKED_REFS_BYTES = 16 * 1024 * 1024;', 'const MAX_PACKED_REFS_BYTES = 16 * 1024 * 1024 + 1;'],
  ['head-not-regular-words', HEAD, 'if (cause instanceof NotARegularFileError) return { reason: `${file} is not a regular file` };', ''],
  ['head-past-bound-words', HEAD, 'if (cause instanceof PastBoundError) return { reason: `${file} is larger than ${limit} bytes` };', ''],
  ['head-stat-then-read', HEAD, `return { text: ${NEW_CLONE} };`,
    "{ const stats = fs.lstatSync(file); if (!stats.isFile()) return { reason: `${file} is not a regular file` }; if (stats.size > limit) return { reason: `${file} is larger than ${limit} bytes` }; return { text: fs.readFileSync(file, 'utf8') }; }"],
  // launch: the clone snapshot reader.
  ['launch-follows-link', LAUNCH, '{ followLink: false, refuseGrowth: true }', '{ followLink: true, refuseGrowth: true }'],
  ['launch-bound-wider', LAUNCH, 'readBoundedFile(file, limit,', 'readBoundedFile(file, limit + 1,'],
  ['launch-ref-bound-wider', LAUNCH, 'const MAX_REF_BYTES = 4096;', 'const MAX_REF_BYTES = 4097;'],
  ['launch-file-bound-wider', LAUNCH, 'const MAX_FILE_BYTES = 16 * 1024 * 1024;', 'const MAX_FILE_BYTES = 16 * 1024 * 1024 + 1;'],
  ['launch-not-regular-words', LAUNCH, 'if (cause instanceof NotARegularFileError) return { reason: `${file} is not a regular file; it is refused, never followed` };', ''],
  ['launch-past-bound-words', LAUNCH, 'if (cause instanceof PastBoundError) return { reason: `${file} is larger than ${limit} bytes` };', ''],
  ['launch-absent-opened', LAUNCH, 'if (fs.lstatSync(file, { throwIfNoEntry: false }) === undefined) return null;', ''],
  ['launch-stat-then-read', LAUNCH, "return { text: readBoundedFile(file, limit, { followLink: false, refuseGrowth: true }).toString('utf8') };",
    "{ const stats = fs.lstatSync(file); if (!stats.isFile()) return { reason: `${file} is not a regular file; it is refused, never followed` }; if (stats.size > limit) return { reason: `${file} is larger than ${limit} bytes` }; return { text: fs.readFileSync(file, 'utf8') }; }"],
  // R83 review notes 1 to 3: growth within the limit refused by the launch reader alone, ELOOP as the open's own error where links are
  // followed, and a file removed after the existence look read as absent.
  ['reader-growth-accepted', READ, 'if (refuseGrowth && total > stats.size) throw new GrewWhileReadError();', ''],
  ['launch-growth-accepted', LAUNCH, '{ followLink: false, refuseGrowth: true }', '{ followLink: false, refuseGrowth: false }'],
  ['launch-grew-words', LAUNCH, 'if (cause instanceof GrewWhileReadError) return { reason: `${file} grew while being read` };', ''],
  ['reader-eloop-unguarded', READ, 'if (!followLink && (cause as NodeJS.ErrnoException)', 'if ((cause as NodeJS.ErrnoException)'],
  ['launch-removed-after-look-refused', LAUNCH, "return code(cause) === 'ENOENT' ? null : {", 'return {'],
  // verify: the --text file.
  ['verify-bound-wider', VERIFY, 'export const VERIFY_TEXT_MAX_BYTES = 4 * 1024 * 1024;', 'export const VERIFY_TEXT_MAX_BYTES = 4 * 1024 * 1024 + 1;'],
  ['verify-no-follow', VERIFY, 'readBoundedFile(textFile, VERIFY_TEXT_MAX_BYTES)', 'readBoundedFile(textFile, VERIFY_TEXT_MAX_BYTES, { followLink: false })'],
  ['verify-not-regular-words', VERIFY, 'if (cause instanceof NotARegularFileError) return { reason: `${textFile} is not a regular file` };', ''],
  ['verify-past-bound-words', VERIFY, 'if (cause instanceof PastBoundError) return { reason: `${textFile} is larger than the ${VERIFY_TEXT_MAX_BYTES}-byte text bound` };', ''],
  ['verify-stat-then-read', VERIFY, 'return { bytes: new Uint8Array(readBoundedFile(textFile, VERIFY_TEXT_MAX_BYTES)) };',
    "{ const stats = fs.statSync(textFile); if (!stats.isFile()) return { reason: `${textFile} is not a regular file` }; if (stats.size > VERIFY_TEXT_MAX_BYTES) return { reason: `${textFile} is larger than the ${VERIFY_TEXT_MAX_BYTES}-byte text bound` }; return { bytes: new Uint8Array(fs.readFileSync(textFile)) }; }"],
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
