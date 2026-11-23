// Recorded mutation run over the run-tree reader rule of REQ-polaris-generation-033, -035 and -048 version 2.18 (syzygy-3efd.80): every
// run-tree file those requirements state, read by the version 2.10 reader rule under its stated bound, with the stated words.
// Usage: node run_tree_bounds_mutation.mjs <worktree> <out.json> <scratch dir>
// Copied from docs/evidence/syzygy-3efd-76/remaining_bounds_mutation.mjs; only the test files, the mutants, the timeout and this header differ.
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files below, and restores the source in `finally`.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const [root, out, scratch] = process.argv.slice(2);
if (!root || !out || !scratch) throw new Error('usage: node run_tree_bounds_mutation.mjs <worktree> <out.json> <scratch dir>');

const TESTS = [
  'packages/polaris-dossier/src/run-tree-readers.test.ts',
  'packages/polaris-dossier/src/waiting-sessions.test.ts',
  'packages/polaris-dossier/src/review.test.ts',
  'packages/polaris-dossier/src/inventory.test.ts',
  'packages/polaris-dossier/src/reading-ledger.test.ts',
  'packages/polaris-dossier/src/status.test.ts',
  'packages/polaris-dossier/src/close.test.ts',
];
const TIMEOUT_MS = 120_000;

const SRC = 'packages/polaris-dossier/src/';
const BOUNDS = `${SRC}run-tree-read.ts`;
const CLOSE = `${SRC}close.ts`;
const REVERIFY = `${SRC}reverify.ts`;
const STATUS = `${SRC}status.ts`;
const CHECK = `${SRC}check.ts`;
const RUNDIR = `${SRC}run-dir.ts`;
const RENDER = `${SRC}render.ts`;
const STATEMENT = `${SRC}session-statement.ts`;
const LEDGER = `${SRC}reading-ledger.ts`;
const POLARIS = `${SRC}polaris.ts`;
const PROBE = `${SRC}credential-probe.ts`;
const CHOICE = `${SRC}execution-choice.ts`;
const REVIEW = `${SRC}review.ts`;
const INV = `${SRC}inventory.ts`;
const PACKET = `${SRC}review-packet.ts`;
const COVERAGE = `${SRC}inventory-coverage.ts`;
const DESIGN = `${SRC}design-review.ts`;
const WAITING = `${SRC}waiting-sessions.ts`;
const READ = `${SRC}check-record-read.ts`;

const OLD_RUN_JSON = (dir) => `fs.readFileSync(path.join(${dir}, RUN_LAYOUT.config), 'utf8')`;
const NEW_RUN_JSON = (dir) => `readBoundedText(path.join(${dir}, RUN_LAYOUT.config), RUN_TREE_BOUNDS.runRecord)`;

