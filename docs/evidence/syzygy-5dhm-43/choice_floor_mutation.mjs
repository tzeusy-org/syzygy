// Recorded mutation run over the new predicates of the choice floor (syzygy-5dhm.43), adapted from
// docs/evidence/syzygy-5dhm-135/question_kind_mutation.mjs.
// Usage: node choice_floor_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the checks of its group, and restores the source in
// `finally`. `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyAt = args.indexOf('--only');
const only = onlyAt === -1 ? null : new Set(args[onlyAt + 1].split(','));
const [root, out, scratch] = args.filter((arg, i) => !arg.startsWith('--') && (onlyAt === -1 || i !== onlyAt + 1));
if (!root || !out || !scratch) throw new Error('usage: node choice_floor_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });

const P = 'packages/polaris-dossier/src';
const ADVICE = `${P}/reader-advice.ts`;
const TESTS = { [ADVICE]: [`${P}/reader-standards.test.ts`, `${P}/check.test.ts`] };
const TIMEOUT_MS = 900_000;

const MUTANTS = [
  ['v13-gate-dropped', ADVICE, "export function choiceFloorAdvice(doc: Readonly<Record<string, unknown>>): readonly ChoiceFloorAdvisory[] | undefined {\n  if (!hasWorthKnowingForm(doc['schemaVersion'])) return undefined;", "export function choiceFloorAdvice(doc: Readonly<Record<string, unknown>>): readonly ChoiceFloorAdvisory[] | undefined {"],
  ['any-label-counts', ADVICE, "isRecord(entry) && entry['label'] === 'inferred')", 'isRecord(entry))'],
  ['trade-offs-dropped', ADVICE, "(['choices', 'tradeOffs'] as const)", "(['choices'] as const)"],
  ['choices-dropped', ADVICE, "(['choices', 'tradeOffs'] as const)", "(['tradeOffs'] as const)"],
  ['floor-inclusive', ADVICE, 'if (onRecord >= CHOICE_FLOOR) continue;', 'if (onRecord > CHOICE_FLOOR) continue;'],
  ['floor-dropped', ADVICE, 'if (onRecord >= CHOICE_FLOOR) continue;', ''],
  ['section-counted-again', ADVICE, "typeof id === 'string' && !counted.has(id) && (counted.add(id), true)", "typeof id === 'string'"],
  ['pole-attribution-dropped', ADVICE, 'const onRecord = group.pole === undefined ? items.length : items.filter((paths) => [...paths].some((path) => cited.has(path))).length;', 'const onRecord = items.length;'],
  ['no-pole-attributed', ADVICE, 'const onRecord = group.pole === undefined ? items.length :', 'const onRecord ='],
  ['excerpt-citation-ignored', ADVICE, "else if (key === 'citation' && isRecord(member)) { const path = text(member['path']); if (path !== undefined) into.add(path); }", ''],
  ['nested-citations-ignored', ADVICE, '    else citedPathsIn(member, into);', ''],
  ['singular-dropped', ADVICE, "${onRecord === 1 ? 'choice or trade-off' : 'choices or trade-offs'}", 'choices or trade-offs'],
  ['no-pole-clause-kept', ADVICE, "${group.pole === undefined ? '' : ' citing a file its sections cite'}", ' citing a file its sections cite'],
  ['deep-dive-ignored', ADVICE, "for (const dive of list(doc['deepDives'])) if (isRecord(dive) && counted.has(text(dive['sectionId']) ?? '')) citedPathsIn(dive, cited);", ''],
  ['deep-dive-any-pole', ADVICE, "if (isRecord(dive) && counted.has(text(dive['sectionId']) ?? '')) citedPathsIn(dive, cited);", 'if (isRecord(dive)) citedPathsIn(dive, cited);'],
  ['first-citation-only', ADVICE, "citedPathsIn(entry['citations'] === undefined ? [] : { citations: entry['citations'] }, new Set())", "citedPathsIn({ citations: list(entry['citations']).slice(0, 1) }, new Set())"],
  ['nesting-ignored', ADVICE, '    else citedPathsIn(member, into);', "    else if (key !== 'children' && key !== 'items' && key !== 'rows') citedPathsIn(member, into);"],
  ['wiring-dropped', ADVICE, '    ...(choiceFloor === undefined ? {} : { choiceFloor }) };', '    };'],
].filter(([id]) => only === null || only.has(id));

// A mutant no test can kill, with the reason; recorded, never run and never counted as killed.
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
