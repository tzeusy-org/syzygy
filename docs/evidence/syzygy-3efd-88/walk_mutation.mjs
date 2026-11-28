// Recorded mutation run over the figure walks (REQ-polaris-generation-034 version 2.40, syzygy-3efd.88).
// Usage: node walk_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files of its group, and restores the
// source in `finally`. `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs.
// Adapted from docs/evidence/syzygy-3efd-38/derived_base_mutation.mjs: the same method, these files and mutants. The browser test runs
// in the render groups, so SYZYGY_POC_BROWSER must name a Chrome; a run without one skips it and is recorded as such by its test count.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyAt = args.indexOf('--only');
const only = onlyAt === -1 ? null : new Set(args[onlyAt + 1].split(','));
const [root, out, scratch] = args.filter((arg, i) => !arg.startsWith('--') && (onlyAt === -1 || i !== onlyAt + 1));
if (!root || !out || !scratch) throw new Error('usage: node walk_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });

const PKG = 'packages/polaris-dossier/src';
const APP = 'apps/three-surface-poc/src/polaris-generation';
const WALK = `${PKG}/walk.ts`;
const CHECK = `${PKG}/check.ts`;
const DERIVE = `${PKG}/check-derive.ts`;
const RENDER = `${PKG}/render.ts`;
const SCHEMA = `${PKG}/draft-schema.ts`;
const BRIEF = `${PKG}/brief.ts`;
const SITE = `${APP}/dossier-site.ts`;
const LAYOUT = `${APP}/diagram-layout.ts`;
const STYLE = `${APP}/dossier-walk.ts`;

const SCENARIOS = `${PKG}/walk.test.ts`;
const PAGE = `${APP}/dossier-walk.test.ts`;
const BROWSER = `${APP}/walk.browser.test.ts`;
const TESTS = {
  [WALK]: [SCENARIOS],
  [CHECK]: [SCENARIOS],
  [DERIVE]: [SCENARIOS],
  [RENDER]: [SCENARIOS],
  [SCHEMA]: [SCENARIOS, `${PKG}/draft-schema.test.ts`],
  [BRIEF]: [`${PKG}/brief.test.ts`],
  [SITE]: [PAGE, SCENARIOS, BROWSER],
  [LAYOUT]: [PAGE, SCENARIOS, BROWSER],
  [STYLE]: [PAGE, BROWSER],
};
const TIMEOUT_MS = 600_000;

const MUTANTS = [
  // --- a walk's form
  ['extra-member-admitted', WALK, "isRecord(value) && Object.keys(value).length === members.length && ", "isRecord(value) && "],
  ['figure-not-string-admitted', WALK, "typeof walk['figure'] !== 'string' || ", ""],
  ['one-step-admitted', WALK, "if (steps.length < WALK_STEPS[0] || steps.length > WALK_STEPS[1]) return undefined;", "if (steps.length > WALK_STEPS[1]) return undefined;"],
  ['thirteen-steps-admitted', WALK, "if (steps.length < WALK_STEPS[0] || steps.length > WALK_STEPS[1]) return undefined;", "if (steps.length < WALK_STEPS[0]) return undefined;"],
  ['block-not-string-admitted', WALK, " || typeof step['block'] !== 'string') return undefined;", ") return undefined;"],
  ['base-end-without-path-admitted', WALK, "typeof element['path'] === 'string'", "true"],
  ['malformed-silent', WALK, "if (read === undefined) { out.push({ kind: 'walk', at, detail: WALK_DETAIL.malformed }); continue; }", "if (read === undefined) continue;"],
  // --- where walks are read
  ['deep-dives-unread', WALK, "const PLACES = ['sections', 'deepDives'] as const;", "const PLACES = ['sections'] as const;"],
  ['deep-dives-first', WALK, "const PLACES = ['sections', 'deepDives'] as const;", "const PLACES = ['deepDives', 'sections'] as const;"],
  ['walks-not-stripped', WALK, "if (!isRecord(doc) || !hasWalkForm(doc['schemaVersion'])) return doc;\n  const strip", "return doc;\n  const strip"],
  ['field-version-paths-none', WALK, "return walksOf(doc).map((entry) => entry.at);", "return [];"],
  ['walk-findings-any-version', WALK, "if (!hasWalkForm(doc['schemaVersion'])) return [];\n  const out: CheckFinding[]", "const out: CheckFinding[]"],
  // --- the figure
  ['home-unchecked', WALK, "if (!homedAt(diagram, place, part)) out.push(", "if (false) out.push("],
  ['home-deep-dive-as-section', WALK, "(part === 'sections' ? 'section' : 'deep-dive')", "'section'"],
  ['kind-unchecked', WALK, "if (!GRAPH_KINDS.has(diagram['kind'])) out.push(", "if (false) out.push("],
  ['unresolved-silent', WALK, "if (diagram === undefined) out.push({ kind: 'unresolved-reference', at: `${at}.figure`, detail: WALK_DETAIL.unresolved });", "if (diagram === undefined) {}"],
  // --- the steps
  ['view-elements-whole-model', WALK, "return new Set(viewLists(diagram).elements.filter((id) => elements.has(id)));", "return new Set(elements.keys());"],
  ['base-map-unmatched', WALK, "if (base === undefined || base.map !== element.map) return { state: 'absent' };", "if (base === undefined) return { state: 'absent' };"],
  ['unestablished-as-absent', WALK, "if (map === undefined) return { state: 'unestablished' };", "if (map === undefined) return { state: 'absent' };"],
  ['base-unshown-admitted', WALK, "named.length === 1 && shownOf(base, map).includes(named[0]!) ? { state: 'shown'", "named.length === 1 ? { state: 'shown'"],
  ['base-repeat-by-path', WALK, "{ key: `base:${found.factId}`, name:", "{ key: `base:${element.path}`, name:"],
  ['base-repeat-names-path', WALK, "name: `\\`walk.steps[${k}].element\\`` }", "name: element.path }"],
  ['repeat-silent', WALK, "if (named.has(resolved.key)) out.push(", "if (false) out.push("],
  ['element-absent-silent', WALK, "if (resolved === 'absent') out.push({ kind: 'walk', at: `${stepAt}.element`, detail: WALK_DETAIL.element(k, read.figure) });", "if (resolved === 'absent') {}"],
  ['block-absent-silent', WALK, "if (block === undefined) out.push({ kind: 'walk', at: `${stepAt}.block`, detail: WALK_DETAIL.block(k) });\n      else if", "if (block === undefined) {}\n      else if"],
  ['uncited-silent', WALK, "else if (list(block['citations']).length === 0) out.push(", "else if (false) out.push("],
  ['presentation-blocks-admitted', WALK, "if (!isRecord(entry) || PRESENTATION_KINDS.has(text(entry['kind']) ?? '')) continue;", "if (!isRecord(entry)) continue;"],
  ['subsections-unread', WALK, "if (part === 'sections') for (const subsection", "if (false) for (const subsection"],
  // --- at the render
  ['render-partial-walk', WALK, "if (node === undefined || seen.has(node)) { steps.length = 0; break; }", "if (node === undefined || seen.has(node)) continue;"],
  ['render-walks-dropped', RENDER, "...(walks.size === 0 ? {} : { walks })", ""],
  // --- check and its version rules
  ['check-walk-findings-dropped', CHECK, "findings.push(...walkFindings(walked, checkBaseMaps(treeFacts, manifestFacts)));", ""],
  ['check-maps-unread', CHECK, "walkFindings(walked, checkBaseMaps(treeFacts, manifestFacts))", "walkFindings(walked, {})"],
  ['check-walks-not-stripped', CHECK, "  doc = withoutWalks(doc);\n", "\n"],
  ['source-example-not-v16', CHECK, " && version !== 'polaris-dossier-local-draft-v16') return;", ") return;"],
  ['field-version-not-emitted', DERIVE, "for (const finding of walkFieldVersionFindings(doc)) add(finding);", ""],
  ['field-version-schema-too', DERIVE, "for (const at of walkFieldVersionPaths(doc)) subsectionPaths.add(at);", ""],
  ['walk-form-never', SCHEMA, "export const hasWalkForm = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION_V16;", "export const hasWalkForm = (version: unknown): boolean => false;"],
  ['base-form-not-v16', SCHEMA, "version === LOCAL_DRAFT_SCHEMA_VERSION_V15 || hasWalkForm(version);", "version === LOCAL_DRAFT_SCHEMA_VERSION_V15;"],
  ['schema-sections-no-walk', SCHEMA, "sections: withWalk(object.properties['sections'] as ArraySchema), ", ""],
  ['brief-no-walk-paragraph', BRIEF, "    WALK_PARAGRAPH,\n", ""],
  // --- the layer and the list
  ['width-rule-off-by-one', LAYOUT, "width !== 1048;", "width !== 1047;"],
  ['box-ignores-called', LAYOUT, "const layout = layoutDiagram(diagram.nodes.map(node => ({ ...node, below: decorate(node.id)?.called === undefined ? 0 : CALLED_HEIGHT })), diagram.edges, spacing);\n  return { width: layout.width, boxes:", "const layout = layoutDiagram(diagram.nodes.map(node => ({ ...node, below: 0 })), diagram.edges, spacing);\n  return { width: layout.width, boxes:"],
  ['box-x-y-swapped', LAYOUT, "`left:${box.x}px;top:${box.y}px;", "`left:${box.y}px;top:${box.x}px;"],
  ['stray-node-renders', SITE, "if (steps.some(step => !nodes.has(step.node))) return undefined;", "if (steps.every(step => !nodes.has(step.node))) return undefined;"],
  ['base-box-linked', SITE, "if (isBase(n.id) || held(n.id) !== undefined", "if (held(n.id) !== undefined"],
  ['withheld-box-linked', SITE, "if (isBase(n.id) || held(n.id) !== undefined || first", "if (isBase(n.id) || first"],
  ['box-link-no-lines', SITE, "lineFragment(first, local?.citationLines?.get(n.id)?.get(first))", "lineFragment(first, undefined)"],
  ['box-id-off-by-one', SITE, "` id=\"walk-${escape(d.id)}-${number}\"`", "` id=\"walk-${escape(d.id)}-${number - 1}\"`"],
  ['badge-on-every-box', SITE, "const badge = number === undefined ? '' :", "const badge = number === undefined ? '<span class=\"walk-badge\" aria-hidden=\"true\"></span>' :"],
  ['list-text-link-to-figure', SITE, "<a class=\"walk-text\" href=\"#block-${escape(step.block)}\">", "<a class=\"walk-text\" href=\"#figure-${escape(d.id)}\">"],
  ['style-never-carried', SITE, "    walkPages.add(from);\n", ""],
  ['style-on-every-page', SITE, "${walkPages.has(path) ? WALK_FIGURE_CSS : ''}", "${WALK_FIGURE_CSS}"],
  ['layer-not-drawn', SITE, "const drawing = walked === undefined ? svg : `<div class=\"walk-figure\">${svg}${walked.layer}</div>`;", "const drawing = svg;"],
  ['list-before-drawing', SITE, "const drawing = walked === undefined ? svg : `<div class=\"walk-figure\">${svg}${walked.layer}</div>`;", "const drawing = walked === undefined ? svg : `${walked.list}<div class=\"walk-figure\">${svg}${walked.layer}</div>`;"],
  // --- the style rules
  ['target-solid', STYLE, ".walk-node:target{outline:${tokens.line.emphasis} dashed", ".walk-node:target{outline:${tokens.line.emphasis} solid"],
  ['target-on-hover-only', STYLE, ".walk-node:target{", ".walk-node:hover:target{"],
  ['layer-not-relative', STYLE, ".walk-figure{position:relative;", ".walk-figure{"],
  ['layer-takes-pointer', STYLE, "height:${tokens.length.full};pointer-events:none}", "height:${tokens.length.full}}"],
].filter(([id]) => only === null || only.has(id));

// A mutant no test can kill, with the reason; recorded, never run and never counted as killed.
const EQUIVALENT = [];

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
