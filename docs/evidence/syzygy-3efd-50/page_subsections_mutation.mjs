// Recorded mutation run over the predicates of dossier page subsections (REQ-polaris-generation-034 version 2.16, syzygy-3efd.50).
// Usage: node page_subsections_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files of its group, and restores the
// source in `finally`. `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs.
// Adapted from docs/evidence/syzygy-5dhm-70/index_and_task_routes_mutation.mjs: the same method, these files and mutants.
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
const CORE = 'packages/polaris-generation-core/src';
const SITE = `${APP}/dossier-site.ts`;
const DERIVE = `${PKG}/check-derive.ts`;
const SCHEMA = `${PKG}/draft-schema.ts`;
const RENDER = `${PKG}/render.ts`;
const BRIEF = `${PKG}/brief.ts`;
const ADVICE = `${PKG}/reader-advice.ts`;
const LEDGER = `${PKG}/reading-ledger.ts`;
const MODEL = `${CORE}/draft-model.ts`;

// The test files a mutant of each source runs.
const SITE_TESTS = [`${APP}/dossier-finding.test.ts`, `${APP}/figure-kinds.test.ts`, `${APP}/dossier-reading.test.ts`, `${APP}/dossier-derived-region.test.ts`, `${APP}/dossier-render-provider-golden.test.ts`, `${PKG}/render.test.ts`];
const TESTS = {
  [SITE]: SITE_TESTS,
  [DERIVE]: [`${PKG}/check.test.ts`],
  [SCHEMA]: [`${PKG}/draft-schema.test.ts`, `${PKG}/check.test.ts`, `${PKG}/brief.test.ts`, `${PKG}/render.test.ts`, `${PKG}/reader-standards.test.ts`, `${PKG}/reading-ledger.test.ts`],
  [RENDER]: [`${PKG}/render.test.ts`],
  [BRIEF]: [`${PKG}/brief.test.ts`],
  [ADVICE]: [`${PKG}/reader-standards.test.ts`, `${PKG}/reading-ledger.test.ts`],
  [LEDGER]: [`${PKG}/reading-ledger.test.ts`],
  [MODEL]: [`${CORE}/provider-draft.test.ts`, `${CORE}/rendered-design.test.ts`],
};
const TIMEOUT_MS = 600_000;

