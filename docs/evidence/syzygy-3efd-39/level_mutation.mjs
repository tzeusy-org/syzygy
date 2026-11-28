// Recorded mutation run over view levels, scopes and zoom links (REQ-polaris-generation-034 version 2.50, syzygy-3efd.39).
// Usage: node level_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files of its group, and restores the
// source in `finally`. `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs.
// Adapted from docs/evidence/syzygy-3efd-88/walk_mutation.mjs: the same method, these files and mutants. The browser test runs in the
// render and style groups, so the run refuses to start without SYZYGY_POC_BROWSER, and each baseline records the passed tests of every
// file, so the record shows the browser test passed (never skipped) in each group that lists it. Design D8's four named mutants are
// `container-drops-system` (a type dropped from the table), `parent-walk-skipped`, `link-to-self` and the 1048 px pair in EQUIVALENT.
// Run 1 (at f50dad4b4) killed 46 of 51. Three test repairs followed (a component view showing a system; a containment view's attributes;
// a figure that is its own element's target, graph and containment) for component-admits-system, containment-attrs-dropped and
// link-to-self; the other two survivors are listed in EQUIVALENT with their reasons. Run 2 (at 26e15b7b0) killed 49 of 49. Review R39
// (docs/reviews/syzygy-3efd-39/) found that EQUIVALENT's `render-rederive-levels-dropped` was no such thing: a check record altered to
// passed reaches the render with a level finding, and only that line refuses it. It is now a mutant, killed by the altered-record test,
// with six more over the review's repairs; the browser file holds two tests, each of which must pass in every baseline that runs it.
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
if (!dry && !process.env['SYZYGY_POC_BROWSER']) throw new Error('SYZYGY_POC_BROWSER must name a Chrome: the render and style groups run the browser test');

const PKG = 'packages/polaris-dossier/src';
const APP = 'apps/three-surface-poc/src/polaris-generation';
const LEVEL = `${PKG}/view-level.ts`;
const CHECK = `${PKG}/check.ts`;
const DERIVE = `${PKG}/check-derive.ts`;
const RENDER = `${PKG}/render.ts`;
const SCHEMA = `${PKG}/draft-schema.ts`;
const BRIEF = `${PKG}/brief.ts`;
const SITE = `${APP}/dossier-site.ts`;
const STYLE = `${APP}/dossier-walk.ts`;
const PACKET = `${PKG}/review-packet.ts`;
const MEASURE = `${PKG}/rerender-measure.ts`;

const SCENARIOS = `${PKG}/view-level.test.ts`;
const PAGE = `${APP}/dossier-zoom.test.ts`;
const BROWSER = `${APP}/zoom.browser.test.ts`;
const TESTS = {
  [LEVEL]: [SCENARIOS],
  [CHECK]: [SCENARIOS],
  [DERIVE]: [SCENARIOS],
  [RENDER]: [SCENARIOS],
  [SCHEMA]: [SCENARIOS, `${PKG}/draft-schema.test.ts`],
  [BRIEF]: [`${PKG}/brief.test.ts`],
  [SITE]: [PAGE, SCENARIOS, BROWSER],
  [STYLE]: [PAGE, BROWSER],
  [PACKET]: [SCENARIOS],
  [MEASURE]: [SCENARIOS],
};
const TIMEOUT_MS = 600_000;

