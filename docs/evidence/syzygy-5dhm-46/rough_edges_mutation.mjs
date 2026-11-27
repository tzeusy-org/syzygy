#!/usr/bin/env node
// Rule-6 mutation run for syzygy-5dhm.46 (REQ-polaris-generation-034 version 2.43 rough-edge markers).
// Usage: node docs/evidence/syzygy-5dhm-46/rough_edges_mutation.mjs <out.json>
// Applies each mutant (an exact, unique old -> new fragment) to a clean tree, runs the rough-edges and test-name test files, records the
// failed-test count read from vitest's output, and restores the file byte for byte. Refuses to start on a dirty source or test file.
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';

const SRC = 'packages/polaris-dossier/src';
const LEXER = `${SRC}/test-names-lexer.ts`;
const RECOGNIZE = `${SRC}/rough-edges-recognize.ts`;
const MEMBER = `${SRC}/rough-edges.ts`;
const RULES = `${SRC}/derive-rules.ts`;
const PAGE = 'apps/three-surface-poc/src/polaris-generation/dossier-rough-edges.ts';
const SITE = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts';
const TESTS = [`${SRC}/rough-edges-recognize.test.ts`, `${SRC}/rough-edges.test.ts`, 'apps/three-surface-poc/src/polaris-generation/dossier-rough-edges.test.ts',
  `${SRC}/test-names-recognize.test.ts`];

