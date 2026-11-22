// Recorded mutation run over the new predicates of the index-and-task-routes change (syzygy-5dhm.70, syzygy-5dhm.71).
// Usage: node index_and_task_routes_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files of its group, and restores the
// source in `finally`. `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyAt = args.indexOf('--only');
const only = onlyAt === -1 ? null : new Set(args[onlyAt + 1].split(','));
const [root, out, scratch] = args.filter((arg, i) => !arg.startsWith('--') && (onlyAt === -1 || i !== onlyAt + 1));
if (!root || !out || !scratch) throw new Error('usage: node index_and_task_routes_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });

const APP = 'apps/three-surface-poc/src/polaris-generation';
const PKG = 'packages/polaris-dossier/src';
const FINDING = `${APP}/dossier-finding.ts`;
const SITE = `${APP}/dossier-site.ts`;
const DERIVE = `${PKG}/check-derive.ts`;
const SCHEMA = `${PKG}/draft-schema.ts`;
const RENDER = `${PKG}/render.ts`;
const BRIEF = `${PKG}/brief.ts`;
const COVERAGE = `${PKG}/inventory-coverage.ts`;

// The test files a mutant of each source runs.
const SITE_TESTS = [`${APP}/dossier-finding.test.ts`, `${APP}/figure-kinds.test.ts`, `${APP}/dossier-reading.test.ts`, `${APP}/dossier-derived-region.test.ts`, `${APP}/dossier-render-provider-golden.test.ts`, `${PKG}/render.test.ts`];
const TESTS = {
  [FINDING]: SITE_TESTS,
  [SITE]: SITE_TESTS,
  [DERIVE]: [`${PKG}/check.test.ts`, `${PKG}/inventory-coverage.test.ts`],
  [COVERAGE]: [`${PKG}/inventory-coverage.test.ts`, `${PKG}/check.test.ts`],
  [SCHEMA]: [`${PKG}/draft-schema.test.ts`, `${PKG}/check.test.ts`, `${PKG}/brief.test.ts`],
  [RENDER]: [`${PKG}/render.test.ts`],
  [BRIEF]: [`${PKG}/brief.test.ts`],
};
const TIMEOUT_MS = 600_000;

const MUTANTS = [
  // --- the index: what counts as an identifier
  ['identifier-one-character', FINDING, 'length >= 2 && length <= 80', 'length >= 1 && length <= 80'],
  ['identifier-81-characters', FINDING, 'length >= 2 && length <= 80', 'length >= 2 && length <= 81'],
  ['identifier-with-white-space', FINDING, ' && !/\\s/u.test(span)', ''],
  ['identifier-without-letter', FINDING, ' && /\\p{L}/u.test(span)', ''],
  ['identifier-assignment', FINDING, ' && !span.includes(\'=\')', ''],
  ['identifier-common-word', FINDING, ' && !COMMON_WORDS.has(span)', ''],
  ['identifier-from-quotation', FINDING, 'new Set(identifiersIn(block.prose))', 'new Set(identifiersIn(shown(block)))'],
  ['identifier-already-path-or-unit', FINDING, '!taken.has(span) && ', ''],
  ['identifier-already-term', FINDING, ' && !termNames.has(span.toLowerCase())', ''],
  ['identifier-secret-span-listed', FINDING, 'for (const span of input.unindexed ?? []) taken.add(span);', ''],
  // --- the index: how a name is matched
  ['term-case-sensitive', FINDING, ')s?(?![${WORD}])`, \'iu\')', ')s?(?![${WORD}])`, \'u\')'],
  ['term-no-plural', FINDING, ')s?(?![${WORD}])`, \'iu\')', ')(?![${WORD}])`, \'iu\')'],
  ['term-inside-a-word', FINDING, '`(?<![${WORD}])(?:${forms.map(quoteRegex).join(\'|\')})', '`(?:${forms.map(quoteRegex).join(\'|\')})'],
  ['term-no-spaced-form', FINDING, 'new Set([term.name, term.name.replace(/-/gu, \' \')])', 'new Set([term.name])'],
  ['title-any-case', FINDING, '${quoteRegex(title)}(?![${WORD}])`, \'u\')', '${quoteRegex(title)}(?![${WORD}])`, \'iu\')'],
  ['path-as-tail-of-longer', FINDING, '`(?<![${WORD}./-])${quoteRegex(path)}', '`${quoteRegex(path)}'],
  ['path-as-head-of-longer', FINDING, '${quoteRegex(path)}(?![${WORD}/-]|\\\\.[${WORD}])`', '${quoteRegex(path)}`'],
  ['unit-without-slash', FINDING, '${quoteRegex(unit)}/`', '${quoteRegex(unit)}`'],
  ['path-cited-not-counted', FINDING, 'block.sourceIds.some((id) => ids.has(id)) || ', ''],
  ['path-written-not-counted', FINDING, 'ids.has(id)) || pattern.test(shown(block)));', 'ids.has(id)));'],
  ['path-collapsed-at-24', FINDING, 'blocks.length > PATH_LINK_MAX ? {', 'blocks.length >= PATH_LINK_MAX ? {'],
  ['path-never-collapsed', FINDING, 'blocks.length > PATH_LINK_MAX ? {', 'false ? {'],
  ['collapsed-count-not-drawn', FINDING, 'entry.namedBy !== undefined ? ` <span class="index-many">', 'false ? ` <span class="index-many">'],
  ['path-no-block-listed', FINDING, 'if (blocks.length === 0) continue;', ''],
  ['figure-repeating-list-dropped', FINDING, 'pattern.test(shown(block)), figure.repeatedBy)', 'pattern.test(shown(block)))'],
  // --- the index: places, counts and words
  ['place-listed-twice', FINDING, 'if (seen.has(key) || !names(block)) continue;', 'if (!names(block)) continue;'],
  ['place-never-numbered', FINDING, 'label: nth === 1 ? block.label : ', 'label: true ? block.label : '],
  ['link-count-without-homes', FINDING, '(entry.home === null ? 0 : 1) + entry.blocks.length', 'entry.blocks.length'],
  ['unnamed-says-nothing', FINDING, 'entry.blocks.length === 0 ? \' <span class="index-unnamed">', 'false ? \' <span class="index-unnamed">'],
  ['withheld-layer-words', FINDING, 'agentNames || kind === \'unit\' ? KIND_EMPTY[kind]', 'true ? KIND_EMPTY[kind]'],
  // --- the site: fragment identities
  ['block-id-inside-fold', SITE, 'return fold === null ? ` id="block-${escape(p.id)}"` : \'\';', 'return ` id="block-${escape(p.id)}"`;'],
  ['folded-block-linked-directly', SITE, 'fragment: fold ?? `block-${p.id}`, label: place', 'fragment: `block-${p.id}`, label: place'],
  ['withheld-block-indexed', SITE, 'if (b.withheld === undefined && b.secretMatched !== true) {\n      const texts', 'if (b.secretMatched !== true) {\n      const texts'],
  ['secret-matched-block-indexed', SITE, 'if (b.withheld === undefined && b.secretMatched !== true) {\n      const texts', 'if (b.withheld === undefined) {\n      const texts'],
  ['inner-fold-wins', SITE, 'fold = outer ?? `element-${elementId}`;', 'fold = `element-${elementId}`;'],
  ['repeating-list-inner-target', SITE, 'target: { page: from, fragment: fold ?? `element-${id}`, label: place }', 'target: { page: from, fragment: `element-${id}`, label: place }'],
  ['graph-figure-no-id', SITE, '${curated}${local === undefined ? \'\' : ` id="figure-${escape(d.id)}"`}><figcaption', '${curated}><figcaption'],
  ['graph-figure-id-in-provider-mode', SITE, '${curated}${local === undefined ? \'\' : ` id="figure-${escape(d.id)}"`}><figcaption', '${curated}${` id="figure-${escape(d.id)}"`}><figcaption'],
  ['sequence-figure-no-id', SITE, 'data-figure-kind="${figure.kind}"${local === undefined ? \'\' : ` id="figure-${escape(d.id)}"`}>', 'data-figure-kind="${figure.kind}">'],
  // --- the site: the two pages
  ['nav-link-in-provider-mode', SITE, '${local === undefined ? \'\' : `<li><a href="${href(from, FIND_BY_TASK_PAGE)}">Find by task</a></li>`}', '${`<li><a href="${href(from, FIND_BY_TASK_PAGE)}">Find by task</a></li>`}'],
  ['routes-shown-while-withheld', SITE, 'const routes = withheld ? [] : local.taskRoutes ?? [];', 'const routes = local.taskRoutes ?? [];'],
  ['machine-routes-while-withheld', SITE, 'taskRoutes: (withheld ? [] : local.taskRoutes ?? []).map(', 'taskRoutes: (local.taskRoutes ?? []).map('],
  ['terms-indexed-while-withheld', SITE, 'terms: withheld ? [] : local.glossary.map(term => ({ id: term.id, name:', 'terms: local.glossary.map(term => ({ id: term.id, name:'],
  ['withheld-step-shows-its-file', SITE, 'return own?.withheld === undefined && own?.secretMatched !== true; };', 'return own?.secretMatched !== true; };'],
  ['secret-matched-step-shows-its-file', SITE, 'return own?.withheld === undefined && own?.secretMatched !== true; };', 'return own?.withheld === undefined; };'],
  ['one-route-says-tasks', SITE, "routes.length === 1 ? '1 task' : ", "false ? '1 task' : "],
  ['file-once-per-piece', SITE, 'const files = [...new Set(cited.map(piece => piece.path))].map(path => {', 'const files = cited.map(piece => piece.path).map(path => {'],
  ['no-routes-sentence-dropped', SITE, ': routes.length === 0 ? `<p class="no-routes" data-task-routes="none">', ': false ? `<p class="no-routes" data-task-routes="none">'],
  ['withheld-routes-sentence-dropped', SITE, 'const body = withheld ? `<p class="no-routes" data-task-routes="withheld">', 'const body = false ? `<p class="no-routes" data-task-routes="withheld">'],
  ['index-in-drawing-order', SITE, 'blocks: [0, 1, 2, 3].flatMap(stage => indexed.filter(block => block.rank === stage)),', 'blocks: indexed,'],
  ['units-never-listed', SITE, 'units: local.derivedStructure?.state === \'derived\' ? local.derivedStructure.facts', 'units: local.derivedStructure?.state === \'never\' ? local.derivedStructure.facts'],
  ['units-whatever-their-marking', SITE, "fact.fact === 'top-level-unit' && fact.epistemic === 'observed' ? [fact.path]", "fact.fact === 'top-level-unit' ? [fact.path]"],
  ['index-style-on-every-page', SITE, '${path === FIND_BY_TASK_PAGE || path === NAME_INDEX_PAGE ? FINDING_CSS : \'\'}', '${FINDING_CSS}'],
  // --- check: a route step is a claim block
  ['step-not-collected', DERIVE, '  routeSteps(doc, (step, at) => out.push({ ...claim(at, step), allowed: [\'inferred\'] }));\n', ''],
  ['step-any-label', DERIVE, '...claim(at, step), allowed: [\'inferred\'] }));', '...claim(at, step), allowed: [\'inferred\', \'unknown\', \'non-normative\'] }));'],
  ['field-version-never', DERIVE, 'if ((PRE_V5_SCHEMA_VERSIONS as readonly unknown[]).includes(doc[\'schemaVersion\'])) add({ kind: \'field-version\', at: `$.${TASK_ROUTE_FIELD}`', 'if (false) add({ kind: \'field-version\', at: `$.${TASK_ROUTE_FIELD}`'],
  ['field-version-v4-only', DERIVE, 'if ((PRE_V5_SCHEMA_VERSIONS as readonly unknown[]).includes(doc[\'schemaVersion\'])) add({ kind: \'field-version\', at: `$.${TASK_ROUTE_FIELD}`', 'if (([LOCAL_DRAFT_SCHEMA_VERSION_V4] as readonly unknown[]).includes(doc[\'schemaVersion\'])) add({ kind: \'field-version\', at: `$.${TASK_ROUTE_FIELD}`'],
  ['see-never-resolved', DERIVE, 'if (!(kind === \'section\' ? sectionIds : diveIds).has(target)) add(', 'if (false) add('],
  ['see-either-kind', DERIVE, 'if (!(kind === \'section\' ? sectionIds : diveIds).has(target)) add(', 'if (!(sectionIds.has(target) || diveIds.has(target))) add('],
  ['task-label-unchecked', DERIVE, 'if (isRecord(route) && typeof route[\'task\'] === \'string\') out.push({ at: `$.${TASK_ROUTE_FIELD}[${i}].task`, value: route[\'task\'] });', ''],
  // --- the schema: bounds and forms
  ['seven-routes', SCHEMA, 'export const TASK_ROUTE_MIN = 8;', 'export const TASK_ROUTE_MIN = 7;'],
  ['sixteen-routes', SCHEMA, 'export const TASK_ROUTE_MAX = 15;', 'export const TASK_ROUTE_MAX = 16;'],
  ['nine-steps', SCHEMA, 'export const TASK_ROUTE_STEP_MAX = 8;', 'export const TASK_ROUTE_STEP_MAX = 9;'],
  ['no-step', SCHEMA, 'steps: list(ref(\'routeStep\'), 1, TASK_ROUTE_STEP_MAX)', 'steps: list(ref(\'routeStep\'), 0, TASK_ROUTE_STEP_MAX)'],
  ['step-without-citation', SCHEMA, 'basis: one(\'source\'), text, citations: citations(1), quotations: quotationRefs(QUOTATION_FORM),\n    see:', 'basis: one(\'source\'), text, citations: citations(0), quotations: quotationRefs(QUOTATION_FORM),\n    see:'],
  ['routes-required', SCHEMA, '}, [\'poles\', \'whySection\', \'inventoryOmissions\', TASK_ROUTE_FIELD]) };', '}, [\'poles\', \'whySection\', \'inventoryOmissions\']) };'],
  ['see-required', SCHEMA, 'target: handle }) }, [\'see\']),', 'target: handle }) }, []),'],
  // --- the whole chain
  ['secret-span-not-reported', RENDER, "if (screen.screenPath(span) === 'secret-detector-match') unindexedNames.add(span);", 'if (false) unindexedNames.add(span);'],
  ['secret-span-paired-over-whole-text', RENDER, "for (const part of segments) if (part.kind === 'prose') for (const span of backtickSpans(part.text)) if", 'for (const span of backtickSpans(prose)) if'],
  ['secret-match-not-carried', RENDER, 'const matched = secret ? { secretMatched: true as const } : {};', 'const matched = {};'],
  ['see-always-section', RENDER, 'see[\'kind\'] === \'deep-dive\' ? \'deep-dive\' as const : \'section\' as const', '\'section\' as const'],
  // --- the inventory-coverage rule, version 2: a route step is reading content
  ['route-citations-not-reading-content', COVERAGE, '|unresolved|taskRoutes)(?:$|[.[])/u;', '|unresolved)(?:$|[.[])/u;'],
  ['coverage-rule-version-kept', COVERAGE, 'id: \'overlap-or-path-named\', version: 2 } as const', 'id: \'overlap-or-path-named\', version: 1 } as const'],
  // --- the brief
  ['brief-section-dropped', BRIEF, '    \'## Task routes\',\n    \'\',\n    TASK_ROUTES_RULE,\n    \'\',\n', ''],
  ['brief-version-kept', BRIEF, 'export const BRIEF_VERSION = \'polaris-dossier-brief-v13\';', 'export const BRIEF_VERSION = \'polaris-dossier-brief-v12\';'],
].filter(([id]) => only === null || only.has(id));

// A mutant no test can kill, with the reason; recorded, never run and never counted as killed.
const EQUIVALENT = [
  { id: 'units-while-not-derived', file: SITE, old: "units: local.derivedStructure?.state === 'derived' ? local.derivedStructure.facts", new: "units: local.derivedStructure !== undefined ? (local.derivedStructure.facts ?? [])",
    reason: '[Inferred] Equivalent by the type: only the `derived` arm of `LocalDerivedStructure` carries `facts` (local-render.ts), so a structure in any other state has none to list and the guard changes no output. The mutant `units-never-listed` shows the tests do read the listed directories.' },
];
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
