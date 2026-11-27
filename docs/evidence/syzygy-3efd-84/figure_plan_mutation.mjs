// Recorded mutation run over the figure plan, the figure advice and schema v14 (REQ-polaris-generation-034 version 2.33, syzygy-3efd.84).
// Usage: node figure_plan_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files of its group, and restores the
// source in `finally`. `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs.
// Adapted from docs/evidence/syzygy-3efd-37/system_model_mutation.mjs: the same method, these files and mutants.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyAt = args.indexOf('--only');
const only = onlyAt === -1 ? null : new Set(args[onlyAt + 1].split(','));
const [root, out, scratch] = args.filter((arg, i) => !arg.startsWith('--') && (onlyAt === -1 || i !== onlyAt + 1));
if (!root || !out || !scratch) throw new Error('usage: node figure_plan_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });


const PKG = 'packages/polaris-dossier/src';
const FP = `${PKG}/figure-plan.ts`;
const CHECK = `${PKG}/check.ts`;
const DERIVE = `${PKG}/check-derive.ts`;
const SCHEMA = `${PKG}/draft-schema.ts`;
const RENDER = `${PKG}/render.ts`;
const PACKET = `${PKG}/review-packet.ts`;
const BRIEF = `${PKG}/brief.ts`;

const SCENARIOS = `${PKG}/system-model.test.ts`;
const TESTS = {
  [FP]: [`${PKG}/figure-plan.test.ts`],
  [CHECK]: [SCENARIOS],
  [DERIVE]: [SCENARIOS],
  [SCHEMA]: [SCENARIOS, `${PKG}/draft-schema.test.ts`],
  [RENDER]: [SCENARIOS],
  [PACKET]: [`${PKG}/review.test.ts`],
  [BRIEF]: [`${PKG}/brief.test.ts`],
};
const TIMEOUT_MS = 600_000;

const MUTANTS = [
  // --- the plan's form
  ['plan-absent-silent', FP, "if (!Object.hasOwn(doc, FIGURE_PLAN_FIELD)) return [{ kind: 'figure-plan', at: `$.${FIGURE_PLAN_FIELD}`, detail: FIGURE_PLAN_DETAIL.absent }];", "if (!Object.hasOwn(doc, FIGURE_PLAN_FIELD)) return [];"],
  ['plan-not-list-silent', FP, "if (!Array.isArray(plan)) return [{ kind: 'figure-plan', at: `$.${FIGURE_PLAN_FIELD}`, detail: FIGURE_PLAN_DETAIL.notList }];", "if (!Array.isArray(plan)) return [];"],
  ['overview-extra-member', FP, "return exactKeys(home, ['kind']) ? { kind: 'overview' } : undefined;", "return { kind: 'overview' };"],
  ['target-any-type', FP, "exactKeys(home, ['kind', 'target']) && typeof home['target'] === 'string'", "exactKeys(home, ['kind', 'target'])"],
  ['text-length-unbounded', FP, "points.length <= QUESTION_LIMIT", "true"],
  ['text-whitespace-admitted', FP, "points.some((ch) => !isSpace(ch))", "true"],
  ['whitespace-set-narrowed', FP, "(ch >= '\\t' && ch <= '\\r')", "(ch >= '\\t' && ch <= '\\n')"],
  ['omitted-extra-members', FP, "if (exactKeys(value, ['home', 'omitted'])) return", "if (Object.hasOwn(value, 'omitted')) return"],
  ['planned-extra-members', FP, "if (!exactKeys(value, ['home', 'question', 'kind', 'figure'])) return undefined;", "if (!Object.hasOwn(value, 'kind')) return undefined;"],
  ['kind-any', FP, " || !PLAN_FIGURE_KINDS.includes(value['kind'])", ""],
  ['containment-kind-dropped', FP, "[...DIAGRAM_KINDS, ...FIGURE_KINDS, CONTAINMENT_KIND]", "[...DIAGRAM_KINDS, ...FIGURE_KINDS]"],
  // --- the places
  ['target-unresolved-ignored', FP, "const resolved = place.kind === 'overview' || (place.kind === 'section' ? sections : dives).includes(place.target!);", "const resolved = true;"],
  ['dive-target-among-sections', FP, "(place.kind === 'section' ? sections : dives).includes(place.target!)", "[...sections, ...dives].includes(place.target!)"],
  ['second-entry-ignored', FP, "} else if (named.has(placeKey(place))) {", "} else if (false) {"],
  ['place-key-without-kind', FP, "JSON.stringify([place.kind, place.target ?? null])", "JSON.stringify([place.target ?? null])"],
  ['unplanned-silent', FP, "if (named.has(key) || unplanned.has(key)) continue;", "continue;"],
  ['unplanned-dives-first', FP, "...sections.map((target): Place => ({ kind: 'section', target })), ...dives.map((target): Place => ({ kind: 'deep-dive', target }))", "...dives.map((target): Place => ({ kind: 'deep-dive', target })), ...sections.map((target): Place => ({ kind: 'section', target }))"],
  ['plans-any-version', FP, "isRecord(doc) && doc['schemaVersion'] === LOCAL_DRAFT_SCHEMA_VERSION_V14", "isRecord(doc) && typeof doc['schemaVersion'] === 'string'"],
  // --- the planned figure
  ['figure-unresolved-silent', FP, "findings.push({ kind: 'unresolved-reference', at: `${at}.figure`", "if (false) findings.push({ kind: 'unresolved-reference', at: `${at}.figure`"],
  ['home-compare-dropped', FP, "if (resolved && !homed)", "if (false)"],
  ['home-compared-unresolved', FP, "if (resolved && !homed)", "if (!homed)"],
  ['home-target-ignored', FP, "home['kind'] === place.kind && home['target'] === place.target", "home['kind'] === place.kind"],
  ['kind-compare-dropped', FP, "if (diagram['kind'] !== kind) findings.push", "if (false) findings.push"],
  // --- the advice
  ['floor-graph-edges', FP, "records(diagram['edges']).length <= nodes - 1", "records(diagram['edges']).length <= nodes"],
  ['floor-graph-nodes', FP, "return nodes <= 3 &&", "return nodes <= 4 &&"],
  ['floor-swimlane', FP, "records(diagram['steps']).length <= 3", "records(diagram['steps']).length <= 4"],
  ['floor-sequence', FP, "records(diagram['messages']).length <= 2", "records(diagram['messages']).length <= 3"],
  ['floor-containment-top-only', FP, "return groupsInOrder(diagram).length <= 3;", "return records(diagram['groups']).length <= 3;"],
  ['examined-every-disposition', FP, "if (!isRecord(disposition) || disposition['kind'] !== 'produced') return;", "if (!isRecord(disposition)) return;"],
  ['duplicate-any-family', FP, "candidate.figure.family === figure.family && ", ""],
  ['duplicate-boxes-alone', FP, "if (self.drawn) {", "if (true) {"],
  ['duplicate-equal-either-order', FP, " && m < n)", ")"],
  ['duplicate-overlap', FP, "[...self.keys].every((key) => candidate.keys.has(key))", "[...self.keys].some((key) => candidate.keys.has(key))"],
  ['key-carries-edge-label', FP, "if (to !== undefined) add(['arrow', labelKey(from['label']), labelKey(to['label'])]);", "if (to !== undefined) add(['arrow', labelKey(from['label']), labelKey(to['label']), labelKey(link['label'])]);"],
  ['key-nesting-dropped', FP, "if (parent !== undefined) add(['in',", "if (false) add(['in',"],
  ['key-step-as-box', FP, "add(['step', labelKey(from['label']), labelKey(link['label'])]);", "add(['box', labelKey(link['label'])]);"],
  ['label-key-any-letter', FP, "ch >= 'A' && ch <= 'Z' ? ch.toLowerCase() : ch", "ch.toLowerCase()"],
  ['label-key-runs-dropped', FP, "if (run) { out += ' '; run = false; }", "if (run) { run = false; }"],
  ['mixed-any-relation', FP, "if (edge['relation'] !== 'contains' || typeof edge['from']", "if (typeof edge['from']"],
  ['mixed-root-encloses-dependency', FP, " && y['kind'] !== 'dependency-name';", ";"],
  ['mixed-directory-prefix-loose', FP, "y['path'].startsWith(`${x['path']}/`)", "y['path'].startsWith(x['path'])"],
  ['mixed-directory-manifest-dropped', FP, "new Set(['package-manifest', 'workflow-job', 'compose-service'])", "new Set(['workflow-job', 'compose-service'])"],
  ['mixed-ancestor-dropped', FP, "if (at === x) return true;", "if (false) return true;"],
  ['mixed-containment-never-holds', FP, "holds = (x, y) => inside.get(y)?.has(x) === true;", "holds = () => false;"],
  ['mixed-chain-direct-only', FP, "if (!seen.has(next)) { seen.add(next); queue.push(next); }", ""],
  // --- check, render and the packet
  ['check-plan-findings-dropped', CHECK, "if (planned !== undefined) findings.push(...figurePlanFindings(planned));", ""],
  ['check-plan-not-stripped', CHECK, "if (planned !== undefined) doc = withoutFigurePlan(planned);", ""],
  ['check-advice-despite-schema', CHECK, "if (planned !== undefined && !findings.some((finding) => finding.kind === 'schema')) {", "if (planned !== undefined) {"],
  ['check-expansion-v11', CHECK, "planned !== undefined && isRecord(doc) ? { ...viewed.doc, schemaVersion: doc['schemaVersion'] } : viewed.doc", "viewed.doc"],
  ['render-plan-not-stripped', RENDER, "  doc = withoutFigurePlan(doc);\n", ""],
  ['packet-plan-kept', PACKET, "...draftView } = withoutFigurePlan(draftDoc);", "...draftView } = draftDoc;"],
  // --- field-version and the schemas
  ['field-version-plan-dropped', DERIVE, "for (const at of figurePlanFieldVersionPaths(doc)) add({", "for (const at of [] as string[]) add({"],
  ['field-version-plan-schema-kept', DERIVE, "for (const at of figurePlanFieldVersionPaths(doc)) subsectionPaths.add(at);", ""],
  ['field-version-rows-name-v14', DERIVE, "`\\`${QUESTION_KINDS_FIELD}\\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V13}`", "`\\`${QUESTION_KINDS_FIELD}\\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V14}`"],
  ['v14-read-as-v13', DERIVE, "version === LOCAL_DRAFT_SCHEMA_VERSION_V14 ? current : ", ""],
  ['model-form-without-v14', SCHEMA, "version === LOCAL_DRAFT_SCHEMA_VERSION_V12 || version === LOCAL_DRAFT_SCHEMA_VERSION_V14;", "version === LOCAL_DRAFT_SCHEMA_VERSION_V12;"],
  ['worth-knowing-form-without-v14', SCHEMA, "version === LOCAL_DRAFT_SCHEMA_VERSION_V13 || version === LOCAL_DRAFT_SCHEMA_VERSION_V14;", "version === LOCAL_DRAFT_SCHEMA_VERSION_V13;"],
  ['document-plan-dropped', SCHEMA, ", [FIGURE_PLAN_FIELD]: { description: FIGURE_PLAN_DESCRIPTION } }", " }"],
  // --- the migration parity's bound (version 2.41, syzygy-3efd.87 design D5)
  ['model-elements-199', SCHEMA, "elements: [0, 200] as const, relationships: [0, 400] as const", "elements: [0, 199] as const, relationships: [0, 400] as const"],
  ['model-elements-201', SCHEMA, "elements: [0, 200] as const, relationships: [0, 400] as const", "elements: [0, 201] as const, relationships: [0, 400] as const"],
  ['model-relationships-399', SCHEMA, "elements: [0, 200] as const, relationships: [0, 400] as const", "elements: [0, 200] as const, relationships: [0, 399] as const"],
  ['model-relationships-401', SCHEMA, "elements: [0, 200] as const, relationships: [0, 400] as const", "elements: [0, 200] as const, relationships: [0, 401] as const"],
  // --- brief v22
  ['brief-plan-paragraph-dropped', BRIEF, "    FIGURE_PLAN_PARAGRAPH,\n    '',\n", ""],
  ['brief-containment-after-model', BRIEF, "    CONTAINMENT_PARAGRAPH,\n    '',\n    MODEL_PARAGRAPH,\n", "    MODEL_PARAGRAPH,\n    '',\n    CONTAINMENT_PARAGRAPH,\n"],
].filter(([id]) => only === null || only.has(id));

// A mutant no test can kill, with the reason; recorded, never run and never counted as killed.
const EQUIVALENT = [
  { id: 'render-plan-findings-dropped', file: RENDER, old: "  findings.push(...planFindings);\n", new: "",
    reason: 'Render reads only the latest passed revision, whose check reported no plan finding, and verifies those bytes against the digest its check recorded; the plan findings are pure over those bytes, so re-deriving them at render finds none for every draft render accepts. The line keeps render\'s re-derivation the whole of check\'s.' },
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