// [id, layer, file, old, new]
const MUTANTS = [
  // The lexer's comment spans and template nesting.
  ['lexer-regex-as-comment', 'lexer', LEXER, 'out.regex(text.slice(i, end));', 'out.comment(text.slice(i, end), i, 0, 0);'],
  ['lexer-python-delimiter-in-content', 'lexer', LEXER, 'out.comment(text.slice(i, end), i, 1, 0);', 'out.comment(text.slice(i, end), i, 0, 0);'],
  ['lexer-block-close-in-content', 'lexer', LEXER, 'out.comment(text.slice(i, end + 2), i, 2, 2);', 'out.comment(text.slice(i, end + 2), i, 2, 0);'],
  ['lexer-template-nesting-ignored', 'lexer', LEXER, "const end = c === '`' ? templateEnd(text, i + 1) : closeOf(text, i + 1, c, true);", "const end = closeOf(text, i + 1, c, c !== '`');"],
  ['lexer-substitution-strings-unskipped', 'lexer', LEXER, "else if (c === '\"' || c === '\\'') { const end = closeOf(text, i + 1, c, true); if (end < 0) return -1; i = end; }", ''],
  ['lexer-substitution-comments-unskipped', 'lexer', LEXER, "else if (c === '/' && text[i + 1] === '*') { const end = text.indexOf('*/', i + 2); if (end < 0) return -1; i = end + 1; }", ''],
  // The recognizer's candidates, patterns and quotes.
  ['candidate-bare-extension', 'recognizer', RECOGNIZE, 'base.endsWith(e) && base.length > e.length', 'base.endsWith(e)'],
  ['candidate-go-dropped', 'recognizer', RULES, "go: ['.go'],", "go: [],"],
  ['todo-word-guard-dropped', 'recognizer', RECOGNIZE, '`(?<![${W}])TODO(?![${W}])`', '`TODO`'],
  ['deprecated-tag-at-guard-dropped', 'recognizer', RECOGNIZE, '`(?<![${W}@])@deprecated(?![${W}])|', '`@deprecated(?![${W}])|'],
  ['deprecated-colon-form-dropped', 'recognizer', RECOGNIZE, '|(?<![${W}@])Deprecated:`', '`'],
  ['issue-overlap-kept', 'recognizer', RECOGNIZE, 'if (!taken.some((t) => start < t.end && t.start < end)) taken.push', 'taken.push'],
  ['issue-bare-lookbehind-narrowed', 'recognizer', RECOGNIZE, '/(?<![A-Za-z0-9_&#\\/.-])#[0-9]{1,7}', '/(?<![A-Za-z0-9_])#[0-9]{1,7}'],
  ['issue-bare-digits-widened', 'recognizer', RECOGNIZE, '/(?<![A-Za-z0-9_&#\\/.-])#[0-9]{1,7}(?![A-Za-z0-9_])/g', '/(?<![A-Za-z0-9_&#\\/.-])#[0-9]{1,8}(?![A-Za-z0-9_])/g'],
  ['issue-gh-dropped', 'recognizer', RECOGNIZE, '  /(?<![A-Za-z0-9_])GH-[0-9]{1,7}(?![A-Za-z0-9_])/g,\n', ''],
  ['issue-gitlab-dropped', 'recognizer', RECOGNIZE, '  /https?:\\/\\/gitlab\\.com\\/[A-Za-z0-9_.\\/-]+?\\/-\\/(?:issues|merge_requests)\\/[0-9]+(?![0-9])/g,\n', ''],
  ['java-annotation-qualified', 'recognizer', RECOGNIZE, 'java: /(?<![A-Za-z0-9_$.@])@Deprecated', 'java: /(?<![A-Za-z0-9_$@])@Deprecated'],
  ['code-pattern-every-language', 'recognizer', RECOGNIZE, 'const code = CODE_PATTERNS[language];', 'const code = CODE_PATTERNS[language] ?? CODE_PATTERNS.java;'],
  ['python-pending-dropped', 'recognizer', RECOGNIZE, '(?:Pending)?DeprecationWarning', 'DeprecationWarning'],
  ['quote-untrimmed', 'recognizer', RECOGNIZE, "quote: raw.replace(/^[ \\t]+|[ \\t]+$/gu, '')", 'quote: raw'],
  ['quote-bom-kept', 'recognizer', RECOGNIZE, "index === 0 && text.startsWith('\\uFEFF') ? 1 : starts[index]!", 'starts[index]!'],
  ['line-bare-cr-ignored', 'recognizer', RECOGNIZE, "} else if (c === 0x0d || c === 0x0a) starts.push(i + 1);", '} else if (c === 0x0a) starts.push(i + 1);'],
  // The member's dispositions, limits, labels and units.
  ['member-secret-path-read', 'member', MEMBER, "if (secretOrUnder(path.split('/'), isSecretPath)) { secretPathsLeftOut++; continue; }", ''],
  ['member-vendored-read', 'member', MEMBER, 'if (vendoredOrGeneratedPath(path)) { setApart++; continue; }', ''],
  ['member-class-gate-off', 'member', MEMBER, "if (unconsentedClass(screen.contentClass(path), inputs.consented) !== undefined) { outcomes.push(unknownFile(path, 'class-not-consented', false)); continue; }", ''],
  ['member-body-screen-off', 'member', MEMBER, "if (screened.kind === 'excluded') {", 'if (false) {'],
  ['member-value-checks-off', 'member', MEMBER, 'value.length === 0 || value.length > MANIFEST_VALUE_LIMIT || ', ''],
  ['member-read-limit', 'member', MEMBER, 'export const ROUGH_EDGES_READ_LIMIT = 1_000;', 'export const ROUGH_EDGES_READ_LIMIT = 999;'],
  ['member-listed-limit', 'member', MEMBER, 'export const ROUGH_EDGES_LISTED = 2_000;', 'export const ROUGH_EDGES_LISTED = 1_999;'],
  ['member-units-unbounded', 'member', MEMBER, 'units: units.slice(0, CENSUS_LISTED_LIMIT),', 'units,'],
  ['member-root-unit-named', 'member', MEMBER, "return slash < 0 ? null : path.slice(0, slash);", "return slash < 0 ? '.' : path.slice(0, slash);"],
  ['member-reference-content-null', 'member', MEMBER, "referenceContent: p.kind === 'issue-reference' ? 'unknown' : null,", 'referenceContent: null,'],
  // The reference page and the site.
  ['page-label-inferred', 'page', PAGE, '`Evidence: label Observed; line ${marker.line}', '`Evidence: label Inferred; line ${marker.line}'],
  ['page-quote-unescaped', 'page', PAGE, '<q>${escape(marker.quote)}</q>', '<q>${marker.quote}</q>'],
  ['page-reference-unknown-dropped', 'page', PAGE, "const reference = marker.kind !== 'issue-reference' ? ''", "const reference = true ? ''"],
  ['page-unknown-member-drawn', 'page', PAGE, "if (member.state !== 'derived') {", 'if (false) {'],
  ['page-floor-secret-ignored', 'page', PAGE, 'const unread = r.unknown + r.secretPathsLeftOut;', 'const unread = r.unknown;'],
  ['page-deprecations-mixed', 'page', PAGE, "const rest = member.markers.filter(m => m.kind !== 'deprecation');", 'const rest = member.markers;'],
  ['site-page-without-record', 'page', SITE, 'const roughEdges = local?.derivedStructure !== undefined && local.roughEdges !== undefined ?', 'const roughEdges = local?.roughEdges !== undefined ?'],
  ['site-order-swapped', 'page', SITE, 'const referenceLinks = [...(testNames === undefined ? [] : [TEST_NAMES_PAGE]), ...(roughEdges === undefined ? [] : [ROUGH_EDGES_PAGE])];',
    'const referenceLinks = [...(roughEdges === undefined ? [] : [ROUGH_EDGES_PAGE]), ...(testNames === undefined ? [] : [TEST_NAMES_PAGE])];'],
];

