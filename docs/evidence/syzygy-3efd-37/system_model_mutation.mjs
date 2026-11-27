// Recorded mutation run over the predicates of the system model (REQ-polaris-generation-034 version 2.24, syzygy-3efd.37).
// Usage: node system_model_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files of its group, and restores the
// source in `finally`. `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs.
// Adapted from docs/evidence/syzygy-3efd-31/containment_mutation.mjs: the same method, these files and mutants.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyAt = args.indexOf('--only');
const only = onlyAt === -1 ? null : new Set(args[onlyAt + 1].split(','));
const [root, out, scratch] = args.filter((arg, i) => !arg.startsWith('--') && (onlyAt === -1 || i !== onlyAt + 1));
if (!root || !out || !scratch) throw new Error('usage: node system_model_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });

const APP = 'apps/three-surface-poc/src/polaris-generation';
const PKG = 'packages/polaris-dossier/src';
const SM = `${PKG}/system-model.ts`;
const DERIVE = `${PKG}/check-derive.ts`;
const CHECK = `${PKG}/check.ts`;
const SCHEMA = `${PKG}/draft-schema.ts`;
const RENDER = `${PKG}/render.ts`;
const REACH = `${PKG}/review-reach.ts`;
const PACKET = `${PKG}/review-packet.ts`;
const SITE = `${APP}/dossier-site.ts`;
const LAYOUT = `${APP}/diagram-layout.ts`;
const INERT = `${APP}/svg-inert.ts`;

const SCENARIOS = `${PKG}/system-model.test.ts`;
const TESTS = {
  [SM]: [SCENARIOS],
  [DERIVE]: [SCENARIOS],
  [CHECK]: [SCENARIOS],
  [SCHEMA]: [SCENARIOS, `${PKG}/draft-schema.test.ts`],
  [RENDER]: [SCENARIOS],
  [REACH]: [SCENARIOS],
  [PACKET]: [SCENARIOS, `${PKG}/review.test.ts`],
  [SITE]: [SCENARIOS],
  [LAYOUT]: [SCENARIOS],
  [INERT]: [SCENARIOS, `${APP}/svg-inert.test.ts`],
};
const TIMEOUT_MS = 600_000;

const MUTANTS = [
  // --- element findings
  ['parent-unresolved-skipped', SM, "if (parent !== undefined && clean(`${at}.parent`) && !index.elementById.has(parent)) parentFaults.add(j);", "if (false) parentFaults.add(j);"],
  ['type-module-store-person', SM, "if (type === 'module' || type === 'store' || type === 'person') out.push", "if (type === 'module' || type === 'store') out.push"],
  ['type-mismatch-dropped', SM, "else if (standsFor !== type) out.push", "else if (false) out.push"],
  ['parent-chain-two-to-three', SM, "if (reached.has(next) || steps > 2) return true;", "if (reached.has(next) || steps > 3) return true;"],
  // --- relationship findings
  ['derivable-ignored', SM, "if (from === undefined || to === undefined || !derivable(relationship['relation'] as RelationType, from, to)) {", "if (from === undefined || to === undefined) {"],
  ['relationship-end-unresolved-skipped', SM, "if (named !== undefined && !index.elementById.has(named)) { resolved = false;", "if (false) { resolved = false;"],
  // --- view findings
  ['view-duplicate-dropped', SM, "if (seen.has(value)) out.push({ kind: 'view-duplicate'", "if (false) out.push({ kind: 'view-duplicate'"],
  ['view-relationship-one-end', SM, "if (!selected.has(text(entry.relationship['from']) ?? '') || !selected.has(text(entry.relationship['to']) ?? '')) {", "if (!selected.has(text(entry.relationship['from']) ?? '')) {"],
  ['view-entry-unresolved-skipped', SM, "if (!known) unresolvedHere.push(", "if (false) unresolvedHere.push("],
  ['model-unviewed-elements-dropped', SM, "if (id !== undefined && !shown.elements.has(id)) out.push", "if (false) out.push"],
  ['undecided-ignores-parent', SM, "|| finding.kind === 'element-type' || finding.kind === 'element-parent' ||", "|| finding.kind === 'element-type' ||"],
  // --- the expansion
  ['expand-derived-label-raw', SM, "label: derivedWords(relationship['relation']), epistemic: 'inferred'", "label: String(relationship['relation']), epistemic: 'inferred'"],
  ['expand-edge-without-both-ends', SM, "if (entry === undefined || !chosen.has(text(entry.relationship['from']) ?? '') || !chosen.has(text(entry.relationship['to']) ?? '')) return [];", "if (entry === undefined) return [];"],
  ['expand-move-dropped', SM, "return best === undefined ? at : `${moves.get(best)!}${at.slice(best.length)}`;", "return at;"],
  ['expand-top-ignores-unselected-parent', SM, "return parent === undefined || !chosen.has(parent) || parent === entry.id;", "return parent === undefined || parent === entry.id;"],
  // --- the migration
  ['migrate-type-default', SM, "return unit === undefined ? 'module' : UNIT_KIND_TYPES[unit.kind]!;", "return unit === undefined ? 'system' : UNIT_KIND_TYPES[unit.kind]!;"],
  ['migrate-parent-dropped', SM, "...(parent === undefined ? {} : { parent }),", ""],
  ['migrate-group-preorder', SM, "if (id !== undefined) ids.push(id);\n        for (const child of list(group['children'])) visit(child, id);", "for (const child of list(group['children'])) visit(child, id);\n        if (id !== undefined) ids.push(id);"],
  // --- the site model member
  ['local-model-views-empty', SM, "return { id, type: text(element['type']) ?? '', parent: text(element['parent']) ?? null, views: selecting((lists) => lists.elements, id) };", "return { id, type: text(element['type']) ?? '', parent: text(element['parent']) ?? null, views: [] };"],
  // --- check wiring
  ['check-model-findings-dropped', CHECK, "findings.push(...modelFindings(doc, new Set(findings.filter((finding) => finding.kind === 'schema').map((finding) => finding.at)), tree));", ""],
  ['check-relation-findings-dropped', CHECK, "findings.push(...modelRelationFindings(modelDecisions(doc, decisions.edges, decisions.nestings)));", ""],
  ['check-end-held-ignored', CHECK, "&& !endHeld(edge['from']) && !endHeld(edge['to'])", ""],
  ['derive-v12-schema-as-v11', DERIVE, "hasModelForm(version) ? v12 : hasContainmentForm(version) ? v11 :", "hasContainmentForm(version) ? v11 :"],
  ['derive-structural-unexpanded', DERIVE, "if (hasModelForm(doc['schemaVersion'])) { const { doc: expanded, move } = expandModel(doc);", "if (false) { const { doc: expanded, move } = expandModel(doc);"],
  // --- render wiring
  ['render-figures-unexpanded', RENDER, "const figureDoc = hasModelForm(doc['schemaVersion']) ? { ...expandModel(doc).doc, schemaVersion: doc['schemaVersion'] } : doc;", "const figureDoc = doc;"],
  ['render-end-held-ignored', RENDER, "const endHeld = (id: unknown): boolean => hasModelForm(doc['schemaVersion']) && withheld.has(text(id) ?? '');", "const endHeld = (id: unknown): boolean => false;"],
  ['render-model-absent', RENDER, "const model = hasModelForm(doc['schemaVersion']) ? localModelOf(doc) : undefined;", "const model = undefined;"],
  ['render-rederive-model-dropped', RENDER, "if (hasModelForm(doc['schemaVersion'])) findings.push(...modelFindings(", "if (false) findings.push(...modelFindings("],
  // --- the site
  ['site-derived-not-unknown', SITE, ": derivedIds.has(e.id) ? { ...e, epistemic: 'unknown' as const, sourceIds: [] } : e; })", ": e; })"],
  ['site-shared-two-to-one', SITE, "const shared = (id: string): boolean => (viewsOf.get(id)?.length ?? 0) > 1;", "const shared = (id: string): boolean => (viewsOf.get(id)?.length ?? 0) > 0;"],
  ['site-first-ignores-notice', SITE, "if (d.disposition.kind !== 'produced') return undefined;", ""],
  ['site-same-page-full-path', SITE, "const link = first.page === from ? `#figure-${target.id}` : href(from, first.page, `figure-${target.id}`);", "const link = href(from, first.page, `figure-${target.id}`);"],
  ['site-shown-words', SITE, "return `, as shown in <a href=", "return `, see <a href="],
  ['site-containment-parent-words', SITE, "? `<li>${escape(group.label)}${parent === undefined ? '' : ` (in ${escape(parent.label)})`}${shown}</li>`", "? `<li>${escape(group.label)}${shown}</li>`"],
  ['site-derived-claimed', SITE, "if (derivedIds.has(e.id)) {\n        const reason", "if (false) {\n        const reason"],
  ['site-derived-reason-challenged-dropped', SITE, "relation.witness.state === 'challenged' ? 'challenged' : relation.witness.reason ?? 'unknown'", "relation.witness.reason ?? 'unknown'"],
  ['site-derived-words', SITE, ": Syzygy could not derive this relation (${escape(reason)})</li>`;", ": ${escape(e.label)} (${escape(reason)})</li>`;"],
  ['site-derived-reason-attr-dropped', SITE, " data-unknown-reason=\"${escape(reason)}\">${ends}", ">${ends}"],
  ['site-derived-basis-dropped', SITE, "...(derivedIds.has(e.id) ? { basis: 'derived' } : {}), ", ""],
  ['site-derived-arrow-unmarked', SITE, ": derivedIds.has(e.id) ? ' data-epistemic=\"unknown\"' : '';", ": '';"],
  ['site-relationship-attr-dropped', SITE, "const attrs = `${sharedAttr(e.id, 'relationship')}${relation", "const attrs = `${relation"],
  ['site-model-witness-null', SITE, "witness: local.edgeRelations?.get(r.id)?.witness ?? null", "witness: null"],
  ['layout-containment-attr-dropped', LAYOUT, "return `<g class=\"node ${group.epistemic}\"${elementAttributes(group.id)}>", "return `<g class=\"node ${group.epistemic}\">"],
  ['inert-element-refused', INERT, "'data-element', 'data-relationship',", "'data-relationship',"],
  // --- review
  ['reach-model-elements-dropped', REACH, "for (const { element: value, at } of modelElements) element(at, 'diagram-node', value);", ""],
  ['packet-model-units-dropped', PACKET, "if (hasModelForm(draft['schemaVersion'])) screenUnits(", "if (false) screenUnits("],
].filter(([id]) => only === null || only.has(id));

// A mutant no test can kill, with the reason; recorded, never run and never counted as killed.
const EQUIVALENT = [
  { id: 'parent-loop-ignored', file: SM, old: "if (reached.has(next) || steps > 2) return true;", new: "if (steps > 2) return true;",
    reason: 'Every chain that reaches an element already reached keeps following parents, so it takes a third step and returns true by the step bound alone: a loop of one (an element naming itself) returns at step 3 where the original returns at step 1, a loop of two at step 3 where the original returns at step 2, and a chain into a longer loop exceeds two steps before it closes. The function returns a boolean, so the outcome is the same for every input; the reached test states the clause\'s wording and bounds no work the step bound does not.' },
];

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = [...new Set(MUTANTS.map(([, file]) => file))].sort();
const originals = new Map(files.map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
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
