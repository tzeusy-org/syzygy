// Recorded mutation run over the new predicates of the per-kind floor (syzygy-5dhm.135), adapted from
// docs/evidence/syzygy-5dhm-41/worth_knowing_mutation.mjs.
// Usage: node question_kind_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
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
if (!root || !out || !scratch) throw new Error('usage: node question_kind_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });

const P = 'packages/polaris-dossier/src';
const KINDS = `${P}/question-kinds.ts`, CHECK = `${P}/check-derive.ts`, SCHEMA = `${P}/draft-schema.ts`, RUN = `${P}/check.ts`, BRIEF = `${P}/brief.ts`;
const TESTS = {
  [KINDS]: [`${P}/question-kinds.test.ts`, `${P}/check.test.ts`],
  [CHECK]: [`${P}/check.test.ts`],
  [SCHEMA]: [`${P}/check.test.ts`, `${P}/question-kinds.test.ts`],
  [RUN]: [`${P}/check.test.ts`],
  [BRIEF]: [`${P}/brief.test.ts`],
};
const TIMEOUT_MS = 900_000;

const MUTANTS = [
  // --- major units: the share, the limit, the order, the listed denominator, the whole repository
  ['units-share-strict', KINDS, 'fact.files * MAJOR_UNIT_SHARE >= listed', 'fact.files * MAJOR_UNIT_SHARE > listed'],
  ['units-share-dropped', KINDS, "fact.fact === 'top-level-unit' && fact.files * MAJOR_UNIT_SHARE >= listed", "fact.fact === 'top-level-unit'"],
  ['units-denominator-all-files', KINDS, 'const listed = facts.files - facts.secretPathsLeftOut;', 'const listed = facts.files;'],
  ['units-limit-dropped', KINDS, '.slice(0, MAJOR_UNIT_LIMIT);', ';'],
  ['units-order-by-name', KINDS, '.sort((a, b) => b.files - a.files || (a.unit < b.unit ? -1 : a.unit > b.unit ? 1 : 0))', '.sort((a, b) => (a.unit < b.unit ? -1 : a.unit > b.unit ? 1 : 0))'],
  ['units-whole-dropped', KINDS, 'return [{ unit: WHOLE_REPOSITORY, files: listed }, ...directories];', 'return [...directories];'],
  // --- the Unknown forms
  ['unknown-schema-dropped', KINDS, "if (!hasWorthKnowingForm(doc['schemaVersion'])) return unknown(", 'if (false) return unknown('],
  ['unknown-tree-dropped', KINDS, "if (facts === undefined) return unknown('the pinned tree", "if (facts === undefined && false) return unknown('the pinned tree"],
  ['unknown-nothing-declared-dropped', KINDS, 'if (rows === 0) return unknown(', 'if (false) return unknown('],
  ['guard-dropped', KINDS, '    return compute(draft, facts, isSecret);\n  } catch (cause) {', '    return compute(draft, facts, isSecret);\n  } finally {\n  }\n  try {} catch (cause) {'],
  // --- declarations: valid kinds only, the empty id, duplicates
  ['rows-any-kind', KINDS, "typeof kind === 'string' && KIND_SET.has(kind)", "typeof kind === 'string'"],
  ['rows-empty-id-kept', KINDS, "if (blockId === undefined || blockId === '' || kinds.length === 0) continue;", 'if (blockId === undefined || kinds.length === 0) continue;'],
  ['rows-duplicate-unrecorded', KINDS, 'if (!duplicated.includes(blockId)) duplicated.push(blockId);', ''],
  ['rows-duplicate-kinds-not-joined', KINDS, 'for (const kind of kinds) seen.add(kind);', ''],
  // --- counted blocks: claim blocks only, Inferred only, once
  ['blocks-understanding-counted', KINDS, "if (block.textKey !== 'text' || block.value['label'] !== 'inferred') continue;", "if (block.value['label'] !== 'inferred') continue;"],
  ['blocks-any-label', KINDS, "if (block.textKey !== 'text' || block.value['label'] !== 'inferred') continue;", "if (block.textKey !== 'text') continue;"],
  ['blocks-counted-twice', KINDS, 'if (blockId === undefined || kinds === undefined || counted.has(blockId)) continue;', 'if (blockId === undefined || kinds === undefined) continue;'],
  // --- citation reach: first segment, a major directory only, a root file reaches no directory
  ['reach-any-directory', KINDS, 'if (slash > 0 && directories.has(cited!.slice(0, slash)))', 'if (slash > 0)'],
  ['reach-none', KINDS, 'reached.add(cited!.slice(0, slash));', ';'],
  ['missing-inverted', KINDS, "missing: QUESTION_KINDS.filter((kind) => answered[kind] === 0)", "missing: QUESTION_KINDS.filter((kind) => answered[kind] !== 0)"],
  // --- secret identifiers
  ['secret-listed', KINDS, 'ids.filter((blockId) => !isSecret(blockId));', 'ids.filter(() => true);'],
  ['secret-uncounted', KINDS, 'const unnamed = new Set([...unmatched, ...duplicated].filter((blockId) => isSecret(blockId))).size;', 'const unnamed = 0;'],
  // --- earlier schema: field-version, and it replaces the schema finding
  ['field-version-dropped', CHECK, "for (const at of questionKindsFieldVersionPaths(doc)) add({ kind: 'field-version'", "for (const at of [] as string[]) add({ kind: 'field-version'"],
  ['field-version-not-replacing', CHECK, 'for (const at of questionKindsFieldVersionPaths(doc)) subsectionPaths.add(at);', ''],
  // --- the schema: unique kinds, a closed kind set, v13 only
  ['schema-unique-dropped', SCHEMA, 'kinds: { ...list(choice(QUESTION_KINDS), 1, QUESTION_KINDS.length), uniqueItems: true }', 'kinds: { ...list(choice(QUESTION_KINDS), 1, QUESTION_KINDS.length) }'],
  ['schema-any-string', SCHEMA, 'kinds: { ...list(choice(QUESTION_KINDS), 1, QUESTION_KINDS.length), uniqueItems: true }', "kinds: { ...list({ type: 'string' }, 1, QUESTION_KINDS.length), uniqueItems: true }"],
  // --- check wiring: on check's report, never its record
  ['wiring-dropped', RUN, '...(kinds === undefined ? {} : { questionKindAdvice: kinds }),', ''],
  ['wiring-no-detector', RUN, 'questionKindAdvice(doc, treeFacts, secretPathOf(screen))', 'questionKindAdvice(doc, treeFacts, () => false)'],
  // --- the brief asks for it
  ['brief-paragraph-dropped', BRIEF, 'WORTH_KNOWING_PARAGRAPH,\n    \'\',\n    QUESTION_KINDS_PARAGRAPH,', 'WORTH_KNOWING_PARAGRAPH,'],
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