const MUTANTS = [
  // The stated bounds, each one byte wider.
  ['bound-run-record', BOUNDS, 'runRecord: 65_536,', 'runRecord: 65_537,'],
  ['bound-log', BOUNDS, 'log: 16_777_216,', 'log: 16_777_217,'],
  ['bound-execution-choice', BOUNDS, 'executionChoice: 8_192,', 'executionChoice: 8_193,'],
  ['bound-close-record', BOUNDS, 'closeRecord: 16_777_216,', 'closeRecord: 16_777_217,'],
  ['bound-verdict', BOUNDS, 'verdict: 4_194_304,', 'verdict: 4_194_305,'],
  ['bound-inventory', BOUNDS, 'inventory: 4_194_304,', 'inventory: 4_194_305,'],
  ['bound-record', BOUNDS, 'record: 262_144,', 'record: 262_145,'],
  ['bound-round-delivery', BOUNDS, 'roundDelivery: 65_536,', 'roundDelivery: 65_537,'],
  ['bound-digest-line', BOUNDS, 'packetDigestLine: 78,', 'packetDigestLine: 79,'],
  ['bound-supervisor-state', BOUNDS, 'supervisorState: 16_777_216,', 'supervisorState: 16_777_217,'],
  // The words that stand where an error code stood.
  ['cause-not-regular', BOUNDS, "if (cause instanceof NotARegularFileError) return 'not a regular file';", ''],
  ['cause-past-bound', BOUNDS, 'if (cause instanceof PastBoundError) return `larger than ${cause.bound} bytes`;', ''],
  ['cause-absent', BOUNDS, "=== 'ENOENT';", "=== 'ENOENT-not';"],
  // REQ-033: close's two logs; present but unreadable is Unknown, never empty.
  ['close-old-reader', CLOSE, 'readBoundedText(path.join(run, name), RUN_TREE_BOUNDS.log)', "fs.readFileSync(path.join(run, name), 'utf8')"],
  ['close-unreadable-as-empty', CLOSE, 'return { ok: false, why: `${name} cannot be read', 'return { ok: true, lines: [] }; return { ok: false, why: `${name} cannot be read'],
  ['close-breaches-as-none', CLOSE, "if (!read.ok) return [{ unreadable: true, why: read.why, label: 'Unknown' }];", 'if (!read.ok) return [];'],
  ['close-steps-inferred', CLOSE, "if (!read.ok) return { label: 'Unknown', basis", "if (!read.ok) return { label: 'Inferred', basis"],
  // REQ-033: every reader of run.json.
  ['reverify-old-reader', REVERIFY, `text = ${NEW_RUN_JSON('path.resolve(runDir)')};`, `text = ${OLD_RUN_JSON('path.resolve(runDir)')};`],
  ['reverify-errno-words', REVERIFY, '(${readCause(cause, RUN_TREE_BOUNDS.runRecord)})', "(${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})"],
  ['status-old-reader', STATUS, `configText = ${NEW_RUN_JSON('run')};`, `configText = ${OLD_RUN_JSON('run')};`],
  ['status-errno-words', STATUS, '(${readCause(cause, RUN_TREE_BOUNDS.runRecord)})', "(${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})"],
  ['status-close-record-old-reader', STATUS, 'parseBoundedJson(readBoundedText(file, RUN_TREE_BOUNDS.closeRecord)', "parseBoundedJson(fs.readFileSync(file, 'utf8')"],
  ['check-log-old-reader', CHECK, NEW_RUN_JSON('run'), OLD_RUN_JSON('run')],
  ['logstep-old-reader', RUNDIR, NEW_RUN_JSON('run'), OLD_RUN_JSON('run')],
  ['render-old-reader', RENDER, NEW_RUN_JSON('runDir'), OLD_RUN_JSON('runDir')],
  ['statement-old-reader', STATEMENT, NEW_RUN_JSON('run'), OLD_RUN_JSON('run')],
  ['ledger-old-reader', LEDGER, NEW_RUN_JSON('dir'), OLD_RUN_JSON('dir')],
  ['supervisor-limit-old-reader', POLARIS, NEW_RUN_JSON('run'), "fs.readFileSync(path.join(run, 'run.json'), 'utf8')"],
  // REQ-033: the credential list and the execution choice.
  ['credential-old-reader', PROBE, 'text = readBoundedText(file, LIST_MAX_BYTES);', "text = fs.readFileSync(file, 'utf8');"],
  ['credential-stat-then-read', PROBE, 'text = readBoundedText(file, LIST_MAX_BYTES);',
    "{ const stat = fs.statSync(file); if (!stat.isFile()) return { ok: false, why: `${file} is not a regular file` }; if (stat.size > LIST_MAX_BYTES) return { ok: false, why: `${file} is larger than ${LIST_MAX_BYTES} bytes` }; text = fs.readFileSync(file, 'utf8'); }"],
  ['choice-old-reader', CHOICE, 'text = readBoundedText(file, RUN_TREE_BOUNDS.executionChoice);', "text = fs.readFileSync(file, 'utf8');"],
  ['choice-errno-words', CHOICE, '(${readCause(cause, RUN_TREE_BOUNDS.executionChoice)})', "(${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})"],
  // REQ-035: records, verdicts and inventories.
  ['record-old-reader', RUNDIR, 'parseBoundedJson(readBoundedText(file, RUN_TREE_BOUNDS.record), RECORD_JSON_LIMITS)', "parseBoundedJson(fs.readFileSync(file, 'utf8'), RECORD_JSON_LIMITS)"],
  ['submitted-verdict-stat-then-read', REVIEW, 'bytes = new Uint8Array(readBoundedFile(file, VERDICT_MAX_BYTES));',
    "{ const stats = fs.statSync(file); if (!stats.isFile()) return refuse('verdict', `${file} is not a regular file`, undefined, run); if (stats.size > VERDICT_MAX_BYTES) return refuse('verdict', `${file} is larger than the ${VERDICT_MAX_BYTES}-byte verdict bound`, undefined, run); bytes = new Uint8Array(fs.readFileSync(file)); }"],
  ['frozen-verdict-old-reader', REVIEW, 'readBoundedFile(path.join(run, frozen), RUN_TREE_BOUNDS.verdict)', 'fs.readFileSync(path.join(run, frozen))'],
  ['frozen-verdict-errno-words', REVIEW, '(${readCause(cause, RUN_TREE_BOUNDS.verdict)})', '(${errno(cause)})'],
  ['frozen-inventory-old-reader', INV, 'readBoundedFile(path.join(run, frozen), RUN_TREE_BOUNDS.inventory)', 'fs.readFileSync(path.join(run, frozen))'],
  ['frozen-inventory-errno-words', INV, '(${readCause(cause, RUN_TREE_BOUNDS.inventory)})', '(${errno(cause)})'],
  ['stored-brief-old-reader', INV, "readFileAsSized(path.join(sessionDirectory(opened.run, session), INVENTORY_BRIEF_FILE)).toString('utf8')", "fs.readFileSync(path.join(sessionDirectory(opened.run, session), INVENTORY_BRIEF_FILE), 'utf8')"],
  ['packet-inventory-old-reader', PACKET, 'readBoundedFile(path.join(run, counted.file), RUN_TREE_BOUNDS.inventory)', 'fs.readFileSync(path.join(run, counted.file))'],
  ['coverage-inventory-old-reader', COVERAGE, 'readBoundedFile(path.join(path.resolve(runDir), counted.file), RUN_TREE_BOUNDS.inventory)', 'fs.readFileSync(path.join(path.resolve(runDir), counted.file))'],
  ['site-page-old-reader', DESIGN, 'bytes = readBoundedFile(full, SITE_MAX_BYTES - total);', 'bytes = fs.readFileSync(full);'],
  ['site-page-not-regular-words', DESIGN, 'if (cause instanceof NotARegularFileError) return `${relative} in site ${number} is not a regular file`;', ''],
  // REQ-035: the waiting command.
  ['await-record-not-first', WAITING, 'if (record === undefined) return mismatch();', ''],
  ['await-packet-own-size', WAITING, 'readBoundedFile(packetFile, packetBound)', 'readFileAsSized(packetFile)'],
  ['await-legacy-not-own-size', WAITING, 'packetBound === undefined ? readFileAsSized(packetFile) :', 'packetBound === undefined ? readBoundedFile(packetFile, 0) :'],
  ['await-delivery-old-reader', WAITING, 'readBoundedText(path.join(roundDir, DELIVERY_FILE), RUN_TREE_BOUNDS.roundDelivery)', "fs.readFileSync(path.join(roundDir, DELIVERY_FILE), 'utf8')"],
  ['await-digest-old-reader', WAITING, 'readBoundedText(path.join(roundDir, PACKET_DIGEST_FILE), RUN_TREE_BOUNDS.packetDigestLine)', "fs.readFileSync(path.join(roundDir, PACKET_DIGEST_FILE), 'utf8')"],
  ['await-brief-old-reader', WAITING, 'readFileAsSized(path.join(directory, INVENTORY_BRIEF_FILE))', 'fs.readFileSync(path.join(directory, INVENTORY_BRIEF_FILE))'],
  ['await-errno-words', WAITING, 'cannot be read (${readCause(cause, bound)})', 'cannot be read (${errno(cause)})'],
  // REQ-035 and -048: the URL supervisor.
  ['supervisor-review-check-unbounded', POLARIS, 'export const readReviewCheck = (file: string): unknown => readRecord(file);', "export const readReviewCheck = (file: string): unknown => JSON.parse(fs.readFileSync(file, 'utf8'));"],
  ['supervisor-verdict-old-reader', POLARIS, "const doc: unknown = JSON.parse(readBoundedText(path.join(run, RUN_LAYOUT.reviews, `${kind}-verdict-${n}.json`), RUN_TREE_BOUNDS.verdict));", "const doc: unknown = JSON.parse(fs.readFileSync(path.join(run, RUN_LAYOUT.reviews, `${kind}-verdict-${n}.json`), 'utf8'));"],
  ['supervisor-blocking-why-old-reader', POLARIS, 'doc = JSON.parse(readBoundedText(path.join(run, RUN_LAYOUT.reviews, `${kind}-verdict-${n}.json`), RUN_TREE_BOUNDS.verdict)) as', "doc = JSON.parse(fs.readFileSync(path.join(run, RUN_LAYOUT.reviews, `${kind}-verdict-${n}.json`), 'utf8')) as"],
  ['state-old-reader', POLARIS, 'text = readBoundedText(statePath(stateRoot, runId), RUN_TREE_BOUNDS.supervisorState);', "text = fs.readFileSync(statePath(stateRoot, runId), 'utf8');"],
  ['state-unparsed-as-absent', POLARIS, "return isAbsent(cause) ? 'absent' : 'unreadable';", "return 'absent';"],
  ['state-non-object-accepted', POLARIS, "return isRecord(doc) ? doc as unknown as SupervisorState : 'unreadable';", 'return doc as unknown as SupervisorState;'],
  ['supervise-unreadable-started-afresh', POLARIS, "if (loaded === 'unreadable') return refuse(`no launched run ${options.run} under ${options.stateRoot}`);", ''],
  // The bound a bounded read reports for a file read under its own size.
  ['past-bound-carries-no-bound', READ, 'if (stats.size > maxBytes) throw new PastBoundError(maxBytes);', "if (stats.size > maxBytes) throw new BoundedJsonError('byte-limit');"],
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