const MUTANTS = [
  // --- check: rule one-sentence-answer version 1
  ['answer-inner-stop-allowed', DERIVE, "if (/[.?!][)\\]'\\u2019]*\\s/u.test(stripped)) return false;", ''],
  ['answer-inner-stop-without-closers', DERIVE, "if (/[.?!][)\\]'\\u2019]*\\s/u.test(stripped))", "if (/[.?!]\\s/u.test(stripped))"],
  ['answer-inner-stop-ascii-space-only', DERIVE, "if (/[.?!][)\\]'\\u2019]*\\s/u.test(stripped))", "if (/[.?!][)\\]'\\u2019]*[ \\n]/u.test(stripped))"],
  ['answer-end-without-closers', DERIVE, "return /[.?!][)\\]'\\u2019]*$/u.test(stripped)", "return /[.?!]$/u.test(stripped)"],
  ['answer-end-without-right-quote', DERIVE, "return /[.?!][)\\]'\\u2019]*$/u.test(stripped)", "return /[.?!][)\\]']*$/u.test(stripped)"],
  ['answer-end-any-character', DERIVE, "return /[.?!][)\\]'\\u2019]*$/u.test(stripped)", "return /.$/u.test(stripped)"],
  ['answer-quoted-text-kept', DERIVE, 'for (let i = quotes[k]! + 1; i < quotes[k + 1]!; i++) removed.add(i);', ''],
  ['answer-closing-quote-not-an-end', DERIVE, ' || (kept.length > 0 && kept[kept.length - 1]!.closes);', ';'],
  ['answer-trailing-space-kept', DERIVE, 'while (kept.length > 0 && white.test(kept[kept.length - 1]!.ch)) kept.pop();', ''],
  ['answer-unpaired-quote-closed-at-end', DERIVE, 'const paired = quotes.length - (quotes.length % 2);', 'if (quotes.length % 2 === 1) quotes.push(chars.length);\n  const paired = quotes.length;'],
  // --- check: subsection-answer findings
  ['answer-non-normative-passes', DERIVE, "if (answer['label'] === 'non-normative') {", 'if (false) {'],
  ['answer-sentence-unchecked', DERIVE, "} else if (typeof answer['text'] === 'string' && !oneSentenceAnswer(answer['text'])) {", '} else if (false) {'],
  ['answer-named-by-path-always', DERIVE, 'checkShape({ root: handle, defs: {} }, id).length === 0 ? `the subsection', 'false ? `the subsection'],
  ['answer-named-by-id-always', DERIVE, 'checkShape({ root: handle, defs: {} }, id).length === 0 ? `the subsection', 'true ? `the subsection'],
  // --- check: subsections in an earlier draft
  ['earlier-no-field-version', DERIVE, 'isRecord(section) && Object.hasOwn(section, SUBSECTIONS_FIELD) ? [`$.sections', 'false ? [`$.sections'],
  ['v8-field-version', DERIVE, "if (hasSubsectionForm(doc['schemaVersion'])) return [];", ''],
  ['earlier-schema-finding-kept', DERIVE, 'fieldVersion.has(path) || subsectionPaths.has(path) || (also', 'fieldVersion.has(path) || (also'],
  ['v7-schema-finding-kept', DERIVE, 'standing.has(path) || subsectionPaths.has(path) }', 'standing.has(path) }'],
  ['earlier-subsections-read', DERIVE, "  if (!hasSubsectionForm(doc['schemaVersion'])) return;\n  list(section[SUBSECTIONS_FIELD])", '  list(section[SUBSECTIONS_FIELD])'],
  ['v7-read-as-v8', DERIVE, 'schema: version === LOCAL_DRAFT_SCHEMA_VERSION ? current : v7,', 'schema: current,'],
  ['v8-read-as-v7', DERIVE, 'schema: version === LOCAL_DRAFT_SCHEMA_VERSION ? current : v7,', 'schema: v7,'],
  ['v7-schema-takes-subsections', DERIVE, "const v7 = localDraftSchema(parameters, 'home', 'required', 'taken', 'absent');", "const v7 = localDraftSchema(parameters, 'home', 'required', 'taken', 'taken');"],
  ['v6-figure-detail-names-v8', DERIVE, "the kind \\`${diagram['kind']}\\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION_V7}", "the kind \\`${diagram['kind']}\\` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION}"],
  // --- check: a subsection's claims are its section's
  ['answer-not-a-block', DERIVE, "if (isRecord(subsection['answer'])) out.push(claim(`${at}.answer`, subsection['answer']));", ''],
  ['subsection-paragraphs-not-blocks', DERIVE, "list(subsection['paragraphs']).forEach((entry, k) => contentClaims(", 'list([]).forEach((entry, k) => contentClaims('],
  ['subsection-title-not-a-label', DERIVE, "subsectionsOf(doc, (subsection, at) => { if (typeof subsection['title'] === 'string') out.push(", 'subsectionsOf(doc, (subsection, at) => { if (false) out.push('],
  ['subsection-rule-not-run', DERIVE, ' figureStructure(doc, add); subsectionStructure(doc, add); },', ' figureStructure(doc, add); },'],
  // --- the schema
  ['subsections-min-1', SCHEMA, 'subsections: [2, 12] as const', 'subsections: [1, 12] as const'],
  ['subsections-max-13', SCHEMA, 'subsections: [2, 12] as const', 'subsections: [2, 13] as const'],
  ['subsection-paragraphs-min-1', SCHEMA, 'paragraphs: [0, 30] as const', 'paragraphs: [1, 30] as const'],
  ['subsection-paragraphs-max-31', SCHEMA, 'paragraphs: [0, 30] as const', 'paragraphs: [0, 31] as const'],
  ['subsection-title-any-text', SCHEMA, 'subsection: object({ id: handle, title: presentationLabel,', 'subsection: object({ id: handle, title: text,'],
  ['subsections-required', SCHEMA, "disposition: ref('disposition') }, [SUBSECTIONS_FIELD])", "disposition: ref('disposition') })"],
  ['subsection-form-in-v7', SCHEMA, 'export const hasSubsectionForm = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION;', 'export const hasSubsectionForm = (version: unknown): boolean => version === LOCAL_DRAFT_SCHEMA_VERSION || version === LOCAL_DRAFT_SCHEMA_VERSION_V7;'],
  ['figure-kinds-not-in-v8', SCHEMA, 'version === LOCAL_DRAFT_SCHEMA_VERSION_V7 || hasSubsectionForm(version);', 'version === LOCAL_DRAFT_SCHEMA_VERSION_V7;'],
  ['thesis-basis-not-in-v8', SCHEMA, 'version === LOCAL_DRAFT_SCHEMA_VERSION_V6 || hasFigureKindForm(version);', 'version === LOCAL_DRAFT_SCHEMA_VERSION_V6 || version === LOCAL_DRAFT_SCHEMA_VERSION_V7;'],
  // --- the brief
  ['brief-paragraph-dropped', BRIEF, '    SUBSECTIONS_PARAGRAPH,\n', ''],
  // --- reader advice and the reading ledger
  ['rs19-subsections-in-v7', ADVICE, "if (part !== 'sections' || !hasSubsectionForm(doc['schemaVersion'])) return own;", "if (part !== 'sections') return own;"],
  ['rs19-subsections-in-dives', ADVICE, "if (part !== 'sections' || !hasSubsectionForm(doc['schemaVersion'])) return own;", "if (!hasSubsectionForm(doc['schemaVersion'])) return own;"],
  ['rs19-answer-uncounted', ADVICE, "sum + proseWords(subsection['answer']) + list(", 'sum + list('],
  ['rs19-subsection-paragraphs-uncounted', ADVICE, " + list(subsection['paragraphs']).reduce<number>((inner, entry) => inner + proseWords(entry), 0) : sum)", ' : sum)'],
  ['rs17-messages-not-in-v8', ADVICE, "if (diagram['kind'] !== 'sequence' || !hasFigureKindForm(doc['schemaVersion'])) return;", "if (diagram['kind'] !== 'sequence' || doc['schemaVersion'] !== 'polaris-dossier-local-draft-v7') return;"],
  ['ledger-section-subsections-uncounted', LEDGER, "const words = containerProseWords(doc, section, 'sections');", "const words = containerProseWords(doc, section, 'deepDives');"],
  ['ledger-v8-homes-read-as-section-ids', LEDGER, "const homesInHome = hasHomeForm(doc['schemaVersion']);", "const homesInHome = ['polaris-dossier-local-draft-v5', 'polaris-dossier-local-draft-v6', 'polaris-dossier-local-draft-v7'].includes(String(doc['schemaVersion']));"],
  // --- the shared draft model's handles
  ['handles-subsection-blocks-dropped', MODEL, ',\n      ...(s.subsections ?? []).flatMap(sub => [sub.answer, ...treeBlocks(sub.paragraphs)])])', '])'],
  ['handles-subsection-ids-dropped', MODEL, ', ...(s.subsections ?? []).map(sub => sub.id)]', ']'],
  // --- the render model
  ['model-subsections-dropped', RENDER, '...(subsectionRecords(section).length === 0 ? {} :', '...(true ? {} :'],
  ['section-title-over-own-paragraphs-only', RENDER, "const paragraphs = [...leaves(container['paragraphs']), ...leaves(subsectionRecords(container).flatMap(subsectionContent))];", "const paragraphs = leaves(container['paragraphs']);"],
  ['subsection-title-not-a-label-over-claims', RENDER, "title: over(subsectionContent(subsection), subsection['title'])", "title: text(subsection['title'])!"],
  ['subsection-title-over-answer-only', RENDER, "title: over(subsectionContent(subsection), subsection['title'])", "title: over([subsection['answer']], subsection['title'])"],
  ['figure-kind-not-drawn-in-v8', RENDER, "(hasFigureKindForm(doc['schemaVersion']) && (diagram['kind'] === 'sequence'", "(doc['schemaVersion'] === 'polaris-dossier-local-draft-v7' && (diagram['kind'] === 'sequence'"],
  // --- the site
  ['subsection-h2', SITE, '<h3>${escape(sub.title)}</h3>', '<h2>${escape(sub.title)}</h2>'],
  ['subsection-answer-unwrapped', SITE, '<div class="subsection-answer">${paragraph(from, sub.answer, \'p\')}</div>', "${paragraph(from, sub.answer, 'p')}"],
  ['subsection-paragraphs-dropped', SITE, "${sub.paragraphs.map(b => block(from, b)).join('')}</section>", '</section>'],
  ['subsections-after-deep-links', SITE, "${subsections}${dives ? `<ul class=\"deep-links\">${dives}</ul>` : ''}", "${dives ? `<ul class=\"deep-links\">${dives}</ul>` : ''}${subsections}"],
  ['subsection-css-everywhere', SITE, "${subsections ? SUBSECTION_CSS : ''}", '${SUBSECTION_CSS}'],
  ['subsection-css-nowhere', SITE, "${subsections ? SUBSECTION_CSS : ''}", ''],
  ['subsection-page-not-marked', SITE, 'if (subsections !== \'\') subsectionPages.add(from);', ''],
  ['contents-never', SITE, "!shown.some(rendersSubsections) ? ''", "true ? ''"],
  ['contents-always', SITE, "!shown.some(rendersSubsections) ? ''", "false ? ''"],
  ['contents-unproduced-section-listed', SITE, "section.disposition.kind === 'produced' && (section.subsections ?? []).length > 0", '(section.subsections ?? []).length > 0'],
  ['contents-subsection-list-dropped', SITE, '`<ol>${section.subsections!.map(', '`<ol>${[].map('],
  ['contents-not-on-landing', SITE, '`${pageContents(onLanding)}${onLanding.map(', '`${onLanding.map('],
  ['contents-lists-why-back-link', SITE, 'const rendered = pole.sections.filter(id => id !== poleSpec!.whySection).map(', 'const rendered = pole.sections.map('],
].filter(([id]) => only === null || only.has(id));

