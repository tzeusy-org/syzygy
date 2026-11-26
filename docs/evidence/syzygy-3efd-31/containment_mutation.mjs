// Recorded mutation run over the predicates of the containment figure (REQ-polaris-generation-034 version 2.23, syzygy-3efd.31).
// Usage: node containment_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files of its group, and restores the
// source in `finally`. `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs.
// Adapted from docs/evidence/syzygy-3efd-28/relation_types_mutation.mjs: the same method, these files and mutants.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyAt = args.indexOf('--only');
const only = onlyAt === -1 ? null : new Set(args[onlyAt + 1].split(','));
const [root, out, scratch] = args.filter((arg, i) => !arg.startsWith('--') && (onlyAt === -1 || i !== onlyAt + 1));
if (!root || !out || !scratch) throw new Error('usage: node containment_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });

const APP = 'apps/three-surface-poc/src/polaris-generation';
const PKG = 'packages/polaris-dossier/src';
const CONTAIN = `${PKG}/containment.ts`;
const DERIVE = `${PKG}/check-derive.ts`;
const CHECK = `${PKG}/check.ts`;
const SCHEMA = `${PKG}/draft-schema.ts`;
const RENDER = `${PKG}/render.ts`;
const FIT = `${PKG}/figure-fit.ts`;
const REACH = `${PKG}/review-reach.ts`;
const PACKET = `${PKG}/review-packet.ts`;
const BRIEF = `${PKG}/brief.ts`;
const MODEL = 'packages/polaris-generation-core/src/draft-model.ts';
const LAYOUT = `${APP}/diagram-layout.ts`;
const SITE = `${APP}/dossier-site.ts`;

// The test files a mutant of each source runs.
const SCENARIOS = `${PKG}/containment-figure.test.ts`;
const UNIT = `${APP}/containment-layout.test.ts`;
const TESTS = {
  [CONTAIN]: [SCENARIOS],
  [DERIVE]: [SCENARIOS],
  [CHECK]: [SCENARIOS],
  [SCHEMA]: [SCENARIOS, `${PKG}/draft-schema.test.ts`, `${PKG}/figure-fit.test.ts`],
  [RENDER]: [SCENARIOS],
  [FIT]: [`${PKG}/figure-fit.test.ts`, SCENARIOS],
  [REACH]: [SCENARIOS],
  [PACKET]: [SCENARIOS, `${PKG}/review.test.ts`],
  [BRIEF]: [SCENARIOS],
  [MODEL]: [UNIT, SCENARIOS],
  [LAYOUT]: [UNIT, SCENARIOS, `${PKG}/figure-fit.test.ts`],
  [SITE]: [UNIT, SCENARIOS],
};
const TIMEOUT_MS = 600_000;

const MUTANTS = [
  // --- the structural findings, their gate and their order
  ['depth-level-off-by-one', CONTAIN, 'if (level === CONTAINMENT_BOUNDS.levels + 1) depth.push', 'if (level === CONTAINMENT_BOUNDS.levels + 2) depth.push'],
  ['size-bound-loosened', CONTAIN, 'if (groups.length > CONTAINMENT_BOUNDS.total) size.push', 'if (groups.length > CONTAINMENT_BOUNDS.total + 1) size.push'],
  ['flat-every-to-some', CONTAIN, 'if (groups.every(({ level }) => level === 1)) flat.push', 'if (groups.some(({ level }) => level === 1)) flat.push'],
  ['list-fault-ignored', CONTAIN, 'if (!Array.isArray(diagram[GROUPS_FIELD]) || listFault(i, schemaPaths)) continue;', 'if (!Array.isArray(diagram[GROUPS_FIELD])) continue;'],
  ['structural-order-reversed', CONTAIN, 'return [...depth, ...size, ...flat];', 'return [...flat, ...size, ...depth];'],
  ['undecided-ignores-depth', CONTAIN, "kind !== 'figure-kind' && kind !== 'containment-depth' && ", "kind !== 'figure-kind' && "],
  ['undecided-ignores-figure-kind', CONTAIN, "if (kind !== 'figure-kind' && kind !== 'containment-depth'", "if (kind !== 'containment-depth'"],
  // --- field-version in an earlier draft
  ['field-version-kind-dropped', CONTAIN, "...(diagram['kind'] === CONTAINMENT_KIND ? [{ kind: 'field-version' as const", "...(false ? [{ kind: 'field-version' as const"],
  ['field-version-groups-dropped', CONTAIN, '...(Object.hasOwn(diagram, GROUPS_FIELD) ? [', '...(false ? ['],
  ['field-version-ungated', CONTAIN, "if (!precedesContainment(doc['schemaVersion'])) return [];\n  return list(doc['diagrams']).flatMap((diagram, i): CheckFinding[] => {", "return list(doc['diagrams']).flatMap((diagram, i): CheckFinding[] => {"],
  ['field-version-paths-not-reported', DERIVE, 'for (const at of containmentFieldVersionPaths(doc)) subsectionPaths.add(at);', ''],
  // --- the schema
  ['schema-groups-bound', SCHEMA, 'groups: [1, 5] as const', 'groups: [1, 6] as const'],
  ['schema-children-bound', SCHEMA, 'children: [0, 8] as const', 'children: [0, 9] as const'],
  ['schema-total-bound', SCHEMA, 'total: 40, levels: 3', 'total: 41, levels: 3'],
  ['schema-enum-names-v11', SCHEMA, "choice(containment === 'taken' ? LOCAL_DRAFT_SCHEMA_VERSIONS : NAMED_SCHEMA_VERSIONS)", 'choice(LOCAL_DRAFT_SCHEMA_VERSIONS)'],
  ['members-unversioned', SCHEMA, 'kind === CONTAINMENT_KIND && hasContainmentForm(version) ? [GROUPS_FIELD]', 'kind === CONTAINMENT_KIND ? [GROUPS_FIELD]'],
  ['figure-members-without-groups', SCHEMA, '(hasContainmentForm(version) ? [...FIGURE_MEMBERS, GROUPS_FIELD] : FIGURE_MEMBERS)', '(FIGURE_MEMBERS)'],
  ['precedes-takes-v13', SCHEMA, 'boolean => !hasContainmentForm(version) && !hasWorthKnowingForm(version)', 'boolean => !hasContainmentForm(version)'],
  ['hero-form-without-v11', SCHEMA, 'version === LOCAL_DRAFT_SCHEMA_VERSION_V10 || hasContainmentForm(version) || hasWorthKnowingForm(version)', 'version === LOCAL_DRAFT_SCHEMA_VERSION_V10 || hasWorthKnowingForm(version)'],
  ['group-unit-required', SCHEMA, "...CONTAINMENT_BOUNDS.children), unit: ref('unit') }, ['unit'])", "...CONTAINMENT_BOUNDS.children), unit: ref('unit') })"],
  ['draft-rules-v11-as-v10', DERIVE, 'hasContainmentForm(version) ? v11 : ', ''],
  // --- figure-kind and the graph walk
  ['graph-takes-containment', DERIVE, "\n    && !(hasContainmentForm(doc['schemaVersion']) && diagram['kind'] === CONTAINMENT_KIND));", ');'],
  ['group-units-unbounded', DERIVE, 'for (const { diagram, i } of containmentDiagrams(doc)) for (const { group, at } of groupsOf(diagram, i)) bounded(group, at);', ''],
  // --- unit-reference and the nestings
  ['group-unit-level-gate-loosened', DERIVE, 'level > CONTAINMENT_BOUNDS.levels ? undefined', 'level > CONTAINMENT_BOUNDS.levels + 1 ? undefined'],
  ['undecided-gate-dropped', DERIVE, "|| undecided.has(i)) continue;", ') continue;'],
  ['withheld-parent-asserted', DERIVE, 'asserted: asserted(group) && !withheld(parent.group)', 'asserted: asserted(group)'],
  ['nesting-relation-swapped', DERIVE, "relation: 'contains', from: ends.get(parent.group)", "relation: 'depends-on', from: ends.get(parent.group)"],
  ['nesting-direction-reversed', DERIVE, 'from: ends.get(parent.group), to: ends.get(group) }', 'from: ends.get(group), to: ends.get(parent.group) }'],
  ['nesting-unknown-reported', DERIVE, "diagramName, decision }): CheckFinding[] => (decision.state !== 'challenged' ? []", "diagramName, decision }): CheckFinding[] => (decision.state === 'witnessed' ? []"],
  // --- check's wiring
  ['schema-fault-keeps-nestings', CHECK, 'containmentDecisions = schemaFault ? { ...decisions, nestings: [] } : decisions;', 'containmentDecisions = decisions;'],
  ['undecided-without-structural', CHECK, 'undecidedContainments([...findings, ...containmentStructuralFindings(doc, new Set())])', 'undecidedContainments(findings)'],
  ['relation-before-structural', CHECK, 'applyContainmentFindings(doc, findings);\n    if (containmentDecisions !== undefined) findings.push(...containmentRelationFindings(containmentDecisions));',
    'if (containmentDecisions !== undefined) findings.push(...containmentRelationFindings(containmentDecisions));\n    applyContainmentFindings(doc, findings);'],
  // --- render
  ['render-skips-structural', RENDER, '  applyContainmentFindings(doc, findings);\n', '\n'],
  ['render-drops-nestings', RENDER, '...decisions.nestings.map(({ id, decision })', '...[].map(({ id, decision })'],
  ['render-ignores-withheld', RENDER, "}, (element) => withheld.has(text(element['id']) ?? ''));", '}, () => false);'],
  // --- review
  ['reach-skips-groups', REACH, "for (const { group, at } of groupsOf(diagram, i)) element(at, 'diagram-node', group);", ''],
  ['packet-skips-group-units', PACKET, 'kind === GROUPS_FIELD ? groupsOf(diagram, i).map(({ group }) => group) : []', '[]'],
  // --- figure fit
  ['fit-leaf-list-faults', FIT, 'if (level > CONTAINMENT_BOUNDS.levels && values.length > 0)', 'if (level > CONTAINMENT_BOUNDS.levels)'],
  ['fit-flat-fits', FIT, 'return fault || !nested || total > CONTAINMENT_BOUNDS.total ?', 'return fault || total > CONTAINMENT_BOUNDS.total ?'],
  ['fit-containment-unkinded', FIT, " || (hasContainmentForm(version) && diagram['kind'] === CONTAINMENT_KIND))", ')'],
  // --- the brief paragraph
  ['brief-paragraph-word', BRIEF, 'Use it to show parts inside parts', 'Use it to show parts within parts'],
  // --- the Mermaid source
  ['mermaid-indent-flat', MODEL, "pad = '  '.repeat(level)", "pad = '  '"],
  ['mermaid-leaf-as-subgraph', MODEL, 'if (group.children.length === 0) {\n      lines.push(`${pad}${name}["${figureLabel(group)}"]`);', 'if (group.children.length === 0) {\n      lines.push(`${pad}subgraph ${name}["${figureLabel(group)}"]`);'],
  // --- the layout
  ['layout-leaf-height', LAYOUT, 'const CONTAINMENT_LEAF = 48;', 'const CONTAINMENT_LEAF = 52;'],
  ['layout-head', LAYOUT, 'const CONTAINMENT_HEAD = 40;', 'const CONTAINMENT_HEAD = 36;'],
  ['layout-gap', LAYOUT, 'const CONTAINMENT_GAP = 8;', 'const CONTAINMENT_GAP = 12;'],
  ['layout-foot', LAYOUT, 'const CONTAINMENT_FOOT = 12;', 'const CONTAINMENT_FOOT = 8;'],
  ['layout-indent', LAYOUT, 'const CONTAINMENT_INDENT = 12;', 'const CONTAINMENT_INDENT = 16;'],
  ['layout-narrowing', LAYOUT, 'const CONTAINMENT_NARROWING = 24;', 'const CONTAINMENT_NARROWING = 20;'],
  ['layout-chars', LAYOUT, 'const CONTAINMENT_CHARS = [19, 16, 13] as const;', 'const CONTAINMENT_CHARS = [19, 16, 16] as const;'],
  ['layout-total-bound', LAYOUT, 'if (seen.size > 40 || levels < 2)', 'if (seen.size > 41 || levels < 2)'],
  ['layout-flat-allowed', LAYOUT, 'if (seen.size > 40 || levels < 2)', 'if (seen.size > 40)'],
  ['layout-depth-bound', LAYOUT, 'if (level > 3 || group.children.length > 8)', 'if (level > 4 || group.children.length > 8)'],
  ['layout-height-margin', LAYOUT, 'height: 48 + tallest', 'height: 40 + tallest'],
  // --- the page
  ['css-mixed-without-queries', SITE, 'return stepper ? `${FIGURE_KINDS_CSS}${CONTAINMENT_OUTLINE_CSS}${CONTAINMENT_QUERY_CSS}`', 'return stepper ? `${FIGURE_KINDS_CSS}${CONTAINMENT_OUTLINE_CSS}`'],
  ['css-stepper-always', SITE, "if (!containment) return stepper ? FIGURE_KINDS_CSS : '';", 'if (!containment) return FIGURE_KINDS_CSS;'],
  ['css-containment-adds-stepper', SITE, 'containmentPages.add(from);', 'containmentPages.add(from); figurePages.add(from);'],
  ['site-parent-words', SITE, '` (in ${escape(parent.label)})`', '` (inside ${escape(parent.label)})`'],
  ['site-tally-nestings', SITE, "` ${counted(witnesses, 'nesting', 'nestings')} witnessed by Syzygy.</p>`", "` ${counted(witnesses, 'nesting', 'nestings')} witnessed.</p>`"],
  ['site-outline-unknown-mark', SITE, "${group.epistemic === 'unknown' ? ' ?' : ''}${group.children.length === 0", "${group.children.length === 0"],
  ['site-structure-witness-dropped', SITE, 'witness: relationOf(group.id)?.witness ?? null', 'witness: null'],
].filter(([id]) => only === null || only.has(id));

// A mutant no test can kill, with the reason; recorded, never run and never counted as killed.
const EQUIVALENT = [];

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
