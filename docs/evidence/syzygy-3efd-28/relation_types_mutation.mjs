// Recorded mutation run over the predicates of dossier relation types (REQ-polaris-generation-034 version 2.19, syzygy-3efd.28).
// Usage: node relation_types_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files of its group, and restores the
// source in `finally`. `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs.
// Adapted from docs/evidence/syzygy-3efd-50/page_subsections_mutation.mjs: the same method, these files and mutants.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyAt = args.indexOf('--only');
const only = onlyAt === -1 ? null : new Set(args[onlyAt + 1].split(','));
const [root, out, scratch] = args.filter((arg, i) => !arg.startsWith('--') && (onlyAt === -1 || i !== onlyAt + 1));
if (!root || !out || !scratch) throw new Error('usage: node relation_types_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });

const APP = 'apps/three-surface-poc/src/polaris-generation';
const PKG = 'packages/polaris-dossier/src';
const WITNESS = `${PKG}/relation-witness.ts`;
const DERIVE = `${PKG}/check-derive.ts`;
const CHECK = `${PKG}/check.ts`;
const SCHEMA = `${PKG}/draft-schema.ts`;
const RENDER = `${PKG}/render.ts`;
const BRIEF = `${PKG}/brief.ts`;
const SITE = `${APP}/dossier-site.ts`;
const INERT = `${APP}/svg-inert.ts`;

// The test files a mutant of each source runs.
const SCENARIOS = `${PKG}/relation-types.test.ts`;
const TESTS = {
  [WITNESS]: [`${PKG}/relation-witness.test.ts`, SCENARIOS],
  [DERIVE]: [SCENARIOS, `${PKG}/check.test.ts`],
  [CHECK]: [SCENARIOS, `${PKG}/check.test.ts`],
  [SCHEMA]: [`${PKG}/draft-schema.test.ts`, SCENARIOS, `${PKG}/check.test.ts`],
  [RENDER]: [SCENARIOS, `${PKG}/render.test.ts`],
  [BRIEF]: [`${PKG}/brief.test.ts`],
  [SITE]: [SCENARIOS, `${PKG}/render.test.ts`, `${APP}/figure-kinds.test.ts`, `${APP}/dossier-render-provider-golden.test.ts`],
  [INERT]: [SCENARIOS],
};
const TIMEOUT_MS = 600_000;

const MUTANTS = [
  // --- rule relation-witness version 1: the order it decides in
  ['unasserted-decided', WITNESS, "if (!edge.asserted) return unknown('edge-not-inferred');", ''],
  ['no-row-reason-swapped', WITNESS, "if (row === undefined) return unknown('no-witness-rule');", "if (row === undefined) return unknown('endpoint-without-unit');"],
  ['without-unit-reason-swapped', WITNESS, "if (edge.from === undefined || edge.to === undefined) return unknown('endpoint-without-unit');", "if (edge.from === undefined || edge.to === undefined) return unknown('endpoint-unit-invalid');"],
  ['invalid-source-end-ignored', WITNESS, "if (edge.from.invalid || edge.to.invalid) return unknown('endpoint-unit-invalid');", "if (edge.to.invalid) return unknown('endpoint-unit-invalid');"],
  ['invalid-target-end-ignored', WITNESS, "if (edge.from.invalid || edge.to.invalid) return unknown('endpoint-unit-invalid');", "if (edge.from.invalid) return unknown('endpoint-unit-invalid');"],
  ['target-kind-unchecked', WITNESS, 'if (from.kind !== row.from || to.kind !== row.to) return', 'if (from.kind !== row.from) return'],
  ['source-kind-unchecked', WITNESS, 'if (from.kind !== row.from || to.kind !== row.to) return', 'if (to.kind !== row.to) return'],
  ['eligibility-ignores-version', WITNESS, '!table.some((entry) => entry.rule === rule.id && entry.version === rule.version)', '!table.some((entry) => entry.rule === rule.id)'],
  ['eligibility-unchecked', WITNESS, "if (rule === undefined || !table.some(", "if (rule === undefined || false && !table.some("],
  ['facts-unknown-reads-structure-only', WITNESS, "(row.record === 'structure' ? inputs.structure : inputs.manifest).state", 'inputs.structure.state'],
  ['coverage-unchecked', WITNESS, "if (!coverageComplete(relation, from, to, inputs, rule)) return unknown('coverage-partial');", ''],
  ['witness-after-coverage', WITNESS, "  if (fact !== undefined) return { state: 'witnessed'", "  if (!coverageComplete(relation, from, to, inputs, rule)) return unknown('coverage-partial');\n  if (fact !== undefined) return { state: 'witnessed'"],
  // --- coverage
  ['coverage-ignores-secret-paths', WITNESS, 's.secretPathsLeftOut === 0 && ', ''],
  ['coverage-ignores-submodules', WITNESS, 's.submodules === 0 && ', ''],
  ['coverage-ignores-unlisted-units', WITNESS, ' && s.unitsNotListed === 0;', ';'],
  ['coverage-ignores-hidden-end', WITNESS, 'if ([pathOf(from), pathOf(to)].some((at) => at !== undefined && inputs.hidden(at))) return false;', ''],
  ['coverage-ignores-facts-not-listed', WITNESS, ' || m.factsNotListed !== 0', ''],
  ['coverage-any-listed-file', WITNESS, "file.path === source && file.epistemic === 'inferred' && file.valuesLeftOut === 0", 'file.path === source'],
  ['coverage-any-recognizer', WITNESS, 'm.recognizers.some((entry) => entry.rule === rule.id && entry.ruleVersion === rule.version', 'm.recognizers.some((entry) => true'],
  // --- the joining fact
  ['contains-any-target', WITNESS, 'unitAt.get(fact.to) === to.path)', 'unitAt.has(fact.to))'],
  ['contains-case-folded', WITNESS, 'unitAt.get(fact.to) === to.path)', 'unitAt.get(fact.to)?.toLowerCase() === to.path.toLowerCase())'],
  ['contains-last-fact', WITNESS, "return facts.find((fact) => fact.fact === 'contains'", "return facts.findLast((fact) => fact.fact === 'contains'"],
  ['manifest-fact-any-rule', WITNESS, 'if (fact.fact !== kind || fact.rule !== rule.id || fact.ruleVersion !== rule.version) return false;', 'if (fact.fact !== kind) return false;'],
  ['manifest-fact-any-kind', WITNESS, 'if (fact.fact !== kind || fact.rule', 'if (fact.rule'],
  ['dependency-any-name', WITNESS, "fact.path === from.path && fact['name'] === to.name", 'fact.path === from.path'],
  ['needs-job-reversed-allowed', WITNESS, "fact['from'] === from.job && fact['to'] === to.job", "((fact['from'] === from.job && fact['to'] === to.job) || (fact['from'] === to.job && fact['to'] === from.job))"],
  ['needs-job-one-path', WITNESS, "fact.path === from.path && fact.path === to.path && fact['from'] === from.job", "fact.path === from.path && fact['from'] === from.job"],
  ['service-reversed-allowed', WITNESS, "fact['from'] === from.service && fact['to'] === to.service", "((fact['from'] === from.service && fact['to'] === to.service) || (fact['from'] === to.service && fact['to'] === from.service))"],
  // --- at a render, and the words
  ['render-currency-ignored', WITNESS, "decision.state === 'witnessed' && !rendersObserved(decision.fact)", 'false'],
  ['dependency-words-relation-name', WITNESS, "words: 'declares a dependency on'", "words: 'declares-dependency'"],
  ['contains-words-draft', WITNESS, "to: 'top-level-directory', words: 'contains'", "to: 'top-level-directory', words: 'holds'"],
  // --- unit-reference
  ['tld-dot-segments-pass', WITNESS, "unit.path.includes('/') || unit.path === '.' || unit.path === '..'", "unit.path.includes('/')"],
  ['tld-slash-passes', WITNESS, "unit.path.includes('/') || unit.path === '.'", "unit.path === '.'"],
  ['manifest-basename-by-suffix', WITNESS, '!PACKAGE_MANIFEST_BASENAMES.includes(lastSegment(unit.path))', '!PACKAGE_MANIFEST_BASENAMES.some((name) => unit.path.endsWith(name))'],
  ['workflow-path-unchecked', WITNESS, "case 'workflow-job': if (!isWorkflowPath(unit.path)) return 'workflow-job'; break;", "case 'workflow-job': break;"],
  ['compose-path-unchecked', WITNESS, "case 'compose-service': if (!isComposePath(unit.path)) return 'compose-service'; break;", "case 'compose-service': break;"],
  ['hidden-path-blob-tested', WITNESS, 'tree.hidden(unit.path) || tree.isBlob(unit.path)', 'tree.isBlob(unit.path)'],
  ['blob-untested', WITNESS, 'tree.isBlob(unit.path) ? undefined', 'true ? undefined'],
  ['no-tree-blob-fails', WITNESS, "return tree === undefined || tree.hidden", "return tree !== undefined && tree.hidden"],
  ['unit-extra-member-read', WITNESS, 'Object.keys(value).length !== members.length + 1 || ', ''],
  // --- the eligibility table
  ['table-holds-a-recognizer', WITNESS, 'Object.freeze([Object.freeze({ rule: TOP_LEVEL_UNIT.id, version: TOP_LEVEL_UNIT.version, record: null })])', 'Object.freeze([Object.freeze({ rule: TOP_LEVEL_UNIT.id, version: TOP_LEVEL_UNIT.version, record: null }), Object.freeze({ rule: NPM_PACKAGE_MANIFEST.id, version: NPM_PACKAGE_MANIFEST.version, record: null })])'],
  ['stale-module-hash-ignored', WITNESS, "sha256(module) !== entry['sha256']", 'false'],
  ['stale-record-hash-ignored', WITNESS, 'bytes === undefined || sha256(bytes) !== row.record.sha256', 'bytes === undefined'],
  ['stale-empty-record-passes', WITNESS, "if (!Array.isArray(modules) || modules.length === 0)", 'if (!Array.isArray(modules))'],
  // --- check
  ['field-version-not-reported', DERIVE, 'if (Object.hasOwn(element, field)) out.push(`${at}.${field}`);', ''],
  ['field-version-in-v9', DERIVE, "  if (hasRelationForm(doc['schemaVersion'])) return [];\n  const out: string[] = [];", '  const out: string[] = [];'],
  ['field-version-schema-kept', DERIVE, 'subsectionPaths.has(path) || relationPaths.has(path);', 'subsectionPaths.has(path);'],
  ['code-unit-bound-unchecked', DERIVE, 'if (typeof value === \'string\' && value.length > UNIT_TEXT_LIMIT && [...value].length <= UNIT_TEXT_LIMIT) {', 'if (false) {'],
  ['edges-of-unproduced-figures', DERIVE, "!isRecord(diagram['disposition']) || diagram['disposition']['kind'] !== 'produced' || ", ''],
  ['unit-reference-not-reported', DERIVE, "if (unit !== undefined && fault !== undefined) units.push(", "if (false) units.push("],
  ['invalid-end-not-marked', DERIVE, '{ unit, invalid: fault !== undefined }', '{ unit, invalid: false }'],
  ['findings-order-swapped', DERIVE, "  return [\n    ...decisions.units.map(", "  return [\n    ...[].map("],
  ['challenge-detail-names-unit', DERIVE, 'correct the arrow, its relation or its units`', 'correct the arrow, its relation or its units ${JSON.stringify(decision)}`'],
  ['check-withheld-asserted', CHECK, "edge['epistemic'] === 'inferred' && !isWithheldElement(edge, reach)", "edge['epistemic'] === 'inferred'"],
  ['check-unknown-asserted', CHECK, "edge['epistemic'] === 'inferred' && !isWithheldElement(edge, reach)", '!isWithheldElement(edge, reach)'],
  ['check-decides-with-schema-findings', CHECK, "findings.some((finding) => finding.kind === 'schema') ? { ...decisions, edges: [] } : decisions", 'decisions'],
  ['check-secret-path-not-hidden', CHECK, "secretOrUnder(repositoryPath.split('/'), isSecretPath) || screen.screenPath(repositoryPath) === 'denied-path'", "screen.screenPath(repositoryPath) === 'denied-path'"],
  // --- the schema
  ['relation-optional', SCHEMA, 'relation: choice(RELATION_TYPES), ', ''],
  ['unit-code-points-257', SCHEMA, 'maxLength: UNIT_TEXT_LIMIT }', 'maxLength: UNIT_TEXT_LIMIT + 1 }'],
  ['v8-has-relation-form', SCHEMA, 'export const hasRelationForm = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION;', 'export const hasRelationForm = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION || version === LOCAL_DRAFT_SCHEMA_VERSION_V8;'],
  // --- render
  ['render-withheld-asserted', RENDER, "edge['epistemic'] === 'inferred' && !withheld.has(text(edge['id']) ?? '')", "edge['epistemic'] === 'inferred'"],
  ['render-every-fact-current', RENDER, "facts.get(factId)?.epistemic === 'observed'", 'true'],
  ['render-submodules-ignored', RENDER, 'submodules: derived.tree.submodules,', 'submodules: 0,'],
  ['render-unlisted-ignored', RENDER, 'unitsNotListed: derived.tree.unitsNotListed }', 'unitsNotListed: 0 }'],
  ['render-no-relations', RENDER, "...(edgeRelations === undefined ? {} : { edgeRelations: await edgeRelations })", '...{}'],
  // --- the page
  ['site-draft-label-kept', SITE, 'label: witnessed(e.id)!.words, ', ''],
  ['site-draft-marking-kept', SITE, "epistemic: 'observed' as const, ", ''],
  ['site-witnessed-claim', SITE, 'if (relation?.evidence !== undefined) return witnessItem(e, relation, relation.evidence);', ''],
  ['site-no-svg-attributes', SITE, "id => edgeAttrs.get(id) ?? ''", "() => ''"],
  ['site-no-edges-member', SITE, "...(local.edgeRelations === undefined ? {} : { edges:", "...(true ? {} : { edges:"],
  ['site-edges-before-draw', SITE, 'if (relation !== undefined) diagramRelationEdges.push(', 'if (relation !== undefined) relationEdges.push('],
  ['site-no-relation-attribute', SITE, 'const witnessAttrs = (relation: LocalEdgeRelation): string => ` data-relation="${escape(relation.relation)}"${', 'const witnessAttrs = (relation: LocalEdgeRelation): string => `${'],
  ['site-mark-words', SITE, '<span class="derived-mark">Witnessed by Syzygy</span>', '<span class="derived-mark">Derived by Syzygy</span>'],
  ['inert-witness-fact-refused', INERT, "'data-relation', 'data-witness-fact', ", "'data-relation', "],
  // --- the brief
  ['brief-paragraph-dropped', BRIEF, '    RELATION_TYPES_PARAGRAPH,\n', ''],
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