// A mutant no test can kill, with the reason; recorded, never run and never counted as killed.
const EQUIVALENT = [
  { id: 'answer-leading-space-kept', file: DERIVE, old: 'while (kept.length > 0 && white.test(kept[0]!.ch)) kept.shift();', new: '',
    reason: '[Inferred] Equivalent by the rule: a leading white-space character has no terminator before it, so it cannot match the inner-stop pattern, and it is never the last character unless every character is white space, which neither ends with a terminator nor closes a quote either way. The rule states the removal; it changes no outcome.' },
  { id: 'contents-deferred-section-listed', file: SITE, old: '!view.deferredSections.has(section.id) && ', new: '',
    reason: '[Inferred] Unreachable: deferredSections is non-empty only in provider mode (dossier-render.ts), whose draft passes validateDraftRecord, and the closed provider draft form refuses `subsections` (provider-draft.test.ts pins the refusal), so no deferred section carries a subsection. The local render passes an empty set.' },
  { id: 'model-subsections-of-earlier-draft', file: RENDER, old: "(hasSubsectionForm(doc['schemaVersion']) ? list(container['subsections']).filter(isRecord) : [])", new: "list(container['subsections']).filter(isRecord)",
    reason: '[Inferred] Unreachable through the render command: it renders only the latest passed draft, and a draft of schema v7 or earlier carrying `subsections` never passes (the field-version finding, pinned in check.test.ts). The guard keeps the model honest for any other caller.' },
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
