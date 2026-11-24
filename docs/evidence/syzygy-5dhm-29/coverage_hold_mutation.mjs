// Recorded mutation run over the predicates of the fidelity review's coverage hold (syzygy-5dhm.29, REQ-polaris-generation-035
// version 2.27), adapted from docs/evidence/syzygy-5dhm-41/worth_knowing_mutation.mjs.
// Usage: node coverage_hold_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the checks of its group, and restores the source in
// `finally`. vitest runs with a 120 s test timeout, so a loaded machine's slow test is not scored as a kill. `--dry` only asserts that
// every fragment occurs exactly once. Never edit or commit while it runs.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyAt = args.indexOf('--only');
const only = onlyAt === -1 ? null : new Set(args[onlyAt + 1].split(','));
const [root, out, scratch] = args.filter((arg, i) => !arg.startsWith('--') && (onlyAt === -1 || i !== onlyAt + 1));
if (!root || !out || !scratch) throw new Error('usage: node coverage_hold_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });

const P = 'packages/polaris-dossier/src';
const HOLD = `${P}/coverage-hold.ts`, REVIEW = `${P}/review.ts`, HANDOVER = `${P}/session-handover.ts`, PACKET = `${P}/review-packet.ts`, SUPERVISOR = `${P}/polaris.ts`;
const FLOW = `${P}/coverage-hold-flow.test.ts`, UNIT = `${P}/coverage-hold.test.ts`, WAITING = `${P}/waiting-sessions.test.ts`;
const TESTS = {
  [HOLD]: [UNIT, FLOW],
  [REVIEW]: [FLOW],
  [HANDOVER]: [FLOW, WAITING],
  [PACKET]: [FLOW],
  [SUPERVISOR]: [UNIT],
};
const TIMEOUT_MS = 900_000;

const MUTANTS = [
  // --- the hold: an entry without an outcome holds the packet; covered, named or omitted entries do not
  ['hold-never', HOLD, 'if (uncovered.length === 0) return undefined;', 'if (uncovered.length >= 0) return undefined;'],
  ['hold-pre-v5-held', HOLD, "typeof schemaVersion === 'string' && !PRE_V5_SCHEMA_VERSIONS.includes(schemaVersion)", "typeof schemaVersion === 'string'"],
  ['hold-schema-ignored', HOLD, "if (!heldSchema(subject.draft['schemaVersion'])) return undefined;", ''],
  ['hold-withheld-counted', HOLD, '.filter((entry) => !isWithheldItem(entry, standing))', '.filter(() => true)'],
  ['hold-secret-path-named', HOLD, 'entry.paths.map((cited) => JSON.stringify(cited))', '[...entry.paths, ...Array(entry.unnamedPaths).fill("config/secret.env")].map((cited) => JSON.stringify(cited))'],
  ['hold-ids-unquoted', HOLD, "entry.entryId === null ? 'an entry with no identifier' : JSON.stringify(entry.entryId)", "entry.entryId === null ? 'an entry with no identifier' : entry.entryId"],
  ['hold-all-named', HOLD, 'const listed = reasons.slice(0, HELD_ENTRIES_NAMED);', 'const listed = reasons;'],
  ['hold-next-step-dropped', HOLD, "then run syzygy dossier check ${subject.run} again. `", '`'],
  // --- the packet build carries the hold, and each issuing point refuses on it
  ['packet-hold-not-carried', PACKET, "...(hold === undefined ? {} : { coverageHold: hold }),", ''],
  ['review-packet-gate-dropped', REVIEW, "if (built.coverageHold !== undefined) return refuse('coverage', built.coverageHold.reason, built.coverageHold.reasons, opened.run);", ''],
  ['session-prompt-gate-dropped', HANDOVER, "    if (fidelity.coverageHold !== undefined) return refuse('coverage', fidelity.coverageHold.reason, fidelity.coverageHold.reasons);\n    built = fidelity;\n    packet = { sha256: fidelity.sha256, draftRevision: fidelity.draft.revision, inventoryRevision: fidelity.inventory.revision };\n  }\n  const session", "    built = fidelity;\n    packet = { sha256: fidelity.sha256, draftRevision: fidelity.draft.revision, inventoryRevision: fidelity.inventory.revision };\n  }\n  const session"],
  ['delivery-gate-dropped', HANDOVER, "    if (fidelity.coverageHold !== undefined) return refuse('coverage', fidelity.coverageHold.reason, fidelity.coverageHold.reasons);\n    built = fidelity;\n    packet = { sha256: fidelity.sha256, draftRevision: fidelity.draft.revision, inventoryRevision: fidelity.inventory.revision };\n  }\n  return deliverToWaiting", "    built = fidelity;\n    packet = { sha256: fidelity.sha256, draftRevision: fidelity.draft.revision, inventoryRevision: fidelity.inventory.revision };\n  }\n  return deliverToWaiting"],
  // --- the supervisor's notice
  ['supervisor-key-unpaired', SUPERVISOR, '`coverage-held-${draftRevision}/${inventoryRevision}`', '`coverage-held-${draftRevision}`'],
  ['supervisor-message-multiline', SUPERVISOR, '`Syzygy: ${flatten(reason, 4000)} This repair', '`Syzygy: ${reason} This repair'],
];

// Fragments not mutated, each with why (none is a predicate a test can observe).
const EQUIVALENT = [];
for (const { id, file, old } of EQUIVALENT) {
  const count = fs.readFileSync(path.join(root, file), 'utf8').split(old).length - 1;
  if (count !== 1) throw new Error(`${id}: the fragment occurs ${count} times in ${file}`);
}

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = [...new Set(MUTANTS.map(([, file]) => file))].sort();
const originals = new Map(files.map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const wrong = [];
for (const [id, file, old] of MUTANTS) {
  const count = originals.get(file).split(old).length - 1;
  if (count !== 1) wrong.push(`${id}: the fragment occurs ${count} times in ${file}`);
}
if (wrong.length > 0) throw new Error(wrong.join('\n'));
if (new Set(MUTANTS.map(([id]) => id)).size !== MUTANTS.length) throw new Error('a mutant id repeats');
if (dry) { process.stdout.write(`${MUTANTS.length} mutants, each fragment once\n`); process.exit(0); }
const restoreAll = () => { for (const [file, text] of originals) fs.writeFileSync(path.join(root, file), text); };
process.on('SIGINT', () => { restoreAll(); process.exit(130); });
process.on('SIGTERM', () => { restoreAll(); process.exit(143); });

async function runPython(tag, commands) {
  const failedTests = [];
  for (const command of commands) {
    const child = spawn('python3', command, { cwd: root, stdio: 'ignore' });
    const code = await new Promise((resolve) => child.on('exit', (c) => resolve(c)));
    if (code !== 0) failedTests.push(`python3 ${command.join(' ')} (exit ${code})`);
  }
  return { code: failedTests.length === 0 ? 0 : 1, timedOut: false, failedTests, total: commands.length };
}

async function runGroup(tag, group) {
  if (Array.isArray(group)) return runTests(tag, group);
  const python = await runPython(tag, group.python);
  if (group.vitest === undefined) return python;
  const vitest = await runTests(tag, group.vitest);
  return { code: python.code || vitest.code, timedOut: vitest.timedOut, failedTests: [...python.failedTests, ...vitest.failedTests], total: python.total + (vitest.total ?? 0) };
}

async function runTests(tag, tests) {
  const report = path.join(scratch, `mutation-${tag}.json`);
  fs.rmSync(report, { force: true });
  const child = spawn('npx', ['vitest', 'run', ...tests, '--testTimeout=120000', '--reporter=json', `--outputFile=${report}`], { cwd: root, detached: true, stdio: 'ignore' });
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
  command: 'npx vitest run <the test files of the mutant\'s source file> --testTimeout=120000 --reporter=json --outputFile=<scratch>/mutation-<id>.json; for a Python or JSON source, python3 <each listed command> (a non-zero exit is a failure)',
  method: `Each mutant replaces one fragment (asserted to occur exactly once) in its file, runs the test files listed for that file under vitest with the JSON reporter, and restores every source in finally. A mutant is killed when the run exits non-zero and at least one test fails (failedTests lists each) or is stopped after ${TIMEOUT_MS / 1000} s; a run that exits non-zero with no failed test and no timeout is recorded as not run, never as killed. The unmutated baseline of each group runs first and must pass.`,
  testFiles: TESTS,
  baselines: [],
  mutants: [],
  equivalent: EQUIVALENT,
  summary: null,
};
try {
  for (const file of files) {
    const baseline = await runGroup(`baseline-${path.basename(file)}`, TESTS[file]);
    record.baselines.push({ file, exitCode: baseline.code, tests: baseline.total, failedTests: baseline.failedTests });
    if (baseline.code !== 0) throw new Error(`the baseline for ${file} fails: ${baseline.failedTests.join('; ')}`);
  }
  for (const [id, file, old, replacement] of MUTANTS) {
    const started = Date.now();
    try {
      fs.writeFileSync(path.join(root, file), originals.get(file).replace(old, () => replacement));
      const result = await runGroup(id, TESTS[file]);
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