const MUTANTS = [
  // --- the type table and the scope's type
  ['container-drops-system', LEVEL, "container: new Set(['system', 'external',", "container: new Set(['external',"],
  ['container-admits-module', LEVEL, "'job', 'store']),\n  component:", "'job', 'store', 'module']),\n  component:"],
  ['context-admits-package', LEVEL, "context: new Set(['system', 'external', 'person']),", "context: new Set(['system', 'external', 'person', 'package']),"],
  ['component-admits-system', LEVEL, "component: new Set(['external',", "component: new Set(['system', 'external',"],
  ['scope-type-unchecked', LEVEL, "if (scopeType !== undefined && (level === 'component'", "if (false && (level === 'component'"],
  ['component-scope-any-but-module', LEVEL, "? !CONTAINER_TYPES.has(scopeType) : scopeType !== 'system'", "? scopeType === 'module' : scopeType !== 'system'"],
  ['context-unselected-unchecked', LEVEL, "if (level === 'context' && !entries.some(", "if (false && !entries.some("],
  // --- the scope's identity
  ['unresolved-scope-continues', LEVEL, "LEVEL_DETAIL.unresolved(named) });\n      continue;", "LEVEL_DETAIL.unresolved(named) });"],
  ['ill-formed-scope-named', LEVEL, "const named = checkShape({ root: handle, defs: {} }, scope).length === 0 ? scope : `${at}.${SCOPE_FIELD}`;", "const named = scope;"],
  // --- the schema of the two members, and what gates the rest
  ['alone-unreported', LEVEL, "if (hasLevel !== hasScope) own.push(", "if (false) own.push("],
  ['list-schema-ignored', LEVEL, "if (own.length > 0 || touched(`${at}.elements`) || ", "if (own.length > 0 || "],
  ['type-schema-ignored', LEVEL, "return entry === undefined || touched(`${entry.at}.type`) ? undefined", "return entry === undefined ? undefined"],
  ['parent-fault-ignored', LEVEL, "if (parentFault || level === 'context') continue;", "if (level === 'context') continue;"],
  // --- the parent walk
  ['parent-walk-skipped', LEVEL, "if (bounded && !below(entry.id, scope, parentOf, (id) => index.elementById.has(id)))", "if (bounded && false)"],
  ['parent-walk-one-step', LEVEL, "    reached.add(parent);\n    at = parent;", "    return false;"],
  ['outside-reads-every-type', LEVEL, "const bounded = level === 'container' ? type !== undefined && CONTAINER_TYPES.has(type) : type === 'module';", "const bounded = type !== undefined;"],
  // --- a base view
  ['base-level-unchecked', LEVEL, "if (base !== undefined && map !== undefined && !baseBlocked) {", "if (false) {"],
  ['root-typed-directory', LEVEL, "(element.root === true ? 'system' : 'directory')", "'directory'"],
  // --- review R39's repairs (finding 1's rederive is the former equivalent mutant, now run; findings 2, 6, 8 and 9 add these)
  ['scope-identity-unchecked', LEVEL, "    if (touched(`${index.elementById.get(scope)!.at}.id`)) continue;\n", ""],
  ['levelled-any-kind', LEVEL, "isRecord(diagram) && isViewKind(diagram) && isRecord(diagram[VIEW_FIELD])", "isRecord(diagram) && isRecord(diagram[VIEW_FIELD])"],
  ['base-blocked-ignored', LEVEL, "if (base !== undefined && map !== undefined && !baseBlocked) {", "if (base !== undefined && map !== undefined) {"],
  ['unit-fact-ignored', LEVEL, "element.unitFact ?? 'package'", "'package'"],
  ['render-rederive-levels-dropped', RENDER, "  findings.push(...levelFindings(walked, findings, {}));\n", ""],
  // --- where the findings and the stripping happen
  ['check-level-findings-dropped', CHECK, "findings.push(...levelFindings(walked, findings, checkBaseMaps(treeFacts, manifestFacts)));", "void 0;"],
  ['field-version-path-not-replaced', DERIVE, "      for (const at of levelFieldVersionPaths(doc)) subsectionPaths.add(at);\n", ""],
  ['field-version-not-reported', DERIVE, "      for (const finding of levelFieldVersionFindings(doc)) add(finding); },", "      },"],
  ['v17-not-v16', SCHEMA, "version === LOCAL_DRAFT_SCHEMA_VERSION_V16 || hasLevelForm(version);", "version === LOCAL_DRAFT_SCHEMA_VERSION_V16;"],
  ['schema-document-no-levels', SCHEMA, "diagrams: withLevels(withBaseViews(object.properties['diagrams'] as ArraySchema)),", "diagrams: (withBaseViews(object.properties['diagrams'] as ArraySchema)),"],
  ['render-levels-not-passed', RENDER, "...(viewLevels.size === 0 ? {} : { viewLevels })", "...{}"],
  ['packet-levels-kept', PACKET, "withoutLevels(withoutWalks(withoutFigurePlan(draftDoc)))", "withoutWalks(withoutFigurePlan(draftDoc))"],
  ['measure-levels-kept', MEASURE, "doc = withoutLevels(withoutWalks(withoutFigurePlan(doc)));", "doc = withoutWalks(withoutFigurePlan(doc));"],
  ['brief-paragraph-missing', BRIEF, "    WALK_PARAGRAPH,\n    '',\n    LEVEL_PARAGRAPH,\n", "    WALK_PARAGRAPH,\n"],
  ['brief-version-v24', BRIEF, "export const BRIEF_VERSION = 'polaris-dossier-brief-v25';", "export const BRIEF_VERSION = 'polaris-dossier-brief-v24';"],
  // --- the zoom target
  ['context-view-a-target', SITE, "if (v === undefined || v.level === 'context' || zoomTargets.has(v.scope)) continue;", "if (v === undefined || zoomTargets.has(v.scope)) continue;"],
  ['last-own-view-wins', SITE, "if (v === undefined || v.level === 'context' || zoomTargets.has(v.scope)) continue;", "if (v === undefined || v.level === 'context') continue;"],
  ['notice-a-target', SITE, "if (page === undefined || (based !== undefined && based.state !== 'drawn')) continue;", "if (page === undefined) continue;"],
  ['link-to-self', SITE, "if (target === undefined || target.index === index) return undefined;", "if (target === undefined) return undefined;"],
  ['withheld-targets', SITE, "if (viewLevels !== undefined && !withheld) {", "if (viewLevels !== undefined) {"],
  // --- the links
  ['zoom-text-missing', SITE, "(zoom === undefined ? item : `${item.slice(0, -'</li>'.length)}", "(true ? item : `${item.slice(0, -'</li>'.length)}"],
  ['zoom-text-first', SITE, "`${item.slice(0, -'</li>'.length)} <a class=\"zoom-text\" href=\"${escape(zoom.href)}\">Zoom in: ${escape(zoom.title)}</a></li>`", "item.replace('>', `><a class=\"zoom-text\" href=\"${escape(zoom.href)}\">Zoom in: ${escape(zoom.title)}</a> `)"],
  ['zoom-link-label-dropped', SITE, "<span class=\"visually-hidden\">Zoom in to ${escape(label)}: ${escape(zoom.title)}</span>", "<span class=\"visually-hidden\">Zoom in: ${escape(zoom.title)}</span>"],
  ['zoom-only-class-dropped', SITE, "return { wrapper: '<div class=\"walk-figure zoom-only\">',", "return { wrapper: '<div class=\"walk-figure\">',"],
  ['zoom-link-before-badge', SITE, "${badge}${sourceLink(n)}${zoomAt(box.id)}</span>", "${zoomAt(box.id)}${badge}${sourceLink(n)}</span>"],
  ['graph-zoom-page-unmarked', SITE, "    if (zooms.size > 0) zoomPages.add(from);\n", ""],
  ['containment-box-shifted', SITE, "${zooms[k] === undefined ? '' : zoomLink(preorder[k]!.group.label, zooms[k]!)}", "${zooms[k + 1] === undefined ? '' : zoomLink(preorder[k + 1]!.group.label, zooms[k + 1]!)}"],
  ['containment-no-layer', SITE, "const drawing = !zoomed ? svg :", "const drawing = true ? svg :"],
  ['view-attrs-after-id', SITE, "${curated}${baseMap}${viewAttrs(d.id)}${local === undefined ? '' : ` id=\"figure-${escape(d.id)}\"`}>", "${curated}${baseMap}${local === undefined ? '' : ` id=\"figure-${escape(d.id)}\"`}${viewAttrs(d.id)}>"],
  ['containment-attrs-dropped', SITE, "` data-base-map=\"${drawnBase.map}\"`}${viewAttrs(d.id)}", "` data-base-map=\"${drawnBase.map}\"`}"],
  // --- the style rules
  ['pass-through-dropped', STYLE, "${zoom ? `${ZOOM_LINK_CSS}${ZOOM_PASS_THROUGH_CSS}` : ''}", "${zoom ? `${ZOOM_LINK_CSS}` : ''}"],
  ['positioning-dropped', STYLE, "${walk ? WALK_FIGURE_CSS : zoom ? LAYER_POSITIONING_CSS : ''}", "${walk ? WALK_FIGURE_CSS : ''}"],
  ['zoom-rules-everywhere', STYLE, "${zoom ? `${ZOOM_LINK_CSS}${ZOOM_PASS_THROUGH_CSS}` : ''}", "${`${ZOOM_LINK_CSS}${ZOOM_PASS_THROUGH_CSS}`}"],
  ['focus-outline-on-hover', STYLE, ".zoom-link:focus-visible{outline:", ".zoom-link:hover{outline:"],
  ['pass-through-unscoped', STYLE, "'.zoom-only .walk-layer,.zoom-only .walk-node{pointer-events:none}'", "'.walk-layer,.walk-node{pointer-events:none}'"],
  ['layer-passes-no-pointer', STYLE, "'.zoom-only .walk-layer,.zoom-only .walk-node{pointer-events:none}'", "''"],
  ['zoom-link-top-left', STYLE, ".zoom-link{position:absolute;right:${tokens.length.none};", ".zoom-link{position:absolute;left:${tokens.length.none};"],
].filter(([id]) => only === null || only.has(id));