const out = process.argv[2];
if (!out) throw new Error('usage: rough_edges_mutation.mjs <out.json>');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const files = [...new Set(MUTANTS.map((m) => m[2]))];
const dirty = execFileSync('git', ['status', '--porcelain', '--', ...files, ...TESTS], { encoding: 'utf8' });
if (dirty !== '') throw new Error(`refusing: source or test files differ from HEAD:\n${dirty}`);

const run = () => {
  const result = spawnSync('npx', ['vitest', 'run', ...TESTS], { encoding: 'utf8', env: process.env, maxBuffer: 64 * 1024 * 1024 });
  const text = `${result.stdout}\n${result.stderr}`.replace(/\u001b\[[0-9;]*m/gu, '');
  const failed = Number(/Tests\s+(\d+) failed/u.exec(text)?.[1] ?? 0);
  const passed = Number(/(\d+) passed/u.exec(/Tests\s+[^\n]*/u.exec(text)?.[0] ?? '')?.[1] ?? 0);
  const fileFailures = Number(/Test Files\s+(\d+) failed/u.exec(text)?.[1] ?? 0);
  return { exit: result.status, failed, passed, fileFailures };
};

const baseline = run();
if (baseline.exit !== 0 || baseline.failed !== 0 || baseline.passed === 0) throw new Error(`baseline not green: ${JSON.stringify(baseline)}`);
const results = [];
for (const [id, layer, file, oldText, newText] of MUTANTS) {
  const original = fs.readFileSync(file, 'utf8');
  const occurrences = original.split(oldText).length - 1;
  if (occurrences !== 1) { results.push({ id, layer, file, old: oldText, new: newText, outcome: 'not-applied', occurrences }); console.log(id, 'not-applied', occurrences); continue; }
  fs.writeFileSync(file, original.replace(oldText, () => newText));
  try {
    const outcome = run();
    results.push({ id, layer, file, old: oldText, new: newText, outcome: outcome.exit !== 0 && (outcome.failed > 0 || outcome.fileFailures > 0) ? 'killed' : 'survived', ...outcome });
  } finally {
    fs.writeFileSync(file, original);
  }
  console.log(id, results.at(-1).outcome);
}
const after = run();
const record = {
  subject: 'REQ-polaris-generation-034 version 2.43 rough-edge markers (syzygy-5dhm.46)',
  rule: 'AGENTS.md verification rule 6',
  commit,
  files,
  tests: TESTS,
  command: `npx vitest run ${TESTS.join(' ')}`,
  baseline,
  restored: after,
  mutants: results.length,
  killed: results.filter((r) => r.outcome === 'killed').length,
  survived: results.filter((r) => r.outcome === 'survived').map((r) => r.id),
  notApplied: results.filter((r) => r.outcome === 'not-applied').map((r) => r.id),
  byLayer: Object.fromEntries([...new Set(results.map((r) => r.layer))].map((layer) => [layer, { mutants: results.filter((r) => r.layer === layer).length, killed: results.filter((r) => r.layer === layer && r.outcome === 'killed').length }])),
  results,
};
fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({ mutants: record.mutants, killed: record.killed, survived: record.survived, notApplied: record.notApplied }));
