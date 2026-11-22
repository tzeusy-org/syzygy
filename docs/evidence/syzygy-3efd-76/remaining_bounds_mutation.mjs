// Recorded mutation run over the reader rule of REQ-polaris-generation-034 (syzygy-3efd.76): the draft check is given, the
// frozen draft revisions, the brief record and the run file `run-advice.json`, each under its bound.
// Usage: node remaining_bounds_mutation.mjs <worktree> <out.json> <scratch dir>
// Copied from docs/evidence/syzygy-3efd-73/record_bounds_mutation.mjs; only the test files, the mutants and the report directory differ.
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files below, and restores the source in `finally`.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const [root, out, scratch] = process.argv.slice(2);
if (!root || !out || !scratch) throw new Error('usage: node remaining_bounds_mutation.mjs <worktree> <out.json> <scratch dir>');

const TESTS = [
  'packages/polaris-dossier/src/bounded-readers.test.ts',
  'packages/polaris-dossier/src/check.test.ts',
  'packages/polaris-dossier/src/inventory.test.ts',
  'packages/polaris-dossier/src/run-advice.test.ts',
  'packages/polaris-dossier/src/rerender-measure.test.ts',
  'packages/polaris-dossier/src/render.test.ts',
  'packages/polaris-dossier/src/close.test.ts',
];
const TIMEOUT_MS = 300_000;

const SRC = 'packages/polaris-dossier/src/';
const CHECK = `${SRC}check.ts`;
const PACKET = `${SRC}review-packet.ts`;
const INV = `${SRC}inventory.ts`;
const MEASURE = `${SRC}rerender-measure.ts`;
const ADVICE = `${SRC}run-advice.ts`;
const REVERIFY = `${SRC}reverify.ts`;
const PROBE = `${SRC}credential-probe.ts`;
const RUNDIR = `${SRC}run-dir.ts`;
const DESIGN = `${SRC}design-review.ts`;
const RENDER = `${SRC}render.ts`;
const CLOSE = `${SRC}close.ts`;
const READ = `${SRC}check-record-read.ts`;

