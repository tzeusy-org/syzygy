// Recorded mutation run over the new predicates of the worth-knowing mark (syzygy-5dhm.41), adapted from
// docs/evidence/syzygy-5dhm-136/reader_edition_mutation.mjs.
// Usage: node worth_knowing_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
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
if (!root || !out || !scratch) throw new Error('usage: node worth_knowing_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });

const P = 'packages/polaris-dossier/src';
const CHECK = `${P}/check-derive.ts`, SCHEMA = `${P}/draft-schema.ts`, ADVICE = `${P}/reader-advice.ts`, RENDER = `${P}/render.ts`;
const BRIEF = `${P}/brief.ts`, INVENTORY = `${P}/inventory.ts`, SITE = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts';
const GOLDEN = 'apps/three-surface-poc/src/polaris-generation/dossier-render-provider-golden.test.ts';
const TESTS = {
  [CHECK]: [`${P}/check.test.ts`],
  [SCHEMA]: [`${P}/draft-schema.test.ts`, `${P}/check.test.ts`],
  [ADVICE]: [`${P}/reader-standards.test.ts`],
  [RENDER]: [`${P}/render.test.ts`],
  [SITE]: [`${P}/render.test.ts`, GOLDEN],
  [BRIEF]: [`${P}/brief.test.ts`],
  [INVENTORY]: [`${P}/inventory.test.ts`],
};
const TIMEOUT_MS = 900_000;

const MUTANTS = [
  // --- check: a marked block is a cited, unjudged section paragraph; earlier drafts report field-version
  ['check-place-dropped', CHECK, 'if (!WORTH_KNOWING_PLACE.test(at)) finding(', 'if (false) finding('],
  ['check-cites-dropped', CHECK, "if (list(value['citations']).length === 0) finding(", 'if (false) finding('],
  ['check-judgement-dropped', CHECK, "if (value['judgement'] === true) finding(", 'if (false) finding('],
  ['check-any-label', CHECK, "if (value[WORTH_KNOWING_FIELD] !== true || value['label'] !== 'inferred') return;", 'if (value[WORTH_KNOWING_FIELD] !== true) return;'],
  ['check-mark-field-version-dropped', CHECK, "walk(doc, '$', (value, at) => { if (Object.hasOwn(value, WORTH_KNOWING_FIELD)) out.push(", "walk(doc, '$', (value, at) => { if (false) out.push("],
  ['check-none-field-version-dropped', CHECK, 'if (isRecord(pole) && Object.hasOwn(pole, WORTH_KNOWING_NONE_FIELD)) out.push(', 'if (false) out.push('],
  ['check-v13-judged-as-v10', CHECK, 'if (!hasWorthKnowingForm(doc[\'schemaVersion\'])) return;\n  walk(', 'if (hasWorthKnowingForm(doc[\'schemaVersion\'])) return;\n  walk('],
  // --- schema: the mark on the Inferred forms of v13 only, the reason on a v13 Pole only
  ['schema-mark-in-v8', SCHEMA, 'const mark: Record<string, DraftSchema> = marked ?', 'const mark: Record<string, DraftSchema> = true ?'],
  ['schema-mark-dropped', SCHEMA, 'const mark: Record<string, DraftSchema> = marked ?', 'const mark: Record<string, DraftSchema> = false ?'],
  ['schema-none-in-v8', SCHEMA, "poles: list(worthKnowing === 'taken'", 'poles: list(true'],
  // --- the version chain after the merge with main: v13 is v10 plus the mark; v11 and v12 are unknown versions
  ['chain-v10-marked', CHECK, "const v10 = localDraftSchema({ ...parameters, hero: 'required' }, 'home', 'required', 'taken', 'taken', 'taken', 'absent');", "const v10 = localDraftSchema({ ...parameters, hero: 'required' }, 'home', 'required', 'taken', 'taken', 'taken', 'taken');"],
  ['chain-v13-read-as-v10', CHECK, 'const schema = hasWorthKnowingForm(version) ? current : hasHeroForm(version) ? v10 :', 'const schema = false ? current : hasHeroForm(version) ? v10 :'],
  ['chain-v13-without-hero', SCHEMA, 'version === LOCAL_DRAFT_SCHEMA_VERSION_V10 || hasWorthKnowingForm(version);', 'version === LOCAL_DRAFT_SCHEMA_VERSION_V10;'],
  ['chain-v11-v12-admitted', SCHEMA, 'LOCAL_DRAFT_SCHEMA_VERSION_V10, LOCAL_DRAFT_SCHEMA_VERSION] as const', "LOCAL_DRAFT_SCHEMA_VERSION_V10, 'polaris-dossier-local-draft-v11', 'polaris-dossier-local-draft-v12', LOCAL_DRAFT_SCHEMA_VERSION] as const"],
  ['inventory-kind-dropped', SCHEMA, "'conflict', 'worth-knowing', 'other'] as const);", "'conflict', 'other'] as const);"],
  // --- advice: count per Pole, a reason excuses zero, the ceiling, a section counted once, v13 only
  ['advice-reason-ignored', ADVICE, 'if (marked === 0 && !group.none) {', 'if (marked === 0) {'],
  ['advice-ceiling-off-by-one', ADVICE, '} else if (marked > WORTH_KNOWING_CEILING) {', '} else if (marked > WORTH_KNOWING_CEILING + 1) {'],
  ['advice-section-counted-twice', ADVICE, 'if (counted.has(id)) return sum; ', ''],
  ['advice-every-version', ADVICE, "if (!hasWorthKnowingForm(doc['schemaVersion'])) return undefined;\n  const marks", "if (false) return undefined;\n  const marks"],
  // --- render input: only `true` marks a block; the Poles that say none was found
  ['render-false-marks', RENDER, 'entry[WORTH_KNOWING_FIELD] === true && typeof', 'entry[WORTH_KNOWING_FIELD] !== undefined && typeof'],
  ['render-none-dropped', RENDER, "isRecord(pole) && typeof pole[WORTH_KNOWING_NONE_FIELD] === 'string' ? [index] : []", '[]'],
  // --- the callout: the block drawn once, before the sections, the none sentence, the landing page
  ['site-block-drawn-twice', SITE, '.filter(b => !worthKnowingIds.has(b.id)).map(b => block(from, b))', '.map(b => block(from, b))'],
  ['site-none-dropped', SITE, 'return noneFound ? `<aside', 'return false ? `<aside'],
  ['site-landing-dropped', SITE, "const landingCallout = withheld ? '' : worthKnowingCallout(", "const landingCallout = withheld || true ? '' : worthKnowingCallout("],
  ['site-callout-after-sections', SITE, '${bannerFor(`run-stopped/pole/${at}`)}${callout}${pageContents(rendered)}${body}', '${bannerFor(`run-stopped/pole/${at}`)}${pageContents(rendered)}${body}${callout}'],
  ['site-section-link-dropped', SITE, '<p class="worth-knowing-from">In <a href=', '<p class="worth-knowing-from">In <a data-href='],
  // --- the briefs ask for it
  ['brief-paragraph-dropped', BRIEF, "    WORTH_KNOWING_PARAGRAPH,\n    '',\n", ''],
  ['inventory-brief-old-version', INVENTORY, "'polaris-dossier-inventory-brief-v4'", "'polaris-dossier-inventory-brief-v3'"],
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
