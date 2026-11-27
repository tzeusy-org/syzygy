#!/usr/bin/env node
// Rule-6 mutation run for syzygy-5dhm.45 (REQ-polaris-generation-034 version 2.38 test-name recognizers).
// Usage: node docs/evidence/syzygy-5dhm-45/test_names_mutation.mjs <out.json>
// Applies each mutant (an exact, unique old -> new fragment) to a clean tree, runs the three test-name test files, records the
// failed-test count read from vitest's output, and restores the file byte for byte. Refuses to start on a dirty source or test file.
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';

const SRC = 'packages/polaris-dossier/src';
const LEXER = `${SRC}/test-names-lexer.ts`;
const RECOGNIZE = `${SRC}/test-names-recognize.ts`;
const MEMBER = `${SRC}/test-names.ts`;
const RULES = `${SRC}/derive-rules.ts`;
const PAGE = 'apps/three-surface-poc/src/polaris-generation/dossier-test-names.ts';
const SITE = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts';
const TESTS = [`${SRC}/test-names-recognize.test.ts`, `${SRC}/test-names.test.ts`, 'apps/three-surface-poc/src/polaris-generation/dossier-test-names.test.ts'];

// [id, recognizer or layer, file, old, new]
const MUTANTS = [
  // The lexer every recognizer reads through.
  ['lexer-line-comment-kept', 'lexer', LEXER, "if (c === '/' && next === '/') {", 'if (false) {'],
  ['lexer-block-comment-kept', 'lexer', LEXER, "if (c === '/' && next === '*') {", 'if (false) {'],
  ['lexer-string-interior-kept', 'lexer', LEXER, 'this.parts.push(open + blank(inner) + close);', 'this.parts.push(open + inner + close);'],
  ['lexer-escape-ignored', 'lexer', LEXER, "if (c === '\\\\') { i++; continue; }\n    if (singleLine", 'if (singleLine'],
  ['lexer-regex-literal-kept', 'lexer', LEXER, "if (c === '/' && options.javascript === true && opensRegex(text, i)) {", 'if (false) {'],
  ['lexer-python-comment-kept', 'lexer', LEXER, "if (c === '#') {", 'if (false) {'],
  ['lexer-python-triple-as-single', 'lexer', LEXER, 'text.startsWith(text[q]!.repeat(3), q) ? text[q]!.repeat(3) : text[q]!', 'text[q]!'],
  ['lexer-java-text-block-kept', 'lexer', LEXER, "if (options.java === true && text.startsWith('\"\"\"', i)) {", 'if (false) {'],
  ['lexer-go-raw-string-as-quoted', 'lexer', LEXER, "if (c === '`' && options.go === true) {", 'if (false) {'],
  // pytest-test-name.
  ['pytest-any-def', 'pytest-test-name', RECOGNIZE, 'def[ \\t]+(test[A-Za-z0-9_]*)', 'def[ \\t]+([A-Za-z0-9_]*)'],
  ['pytest-any-class', 'pytest-test-name', RECOGNIZE, 'class[ \\t]+(Test[A-Za-z0-9_]*)', 'class[ \\t]+([A-Za-z0-9_]*)'],
  ['pytest-no-async', 'pytest-test-name', RECOGNIZE, '(?:(?:async[ \\t]+)?def', '(?:def'],
  ['pytest-suffix-path-dropped', 'pytest-test-name', RECOGNIZE, ' || PYTEST_TEST_NAME.suffixes.some((s) => base.endsWith(s))', ''],
  // js-test-call.
  ['js-member-call-read', 'js-test-call', RECOGNIZE, '(?<![\\\\w$.])', ''],
  ['js-modifiers-dropped', 'js-test-call', RECOGNIZE, "((?:\\\\s*\\\\.\\\\s*(?:${JS_TEST_CALL.modifiers.join('|')}))*)", '()'],
  ['js-substitution-read', 'js-test-call', RECOGNIZE, 'if (literal === undefined || literal.value === null) continue;', 'if (literal === undefined) continue;'],
  ['js-suite-as-test', 'js-test-call', RECOGNIZE, "? 'suite' : 'test';", "? 'test' : 'test';"],
  // go-test-function.
  ['go-any-testing-type', 'go-test-function', RECOGNIZE, '[ \\t]+\\*testing\\.T[ \\t]*\\)', '[ \\t]+\\*testing\\.[A-Z][ \\t]*\\)'],
  ['go-lowercase-after-test', 'go-test-function', RECOGNIZE, '(Test(?![a-z])', '(Test'],
  ['go-bare-suffix-path', 'go-test-function', RECOGNIZE, 'basenameOf(path).endsWith(s) && basenameOf(path).length > s.length', 'basenameOf(path).endsWith(s)'],
  // junit-test-method.
  ['junit-annotation-prefix', 'junit-test-method', RECOGNIZE, "(?:${JUNIT_TEST_METHOD.annotations.join('|')})\\\\b", "(?:${JUNIT_TEST_METHOD.annotations.join('|')})"],
  ['junit-no-annotation-arguments', 'junit-test-method', RECOGNIZE, "\\\\b(?:\\\\s*\\\\([^()]*\\\\))?`;", "\\\\b`;"],
  ['junit-tests-stem-dropped', 'junit-test-method', RULES, "stemSuffixes: ['Test', 'Tests'],", "stemSuffixes: ['Test'],"],
  // The member's dispositions and unit mapping.
  ['member-secret-path-read', 'member', MEMBER, "if (secretOrUnder(path.split('/'), isSecretPath)) { secretPathsLeftOut++; continue; }", ''],
  ['member-vendored-read', 'member', MEMBER, 'if (vendoredOrGeneratedPath(path)) { setApart++; continue; }', ''],
  ['member-class-gate-off', 'member', MEMBER, "if (unconsentedClass(screen.contentClass(path), inputs.consented) !== undefined) { outcomes.push(unknownFile(path, 'class-not-consented', false)); continue; }", ''],
  ['member-body-screen-off', 'member', MEMBER, "if (screened.kind === 'excluded') {", 'if (false) {'],
  ['member-value-checks-off', 'member', MEMBER, 'value.length === 0 || value.length > MANIFEST_VALUE_LIMIT || ', ''],
  ['member-root-unit-named', 'member', MEMBER, "return slash < 0 ? null : path.slice(0, slash);", "return slash < 0 ? '.' : path.slice(0, slash);"],
  // The reference page.
  ['page-label-observed', 'page', PAGE, '`Evidence: label Inferred; declared in ${name.path}', '`Evidence: label Observed; declared in ${name.path}'],
  ['page-name-unescaped', 'page', PAGE, '${escape(`${what} ${name.name}, in ${name.path} at line ${name.line}.`)}', '${what} ${name.name}, in ${name.path} at line ${name.line}.'],
  ['page-unknown-member-drawn', 'page', PAGE, "if (member.state !== 'derived') {", 'if (false) {'],
  ['page-floor-sentence-dropped', 'page', PAGE, "const floor = unknownTotal === 0 ? ''", "const floor = true ? ''"],
  ['site-page-without-record', 'page', SITE, 'const testNames = local?.derivedStructure !== undefined && local.testNames !== undefined ?', 'const testNames = local?.testNames !== undefined ?'],
];

const out = process.argv[2];
if (!out) throw new Error('usage: test_names_mutation.mjs <out.json>');
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
  subject: 'REQ-polaris-generation-034 version 2.38 test-name recognizers (syzygy-5dhm.45)',
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
