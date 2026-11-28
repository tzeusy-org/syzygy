// Recorded mutation run over a code excerpt's numbers, highlights and notes (REQ-polaris-generation-034 version 2.54, syzygy-3efd.33).
// Usage: node code_marks_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files of its group, and restores the
// source in `finally`. `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs.
// Adapted from docs/evidence/syzygy-3efd-39/level_mutation.mjs: the same method, these files and mutants. The style rules' group runs the
// browser test alone, so each layout rule is shown to be pinned by the measured layout and not only by the unit test's literals; the site's
// group runs it too. The run refuses to start without SYZYGY_POC_BROWSER, and each baseline records the passed tests of every file, so the
// record shows the browser test passed (never skipped) in each group that lists it.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyAt = args.indexOf('--only');
const only = onlyAt === -1 ? null : new Set(args[onlyAt + 1].split(','));
const [root, out, scratch] = args.filter((arg, i) => !arg.startsWith('--') && (onlyAt === -1 || i !== onlyAt + 1));
if (!root || !out || !scratch) throw new Error('usage: node code_marks_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });
if (!dry && !process.env['SYZYGY_POC_BROWSER']) throw new Error('SYZYGY_POC_BROWSER must name a Chrome: the site and style groups run the browser test');

const PKG = 'packages/polaris-dossier/src';
const APP = 'apps/three-surface-poc/src/polaris-generation';
const MARKS = `${PKG}/code-marks.ts`;
const CHECK = `${PKG}/check.ts`;
const DERIVE = `${PKG}/check-derive.ts`;
const RENDER = `${PKG}/render.ts`;
const SCHEMA = `${PKG}/draft-schema.ts`;
const BRIEF = `${PKG}/brief.ts`;
const SITE = `${APP}/dossier-site.ts`;
const STYLE = `${APP}/dossier-code-frame.ts`;
const PACKET = `${PKG}/review-packet.ts`;
const MEASURE = `${PKG}/rerender-measure.ts`;

const SCENARIOS = `${PKG}/code-marks.test.ts`;
const PAGE = `${APP}/dossier-code-frame.test.ts`;
const BROWSER = `${APP}/code-excerpt.browser.test.ts`;
const TESTS = {
  [MARKS]: [SCENARIOS],
  [CHECK]: [SCENARIOS],
  [DERIVE]: [SCENARIOS],
  [RENDER]: [SCENARIOS],
  [SCHEMA]: [SCENARIOS, `${PKG}/draft-schema.test.ts`],
  [BRIEF]: [`${PKG}/brief.test.ts`],
  [SITE]: [PAGE, SCENARIOS, BROWSER],
  [STYLE]: [BROWSER],
  [PACKET]: [SCENARIOS],
  [MEASURE]: [SCENARIOS],
};
const TIMEOUT_MS = 600_000;

const MUTANTS = [
  // --- the bounds and the published schema
  ['bounds-admit-13', SCHEMA, 'EXCERPT_MARK_BOUNDS = Object.freeze([1, 12] as const);', 'EXCERPT_MARK_BOUNDS = Object.freeze([1, 13] as const);'],
  ['bounds-admit-0', SCHEMA, 'EXCERPT_MARK_BOUNDS = Object.freeze([1, 12] as const);', 'EXCERPT_MARK_BOUNDS = Object.freeze([0, 12] as const);'],
  ['published-schema-unmarked', SCHEMA, 'defs: withExcerptMarks(defs) });', 'defs });'],
  // --- the comparisons
  ['highlight-start-unchecked', MARKS, 'else if (start < s || end > t)', 'else if (end > t)'],
  ['highlight-end-unchecked', MARKS, 'else if (start < s || end > t)', 'else if (start < s)'],
  ['backwards-unchecked', MARKS, "if (start > end) out.push({ kind: 'code-highlight', at: entryAt, detail: CODE_MARK_DETAIL.backwards(k) });\n        else if", "if (false) out.push({ kind: 'code-highlight', at: entryAt, detail: CODE_MARK_DETAIL.backwards(k) });\n        else if"],
  ['overlap-strict', MARKS, "start <= (highlights[k - 1]!['endLine'] as number)", "start < (highlights[k - 1]!['endLine'] as number)"],
  ['overlap-loose', MARKS, "start <= (highlights[k - 1]!['endLine'] as number)", "start <= (highlights[k - 1]!['endLine'] as number) + 1"],
  ['note-low-unchecked', MARKS, 'if (line < s || line > t)', 'if (line > t)'],
  ['note-high-unchecked', MARKS, 'if (line < s || line > t)', 'if (line < s)'],
  ['note-order-strict', MARKS, "line <= (notes[k - 1]!['line'] as number)", "line < (notes[k - 1]!['line'] as number)"],
  ['note-uncited-unchecked', MARKS, "else if (list(paragraph['citations']).length === 0)", 'else if (false)'],
  ['note-resolves-anything', MARKS, 'const paragraph = paragraphs.get(block);', "const paragraph = paragraphs.get(block) ?? { citations: [1] };"],
  ['place-not-tracked', MARKS, 'isRecord(entry) ? entry : undefined, key));', 'undefined, key));'],
  // --- the skips
  ['bad-citation-not-skipped', MARKS, "if (s === undefined || t === undefined || s > t || t - s + 1 > CODE_EXCERPT_MAX_LINES) return undefined;\n  const refused = prior.some((finding) => (finding.kind === 'range-invalid' || finding.kind === 'code-excerpt-too-long') && finding.at === `${at}.citation`);\n  return refused ? undefined : { s, t };",
    'if (s === undefined || t === undefined) return undefined;\n  return { s, t };'],
  ['schema-fault-not-skipping', MARKS, 'sound.set(member, faults.length === 0);', 'sound.set(member, true);'],
  ['schema-path-unmapped', MARKS, '${fault.path.slice(1)}', ''],
  // --- the order
  ['excerpts-reversed', MARKS, "visit(doc, '$', undefined, undefined);\n  return out;", "visit(doc, '$', undefined, undefined);\n  return out.reverse();"],
  // --- versions and readers
  ['strip-nothing', MARKS, "const code = value['kind'] === 'code';", 'const code = false;'],
  ['v2-takes-field-version', MARKS, '|| version === LOCAL_DRAFT_SCHEMA_VERSION_V2 ||', '||'],
  ['findings-in-every-version', MARKS, "  if (!hasExcerptMarkForm(doc['schemaVersion'])) return [];\n  const out: CheckFinding[] = [];", '  const out: CheckFinding[] = [];'],
  ['numbered-in-every-version', MARKS, "  if (!hasExcerptMarkForm(doc['schemaVersion'])) return out;", ''],
  ['check-findings-dropped', CHECK, 'findings.push(...codeMarkFindings(walked, findings));', ''],
  ['check-not-stripped', CHECK, 'doc = withoutCodeMarks(withoutLevels(withoutWalks(doc)));', 'doc = withoutLevels(withoutWalks(doc));'],
  ['field-version-dropped', DERIVE, '      for (const finding of codeMarkFieldVersionFindings(doc)) add(finding);', ''],
  ['field-version-path-not-excused', DERIVE, '      for (const at of codeMarkFieldVersionPaths(doc)) subsectionPaths.add(at);', ''],
  ['render-findings-dropped', RENDER, '  findings.push(...codeMarkFindings(walked, findings));\n', ''],
  ['render-marks-not-passed', RENDER, ', ...(codeMarks.size === 0 ? {} : { codeMarks })', ''],
  ['render-not-stripped', RENDER, 'doc = withoutCodeMarks(withoutLevels(withoutWalks(doc)));', 'doc = withoutLevels(withoutWalks(doc));'],
  ['packet-not-stripped', PACKET, 'withoutCodeMarks(withoutLevels(withoutWalks(withoutFigurePlan(draftDoc))))', 'withoutLevels(withoutWalks(withoutFigurePlan(draftDoc)))'],
  ['measure-not-stripped', MEASURE, 'doc = withoutCodeMarks(withoutLevels(withoutWalks(withoutFigurePlan(doc))));', 'doc = withoutLevels(withoutWalks(withoutFigurePlan(doc)));'],
  ['brief-paragraph-dropped', BRIEF, "    EXCERPT_PARAGRAPH,\n    '',\n", ''],
  ['brief-version-kept', BRIEF, "BRIEF_VERSION = 'polaris-dossier-brief-v26';", "BRIEF_VERSION = 'polaris-dossier-brief-v25';"],
  // --- the markup
  ['number-not-weighted', SITE, "${covered ? ' code-highlighted' : ''}", ''],
  ['note-mark-dropped', SITE, "${note === -1 ? '' : ` <span class=\"code-note-mark\">${note + 1}</span>`}", ''],
  ['unbanded-empty', SITE, ": '<span class=\"code-unbanded\"></span>');", ": '');"],
  ['shown-off-by-one', SITE, 'const shown = (n: number): number => n - s + 1;', 'const shown = (n: number): number => n - s;'],
  ['fallback-dropped', SITE, 'if (CODE_LINE_BREAK_UNCERTAIN.test(text)) return', 'if (false) return'],
  ['bands-not-hidden', SITE, '<pre class="code-bands" aria-hidden="true">', '<pre class="code-bands">'],
  ['gutter-not-hidden', SITE, '<pre class="code-gutter" aria-hidden="true">', '<pre class="code-gutter">'],
  ['bands-without-highlights', SITE, "const banded = marks.highlights.length === 0 ? '' :", 'const banded = false ? \'\' :'],
  ['single-line-as-range', SITE, "${s === t ? `line ${s}` : `lines ${s}–${t}`}", '${`lines ${s}–${t}`}'],
  ['style-on-every-page', SITE, "${codeFramePages.has(path) ? CODE_FRAME_CSS : ''}", '${CODE_FRAME_CSS}'],
  ['style-on-no-page', SITE, "${codeFramePages.has(path) ? CODE_FRAME_CSS : ''}", ''],
  // --- the style rules, against the browser alone
  ['code-laid-out-as-blocks', STYLE, 'pre code{display:inline;', 'pre code{display:block;'],
  ['gutter-padded-otherwise', STYLE, 'pre.code-gutter{grid-area:gutter;position:static;', 'pre.code-gutter{grid-area:gutter;position:static;padding-top:0;'],
  ['gutter-sized-otherwise', STYLE, 'pre.code-gutter{grid-area:gutter;position:static;', 'pre.code-gutter{grid-area:gutter;position:static;font-size:.7rem;'],
  ['bands-in-another-cell', STYLE, '>pre{grid-area:lines;', '>pre{'],
  ['pre-paints-background', STYLE, 'background:none;overflow:visible;', 'background:var(--d-surface-2);overflow:visible;'],
  ['text-under-bands', STYLE, 'white-space:pre;position:relative}', 'white-space:pre;position:static}'],
  ['lines-wrap', STYLE, 'white-space:pre;position:relative}', 'white-space:pre-wrap;position:relative}'],
  ['band-as-wide-as-a-space', STYLE, '.code-band{display:inline-block;width:${tokens.length.full};', '.code-band{display:inline-block;'],
  ['frame-does-not-scroll', STYLE, 'overflow-x:auto;background:var(--d-surface-2)', 'overflow-x:visible;background:var(--d-surface-2)'],
].filter(([id]) => only === null || only.has(id));

// A mutant no test can kill, with the reason; recorded, never run and never counted as killed.
const EQUIVALENT = [
  { id: 'derive-not-stripped', file: DERIVE, old: 'const subject = withoutCodeMarks(withoutLevels(withoutWalks(given)));', new: 'const subject = withoutLevels(withoutWalks(given));',
    reason: 'Both callers that can hand deriveFindings a v18 draft strip its marks first (check.ts and render.ts, each `doc = withoutCodeMarks(withoutLevels(withoutWalks(doc)))` before the call; check-not-stripped and render-not-stripped show both paths run), and the third, verify-text.ts, passes a synthetic subject with no sections. The strip inside deriveFindings is the contract for a later caller.' },
  { id: 'too-long-guard-dropped', file: MARKS, old: '|| s > t || t - s + 1 > CODE_EXCERPT_MAX_LINES) return undefined;', new: '|| s > t) return undefined;',
    reason: 'An excerpt of more than 60 lines always draws code-excerpt-too-long at its citation, which the next line reads, so the length guard and that reading each skip it alone; bad-citation-not-skipped removes both and is killed.' },
  { id: 'refused-dropped', file: MARKS, old: 'return refused ? undefined : { s, t };', new: 'return { s, t };',
    reason: 'range-invalid is drawn exactly where a line is not an integer from 1 or startLine is after endLine (check-derive.ts), and code-excerpt-too-long where the range holds more than 60 lines: the guard above the reading refuses each first. The reading binds the requirement\'s own words; bad-citation-not-skipped removes both and is killed.' },
  { id: 'field-version-in-v18', file: MARKS, old: 'if (hasExcerptMarkForm(version) || version', new: 'if (version',
    reason: 'codeMarkFieldVersionPaths and codeMarkFieldVersionFindings are read only inside deriveFindings, which reads the draft after withoutCodeMarks; in a v18 draft that removes every `highlights` and `notes`, so with the version arm gone the functions still find no member to report.' },
];
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
    if (TESTS[file].includes(BROWSER) && (baseline.perFile[BROWSER]?.passed ?? 0) !== 1) throw new Error(`the browser test did not pass in the baseline for ${file}: ${JSON.stringify(baseline.perFile[BROWSER])}`);
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
