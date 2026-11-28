// Recorded mutation run over the derived-base views (REQ-polaris-generation-034 version 2.35, syzygy-3efd.38).
// Usage: node derived_base_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files of its group, and restores the
// source in `finally`. `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs.
// Adapted from docs/evidence/syzygy-3efd-84/figure_plan_mutation.mjs: the same method, these files and mutants.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyAt = args.indexOf('--only');
const only = onlyAt === -1 ? null : new Set(args[onlyAt + 1].split(','));
const [root, out, scratch] = args.filter((arg, i) => !arg.startsWith('--') && (onlyAt === -1 || i !== onlyAt + 1));
if (!root || !out || !scratch) throw new Error('usage: node derived_base_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });

const PKG = 'packages/polaris-dossier/src';
const APP = 'apps/three-surface-poc/src/polaris-generation';
const BASE = `${PKG}/derived-base.ts`;
const DERIVE = `${PKG}/check-derive.ts`;
const SCHEMA = `${PKG}/draft-schema.ts`;
const CHECK = `${PKG}/check.ts`;
const FP = `${PKG}/figure-plan.ts`;
const MODEL = `${PKG}/system-model.ts`;
const BRIEF = `${PKG}/brief.ts`;
const SITE = `${APP}/dossier-site.ts`;
const PAGE = `${APP}/dossier-base.ts`;
const LAYOUT = `${APP}/diagram-layout.ts`;

const SCENARIOS = `${PKG}/derived-base.test.ts`;
const TESTS = {
  [BASE]: [SCENARIOS],
  [DERIVE]: [SCENARIOS],
  [SCHEMA]: [SCENARIOS],
  [CHECK]: [SCENARIOS],
  [FP]: [SCENARIOS],
  [MODEL]: [SCENARIOS],
  [BRIEF]: [`${PKG}/brief.test.ts`],
  [SITE]: [SCENARIOS],
  [PAGE]: [`${APP}/dossier-base.test.ts`, SCENARIOS],
  [LAYOUT]: [SCENARIOS],
};
const TIMEOUT_MS = 600_000;

const MUTANTS = [
  // --- the base's form (schema)
  ['select-without-rest-admitted', BASE, "if (Object.hasOwn(base, 'select') && !Object.hasOwn(base, 'restReason')) out.push(", "if (false) out.push("],
  ['rest-without-select-admitted', BASE, "if (Object.hasOwn(base, 'restReason') && !Object.hasOwn(base, 'select')) out.push(", "if (false) out.push("],
  ['field-version-v14-silent', BASE, "`${name}: \\`${BASE_FIELD}\\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V15}`", "`${name}: \\`${BASE_FIELD}\\` is not supported`"],
  ['field-version-not-emitted', DERIVE, "for (const finding of baseFieldVersionFindings(doc, inputs === undefined ? () => 'unavailable' : admitOf(inputs.screen))) add(finding);", ""],
  ['base-form-v14', SCHEMA, "export const hasBaseForm = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION_V15;", "export const hasBaseForm = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION_V14;"],
  ['worth-knowing-not-v15', SCHEMA, "hasWorthKnowingForm = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION_V13 || version === LOCAL_DRAFT_SCHEMA_VERSION_V14\n  || version === LOCAL_DRAFT_SCHEMA_VERSION_V15;", "hasWorthKnowingForm = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION_V13 || version === LOCAL_DRAFT_SCHEMA_VERSION_V14;"],
  ['source-example-not-v15', CHECK, " && version !== 'polaris-dossier-local-draft-v15') return;", ") return;"],
  // --- the paths
  ['root-path-any', BASE, "const at = path === '.' ? map.elements.findIndex((element) => element.root === true)", "const at = path === '' ? map.elements.findIndex((element) => element.root === true)"],
  ['manifest-path-first-only', BASE, "return map.elements.flatMap((element, i) => (element.manifest === path ? [i] : []));", "{ const i = map.elements.findIndex((element) => element.manifest === path); return i === -1 ? [] : [i]; }"],
  // --- the findings
  ['reference-absent-silent', BASE, "    if (named.length === 0) {\n      return { kind: 'base-reference'", "    if (false) {\n      return { kind: 'base-reference'"],
  ['reference-detail-unscreened', BASE, "`${owner}: ${entry.path} names no element of the ${mapWord} map at this revision`, BASE_REFERENCE_UNAVAILABLE, evidence) };", "`${owner}: ${entry.path} names no element of the ${mapWord} map at this revision`, `${owner}: ${entry.path} names no element of the ${mapWord} map at this revision`, evidence) };"],
  ['conflict-repeat-ignored', BASE, "if (repeated || unshown) findings.push(conflict(entry));", "if (repeated) findings.push(conflict(entry));"],
  ['conflict-across-lists', BASE, "const repeated = named.some((k) => seen[entry.list].has(k));", "const repeated = false;"],
  ['root-select-ignored', BASE, "if (base.select !== undefined && !base.select.some((path) => resolveBasePath(map, path).includes(root))) findings.push(", "if (false) findings.push("],
  ['group-third-level', BASE, "if (level === undefined || level > 2) {", "if (level === undefined || level > 3) {"],
  ['group-unselected', BASE, "if (level === undefined || level > 2) {", "if (level !== undefined && level > 2) {"],
  ['size-bound-60', BASE, "if (boxes === 0 || boxes > BASE_BOUNDS.boxes) {", "if (boxes === 0 || boxes > 60) {"],
  ['label-case-kept', BASE, "return (trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed).toLowerCase(); };", "return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed; };"],
  ['label-trim-dropped', BASE, "export const labelKey = (value: string): string => { const trimmed = value.trim();", "export const labelKey = (value: string): string => { const trimmed = value;"],
  ['label-contains-ignored', BASE, "if (label !== undefined && labelKey(label) === 'contains') findings.push(", "if (false) findings.push("],
  ['label-element-ignored', BASE, "if (label !== undefined && baseNames.has(labelKey(label))) findings.push(", "if (false) findings.push("],
  // --- the render
  ['reason-withheld-drawn', BASE, "if (screened.includes('withheld')) { refused.set(i, BASE_REASON_WITHHELD); return; }", ""],
  ['figure-advice-reads-base', FP, "    if (carriesBase(source)) return;\n", ""],
  ['chip-hidden-count', PAGE, "const hidden = base.total - base.shown;", "const hidden = base.total;"],
  ['chip-not-listed-dropped', PAGE, "return `<p class=\"base-chip\" data-visual-provenance=\"computed\">${head}${notListedSentence(base)}</p>`;", "return `<p class=\"base-chip\" data-visual-provenance=\"computed\">${head}</p>`;"],
  ['chip-href-flat', PAGE, "`${'../'.repeat(from.split('/').length - 1)}maps/", "`maps/"],
  ['hidden-twelve-names', PAGE, "const NAMES_LISTED = 12;", "const NAMES_LISTED = 13;"],
  ['hidden-reason-unescaped', PAGE, "This dossier's reason: ${escape(item.reason)}</li>", "This dossier's reason: ${item.reason}</li>"],
  ['notice-unknown-words', PAGE, "which is Unknown at this render: ${escape(unknown.words)}. ${see}", "which is Unknown at this render. ${see}"],
  ['machine-unknown-extra', PAGE, "return { map: base.map, established: false, reason: base.state === 'unknown' ? unknownReason : 'source-uncaptured-or-unreachable' };", "return { map: base.map, established: false, reason: unknownReason, shown: 0 };"],
  ['tally-base-marks', PAGE, "${count('observed')} observed, ${count('inferred')} inferred, ${count('unknown')} unknown.`;\n}", "${count('inferred')} observed, ${count('observed')} inferred, ${count('unknown')} unknown.`;\n}"],
  ['outline-syzygy-dropped', SITE, "${isBase(group.id) ? 'Syzygy: ' : ''}", ""],
  ['called-claim-dropped', SITE, "const called = name === undefined ? '' : ` ${claim('span', name.id, name.epistemic,", "const called = true ? '' : ` ${claim('span', name.id, name.epistemic,"],
  ['provenance-derived-as-authored', SITE, "nodes: d.nodes.map(n => ({ id: n.id, provenance: isBase(n.id) ? 'derived' : 'authored' }))", "nodes: d.nodes.map(n => ({ id: n.id, provenance: 'authored' }))"],
  ['chip-not-drawn', SITE, "const baseMap = drawnBase === undefined ? '' : ` data-base-map=\"${drawnBase.map}\"`, chip = drawnBase === undefined ? '' : baseChip(drawnBase, from);", "const baseMap = drawnBase === undefined ? '' : ` data-base-map=\"${drawnBase.map}\"`, chip = '';"],
  ['double-border-dropped', LAYOUT, "const inner = decoration?.double === true ? doubleRect(at.x, at.y, nodeWidth, NODE_HEIGHT) : '';", "const inner = '';"],
  ['called-line-dropped', LAYOUT, "const called = decoration?.called === undefined ? '' : calledLine(decoration.called, at.x + nodeWidth / 2, at.y + NODE_HEIGHT + 16, escape);", "const called = '';"],
  ['brief-paragraph-dropped', BRIEF, "    DERIVED_BASE_PARAGRAPH,\n", ""],
].filter(([id]) => only === null || only.has(id));

// A mutant no test can kill, with the reason; recorded, never run and never counted as killed.
const EQUIVALENT = [
  { id: 'numbered-leading-zero', file: BASE, old: "/^[1-9]\\d*$/u.test(numbered[2]!)", new: "/^\\d+$/u.test(numbered[2]!)",
    reason: 'A numbered path resolves only where it equals an element path, and the unit map writes every element path with k from 1 and no leading zero, so `#0` and `#02` name nothing with or without the digit test. Run 1 of this record (36 of 39 killed) recorded it as surviving; the test is kept as a statement of the rule.' },
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
    record.baselines.push({ file, exitCode: baseline.code, tests: baseline.total, failedTests: baseline.failedTests });
    if (baseline.code !== 0) throw new Error(`the baseline for ${file} fails: ${baseline.failedTests.join('; ')}`);
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