const MUTANTS = [
  // check: the draft (or inventory) it is given, under 4,194,304 bytes.
  ['subject-bound', CHECK, 'readBoundedFile(file, DRAFT_MAX_BYTES)', 'readBoundedFile(file, DRAFT_MAX_BYTES + 1)'],
  ['subject-old-reader', CHECK, 'return new Uint8Array(readBoundedFile(file, DRAFT_MAX_BYTES));', 'return new Uint8Array(fs.readFileSync(file));'],
  ['subject-not-regular-words', CHECK, 'if (cause instanceof NotARegularFileError) return `${file} is not a regular file`;', 'if (false) return `${file} is not a regular file`;'],
  ['subject-larger-words', CHECK, "if (cause instanceof BoundedJsonError && cause.code === 'byte-limit') return `${file} is larger", "if (false) return `${file} is larger"],
  // check: the brief record's issue instant, under 262,144 bytes.
  ['issued-bound', CHECK, 'RUN_LAYOUT.briefRecord), BRIEF_JSON_LIMITS.maxBytes)', 'RUN_LAYOUT.briefRecord), BRIEF_JSON_LIMITS.maxBytes + 1)'],
  ['issued-old-reader', CHECK, "readBoundedFile(path.join(run, RUN_LAYOUT.briefRecord), BRIEF_JSON_LIMITS.maxBytes).toString('utf8')", "fs.readFileSync(path.join(run, RUN_LAYOUT.briefRecord), 'utf8')"],
  // latestPassedDraft (review, render, close): the frozen revision, under 4,194,304 bytes.
  ['frozen-bound', PACKET, 'readBoundedFile(path.join(run, frozen), DRAFT_MAX_BYTES)', 'readBoundedFile(path.join(run, frozen), DRAFT_MAX_BYTES + 1)'],
  ['frozen-old-reader', PACKET, 'readBoundedFile(path.join(run, frozen), DRAFT_MAX_BYTES)', 'fs.readFileSync(path.join(run, frozen))'],
  ['frozen-not-regular-words', PACKET, "cause instanceof NotARegularFileError ? 'not a regular file'", "false ? 'not a regular file'"],
  ['frozen-larger-words', PACKET, "cause instanceof BoundedJsonError && cause.code === 'byte-limit' ? `larger than", "false ? `larger than"],
  // authoringSessionIds: the frozen revisions' session identifiers, under 4,194,304 bytes.
  ['authoring-bound', INV, 'RUN_LAYOUT.drafts, name), DRAFT_JSON_LIMITS.maxBytes)', 'RUN_LAYOUT.drafts, name), DRAFT_JSON_LIMITS.maxBytes + 1)'],
  ['authoring-old-reader', INV, "readBoundedFile(path.join(run, RUN_LAYOUT.drafts, name), DRAFT_JSON_LIMITS.maxBytes).toString('utf8')", "fs.readFileSync(path.join(run, RUN_LAYOUT.drafts, name), 'utf8')"],
  // The stored-draft re-render measurement, under 4,194,304 bytes, keeping its Dirent filter.
  ['measure-bound', MEASURE, 'readBoundedFile(path.join(dir, `rev-${revision}.json`), DRAFT_MAX_BYTES)', 'readBoundedFile(path.join(dir, `rev-${revision}.json`), DRAFT_MAX_BYTES + 1)'],
  ['measure-old-reader', MEASURE, 'readBoundedFile(path.join(dir, `rev-${revision}.json`), DRAFT_MAX_BYTES)', 'fs.readFileSync(path.join(dir, `rev-${revision}.json`))'],
  ['measure-not-regular-error', MEASURE, "cause instanceof NotARegularFileError ? 'not-a-regular-file' : code(cause)", 'code(cause)'],
  ['measure-dirent-filter', MEASURE, 'if (match === null || !name.isFile())', 'if (match === null)'],
  // readRunAdvice, under 16,777,216 bytes.
  ['advice-bound', ADVICE, 'readBoundedFile(file, RUN_ADVICE_LIMITS.maxBytes)', 'readBoundedFile(file, RUN_ADVICE_LIMITS.maxBytes + 1)'],
  ['advice-old-reader', ADVICE, "readBoundedFile(file, RUN_ADVICE_LIMITS.maxBytes).toString('utf8')", "fs.readFileSync(file, 'utf8')"],
  // The reverification's brief record read, under 262,144 bytes, with its words.
  ['reverify-bound', REVERIFY, 'RUN_LAYOUT.briefRecord), BRIEF_RECORD_LIMITS.maxBytes)', 'RUN_LAYOUT.briefRecord), BRIEF_RECORD_LIMITS.maxBytes + 1)'],
  ['reverify-old-reader', REVERIFY, "readBoundedFile(path.join(run, RUN_LAYOUT.briefRecord), BRIEF_RECORD_LIMITS.maxBytes).toString('utf8')", "fs.readFileSync(path.join(run, RUN_LAYOUT.briefRecord), 'utf8')"],
  ['reverify-not-regular-words', REVERIFY, "if (cause instanceof NotARegularFileError) return { state: 'invalid', why: 'it cannot be read (not a regular file)' };", ''],
  ['reverify-bounded-words', REVERIFY, "if (cause instanceof BoundedJsonError && cause.code === 'byte-limit') return { state: 'invalid', why: 'it is not bounded JSON' };", ''],
  // storedBriefArm (the execution rule's reader), under 262,144 bytes.
  ['arm-bound', PROBE, 'RUN_LAYOUT.briefRecord), 262_144)', 'RUN_LAYOUT.briefRecord), 262_145)'],
  ['arm-old-reader', PROBE, "readBoundedFile(path.join(run, RUN_LAYOUT.briefRecord), 262_144).toString('utf8')", "fs.readFileSync(path.join(run, RUN_LAYOUT.briefRecord), 'utf8')"],
  // readBriefRecord (the render's run disclosure, close's execution rule), under 262,144 bytes.
  ['brief-record-bound', RUNDIR, 'export const BRIEF_RECORD_MAX_BYTES = 262_144;', 'export const BRIEF_RECORD_MAX_BYTES = 262_145;'],
  ['brief-record-old-reader', RUNDIR, "readBoundedFile(path.join(run, RUN_LAYOUT.briefRecord), BRIEF_RECORD_MAX_BYTES).toString('utf8')", "fs.readFileSync(path.join(run, RUN_LAYOUT.briefRecord), 'utf8')"],
  ['render-unbounded-brief', RENDER, 'const brief = readBriefRecord(run);', 'const brief = readRecord(path.join(run, RUN_LAYOUT.briefRecord));'],
  ['close-unbounded-brief', CLOSE, 'const brief = readBriefRecord(run);', 'const brief = readRecord(path.join(run, RUN_LAYOUT.briefRecord));'],
  // close's digest of every stored file: each read by the reader rule, under its stated bound or its own size.
  ['stored-old-reader', CLOSE, 'const bytes = bound === undefined ? readFileAsSized(full) : readBoundedFile(full, bound);', 'const bytes = fs.readFileSync(full);'],
  ['stored-as-sized-unbounded', CLOSE, 'readFileAsSized(full)', 'readBoundedFile(full, Number.MAX_SAFE_INTEGER)'],
  ['stored-brief-bound', CLOSE, "if (rel === 'brief.json') return 262_144;", "if (rel === 'brief.json') return 262_145;"],
  ['stored-draft-bound', CLOSE, 'if (/^drafts', 'if (false && /^drafts'],
  ['stored-advice-bound', CLOSE, "if (rel === 'run-advice.json') return 16_777_216;", "if (rel === 'run-advice.json') return 16_777_217;"],
  ['stored-check-record-bound', CLOSE, 'if (/^(?:inventory', 'if (false && /^(?:inventory'],
  ['stored-inventory-check-record-bound', CLOSE, '/^(?:inventory\\/)?checks', '/^checks'],
  ['stored-derived-bound', CLOSE, 'if (/^derived', 'if (false && /^derived'],
  ['as-sized-bound', READ, 'return readRegularFile(file, (size) => size);', 'return readRegularFile(file, (size) => size + 1);'],
  // briefStandardsOf (the design packet), under 262,144 bytes, with its words.
  ['standards-bound', DESIGN, 'readBoundedFile(path.join(run, name), BRIEF_RECORD_LIMITS.maxBytes)', 'readBoundedFile(path.join(run, name), BRIEF_RECORD_LIMITS.maxBytes + 1)'],
  ['standards-old-reader', DESIGN, "readBoundedFile(path.join(run, name), BRIEF_RECORD_LIMITS.maxBytes).toString('utf8')", "fs.readFileSync(path.join(run, name), 'utf8')"],
  ['standards-not-regular-words', DESIGN, 'if (cause instanceof NotARegularFileError) return { ok: false, reason: `${name} cannot be read (not a regular file)` };', ''],
  ['standards-bounded-words', DESIGN, "if (cause instanceof BoundedJsonError && cause.code === 'byte-limit') return { ok: false, reason: `${name} is not JSON within its bounds` };", ''],
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
