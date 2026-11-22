// Recorded mutation run over the new predicates of the reader's edition (syzygy-5dhm.136).
// Usage: node reader_edition_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
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
if (!root || !out || !scratch) throw new Error('usage: node reader_edition_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });

const APP = 'apps/three-surface-poc/src/polaris-generation';
const SITE = `${APP}/dossier-site.ts`;
const EDITION_TEST = `${APP}/dossier-reader-edition.test.ts`;
const TO_TEXT = 'scripts/dossier_site_to_text.py';
const CLASSES = 'scripts/dossier_page_classes.json';
const RENDER_TEST = 'packages/polaris-dossier/src/render.test.ts';

// The checks a mutant of each file runs: vitest files, or the Python commands (each must exit 0).
const SITE_TESTS = [EDITION_TEST, `${APP}/dossier-finding.test.ts`, `${APP}/dossier-reading.test.ts`, `${APP}/dossier-render-provider-golden.test.ts`];
const PYTHON = [['scripts/dossier_site_to_text.py', '--selftest'], ['scripts/dossier_pilot_runs.py', '--selftest'], ['scripts/dossier_pilot_runs.py', '--check'], ['scripts/test_dossier_pilot.py']];
const TESTS = {
  [SITE]: [...SITE_TESTS, RENDER_TEST],
  [EDITION_TEST]: [EDITION_TEST],
  [TO_TEXT]: { python: PYTHON },
  [CLASSES]: { python: PYTHON, vitest: [EDITION_TEST, RENDER_TEST] },
};
const TIMEOUT_MS = 900_000;

const MUTANTS = [
  // --- the fold: one entry, labelled About this run, last, holding exactly the run pages
  ['fold-old-label', SITE, '<summary>${ABOUT_THIS_RUN}</summary>', '<summary>Review report</summary>'],
  ['fold-misses-size-report', SITE, '${localNav(from)}<li><a href="${href(from, \'size-report.html\')}">Size report</a></li>', '${localNav(from)}'],
  ['fold-not-last', SITE, '<li><a href="${href(from, \'glossary.html\')}">Glossary</a></li><li><a href="${href(from, \'sources/index.html\')}">Sources</a></li>${reviewReport(from)}`;', '<li><a href="${href(from, \'glossary.html\')}">Glossary</a></li>${reviewReport(from)}<ol><li><a href="${href(from, \'sources/index.html\')}">Sources</a></li></ol>`;'],
  ['fold-holds-unclassed-page', SITE, '`${localNav(from)}<li><a href="${href(from, \'size-report.html\')}">Size report</a></li>', '`<li><a href="${href(from, \'glossary.html\')}">Glossary</a></li>${localNav(from)}<li><a href="${href(from, \'size-report.html\')}">Size report</a></li>'],
  ['contents-about-heading-old', SITE, '`</ol><h2 id="about-this-run">${ABOUT_THIS_RUN}</h2>', '`</ol><h2 id="review-report">Review report</h2>'],
  // --- the finding pages near the top
  ['nav-index-dropped', SITE, '<li><a href="${href(from, FIND_BY_TASK_PAGE)}">Find by task</a></li><li><a href="${href(from, NAME_INDEX_PAGE)}">Index</a></li>`}${poles', '<li><a href="${href(from, FIND_BY_TASK_PAGE)}">Find by task</a></li>`}${poles'],
  ['contents-index-dropped', SITE, '<li><a href="${FIND_BY_TASK_PAGE}">Find by task</a></li><li><a href="${NAME_INDEX_PAGE}">Index</a></li>`}', '<li><a href="${FIND_BY_TASK_PAGE}">Find by task</a></li>`}'],
  ['reading-order-index-last', SITE, 'if (indexAt !== -1) pages.splice(', 'if (indexAt === -2) pages.splice('],
  // --- the landing page leads with the thesis and the map
  ['landing-map-after-sections', SITE, '</header>${overviewFigures}${poleMap}${sections}${missingList}', '</header>${overviewFigures}${sections}${poleMap}${missingList}'],
  ['landing-map-before-figure', SITE, '</header>${overviewFigures}${poleMap}${sections}', '</header>${poleMap}${overviewFigures}${sections}'],
  // --- a disclosure stays on its claim's page
  ['unknown-marking-dropped', SITE, 'const mark = (from: string, m: EpistemicMarking): string => (narrative(from) ? clipped(marking(m)) : marking(m));', 'const mark = (from: string, m: EpistemicMarking): string => (m === \'unknown\' ? \'\' : narrative(from) ? clipped(marking(m)) : marking(m));'],
  ['unknown-lead-dropped', SITE, 'const lead = reading && b.marking === \'unknown\' ? \'<span class="not-established">Not established.</span> \' : \'\';', 'const lead = \'\';'],
  ['unknown-reason-words-dropped', SITE, 'const reason = b.unknownReason === null ? \'\' : reading ?', 'const reason = true ? \'\' : reading ?'],
  ['withheld-words-dropped', SITE, 'if (own?.withheld !== undefined) return escape(part.text);', 'if (own?.withheld !== undefined) return \'\';'],
  ['claim-label-flipped', SITE, 'data-claim-id="${escape(id)}" data-epistemic="${m}"${last}>', 'data-claim-id="${escape(id)}" data-epistemic="${m === \'unknown\' ? \'inferred\' : m}"${last}>'],
  // --- the predicate itself (the test's own reading of an element)
  ['predicate-reason-in-attribute', EDITION_TEST, '&& !element.slice(tag.length).includes(claim.unknownReason)', '&& !element.includes(claim.unknownReason)'],
  ['predicate-element-to-main-end', EDITION_TEST, 'const element = html.slice(start, elementEnd(html, start));', 'const element = html.slice(start, html.indexOf(\'</main>\', start));'],
  ['predicate-links-skip-fragments', EDITION_TEST, "if (onPage === undefined || (to.fragment !== '' && !onPage.has(to.fragment)))", 'if (onPage === undefined)'],
  // --- the reader form and the one page-class definition
  ['reader-form-keeps-run-pages', TO_TEXT, "if reader and page_class(relative) == 'run':", "if reader and page_class(relative) == 'other':"],
  ['reader-form-other-uncounted', TO_TEXT, "if reader and page_class(relative) == 'other':", 'if False:'],
  ['page-class-prefix-ignored', TO_TEXT, 'if relative in paths or relative.startswith(prefixes):', 'if relative in paths:'],
  ['classes-appendix-not-run', CLASSES, '"size-report.html", "appendix.html"]', '"size-report.html"]'],
  ['classes-name-index-run', CLASSES, '"sources/index.html", "name-index.html"], "prefixes": []},\n  {"class": "run", "paths": [', '"sources/index.html"], "prefixes": []},\n  {"class": "run", "paths": ["name-index.html", '],
  ['classes-size-report-navigation', CLASSES, '"name-index.html"], "prefixes": []},', '"name-index.html", "size-report.html"], "prefixes": []},'],
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