// A mutant no test can kill, with the reason; recorded, never run and never counted as killed.
const EQUIVALENT = [
  { id: 'derive-levels-not-stripped', file: DERIVE, old: "const subject = withoutLevels(withoutWalks(given));", new: "const subject = withoutWalks(given);",
    reason: 'Both callers that can hand deriveFindings a v17 draft strip its levels first (check.ts and render.ts, each `doc = withoutLevels(withoutWalks(doc))` before the call; the mutants check-level-findings-dropped and render-levels-not-passed show both paths run), and the third caller, verify-text.ts, passes a synthetic subject with no diagrams. The strip inside deriveFindings is the documented contract for any later caller, not reachable today.' },
  { id: 'field-version-in-v17', file: LEVEL, old: "if (!hasModelForm(version) || hasLevelForm(version)) return [];", new: "if (!hasModelForm(version)) return [];",
    reason: 'levelFieldVersionPaths and levelFieldVersionFindings are read only inside deriveFindings, which reads the draft after withoutLevels; in a v17 draft that removes every `level` and `scope`, so with the version arm gone the functions still find no member to report.' },
  { id: 'graph-layer-on-1048', file: SITE, old: "    if (!walkableWidth(geometry.width)) return undefined;\n", new: "",
    reason: 'Design D8\'s "put the layer on a 1048 px drawing". No drawing the readable layout draws through an operator-agent dossier is 1048 px wide: it stacks every graph figure into a column (the R88 record\'s equivalent `width-guard-deleted`, the same guard, which a zoom-only layer now shares). `walkableWidth` itself is pinned at 1047, 1048 and 1049 by dossier-walk.test.ts.' },
  { id: 'containment-layer-on-1048', file: SITE, old: " && walkableWidth(layout.width);", new: ";",
    reason: 'A containment drawing is 40 + 184 n px wide for its one to five top-level groups (diagram-layout.ts `figureWidth`), at most 960 px, so no containment is 1048 px wide and the guard never fails.' },
  { id: 'base-node-zoomed', file: SITE, old: "const zoom = isBase(n.id) ? undefined : zoomOf(from, n.id, index);", new: "const zoom = zoomOf(from, n.id, index);",
    reason: 'A base node\'s identity is a fact identity, which starts with `_` (derived-base.ts), while a zoom target is keyed by a `scope`, a model element\'s identity, which check resolves against the model alone and which the identity schema never lets start with `_`; so `zoomOf` finds no target for a base node either way.' },
  { id: 'target-guard-dropped', file: SITE, old: "if (!drawnFigures.has(target.id)) throw new Error(", new: "if (false) throw new Error(",
    reason: 'The guard refuses a render whose zoom target the inertness check turned into a notice. A checked draft\'s labels pass label-markup and the drawing is built from escaped text only, so assertInertSvg never refuses a checked figure, and no test can reach the guard through the pipeline.' },
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
    if (TESTS[file].includes(BROWSER) && (baseline.perFile[BROWSER]?.passed ?? 0) !== 2) throw new Error(`the browser test did not pass in the baseline for ${file}: ${JSON.stringify(baseline.perFile[BROWSER])}`);
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
