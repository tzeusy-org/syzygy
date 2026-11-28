#!/usr/bin/env node
// Rule-6 mutation run for syzygy-5dhm.119 (REQ-polaris-generation-034 version 2.48 docs and code).
// Usage: node docs/evidence/syzygy-5dhm-119/docs_and_code_mutation.mjs <out.json>
// Applies each mutant (an exact, unique old -> new fragment) to a clean tree, runs the docs-and-code test files, records the failed-test
// count read from vitest's output, and restores the file byte for byte. Refuses to start on a dirty source or test file.
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';

const SRC = 'packages/polaris-dossier/src';
const RECOGNIZE = `${SRC}/doc-references-recognize.ts`;
const MEMBER = `${SRC}/doc-references.ts`;
const PAGE = 'apps/three-surface-poc/src/polaris-generation/dossier-docs-and-code.ts';
const SITE = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts';
const TESTS = [`${SRC}/doc-references-recognize.test.ts`, `${SRC}/doc-references.test.ts`, 'apps/three-surface-poc/src/polaris-generation/dossier-docs-and-code.test.ts'];

// [id, layer, file, old, new]
const MUTANTS = [
  // The recognizer: forms, quotes and links.
  ['path-form-space-allowed', 'recognizer', RECOGNIZE, 'const PATH_FORM = /^[A-Za-z0-9_@+.-]+(?:\\/[A-Za-z0-9_@+.-]+)*\\/?$/;', 'const PATH_FORM = /^[A-Za-z0-9_@+. -]+(?:\\/[A-Za-z0-9_@+. -]+)*\\/?$/;'],
  ['line-suffix-kept', 'recognizer', RECOGNIZE, "const bare = value.replace(LINE_SUFFIX, '');", 'const bare = value;'],
  ['dot-segment-anywhere', 'recognizer', RECOGNIZE, "if (firstOther < 0 || segments.slice(firstOther).some((s) => s === '.' || s === '..')) return undefined;", "if (firstOther < 0) return undefined;"],
  ['bare-any-extension', 'recognizer', RECOGNIZE, 'if (ext !== undefined && !BARE.has(ext) && !WEAK.has(ext)) return undefined;', ''],
  ['weak-not-ambiguous', 'recognizer', RECOGNIZE, 'ambiguous: ext !== undefined && WEAK.has(ext), outside: false', 'ambiguous: false, outside: false'],
  ['slashed-no-extension-not-ambiguous', 'recognizer', RECOGNIZE, 'ambiguous: !(directory || relative || extension !== null)', 'ambiguous: false'],
  ['relative-span-gets-tail', 'recognizer', RECOGNIZE, 'tail: relative || tries.length === 0 ? null : tries[0]!', 'tail: tries.length === 0 ? null : tries[0]!'],
  ['code-mark-dropped', 'recognizer', RECOGNIZE, 'IDENTIFIER_FORM.test(value) && CODE_MARK.test(value)', 'IDENTIFIER_FORM.test(value)'],
  ['identifier-name-first-part', 'recognizer', RECOGNIZE, 'const name = parts[parts.length - 1]!;', 'const name = parts[0]!;'],
  ['commonmark-strip-dropped', 'recognizer', RECOGNIZE, "if (value.length >= 2 && value.startsWith(' ') && value.endsWith(' ') && value.trim() !== '') value = value.slice(1, -1);", ''],
  ['bom-kept', 'recognizer', RECOGNIZE, "const from = lo === 0 && text.startsWith('\\uFEFF') ? 1 : starts[lo]!;", 'const from = starts[lo]!;'],
  ['bare-cr-not-a-line', 'recognizer', RECOGNIZE, 'else if (c === 0x0d || c === 0x0a) starts.push(i + 1);', 'else if (c === 0x0a) starts.push(i + 1);'],
  ['excerpt-low-surrogate-split', 'recognizer', RECOGNIZE, 'if (start > 0 && (quote.charCodeAt(start) & 0xfc00) === 0xdc00) start++;', ''],
  ['excerpt-high-surrogate-split', 'recognizer', RECOGNIZE, 'if (end < quote.length && (quote.charCodeAt(end - 1) & 0xfc00) === 0xd800) end--;', ''],
  ['excerpt-no-lead-before', 'recognizer', RECOGNIZE, 'const EXCERPT_BEFORE = 64;', 'const EXCERPT_BEFORE = 0;'],
  ['malformed-read-past', 'recognizer', RECOGNIZE, 'if (recognition.malformed !== undefined) return { ok: false, parseFault: recognition.malformed.reason };', ''],
  ['link-in-fence-read', 'recognizer', RECOGNIZE, 'if (isFencedAt(recognition, m.index) || spanRangesWithin', 'if (spanRangesWithin'],
  ['link-scheme-read', 'recognizer', RECOGNIZE, 'if (SCHEME.test(destination) || destination.startsWith', 'if (destination.startsWith'],
  ['link-fragment-kept', 'recognizer', RECOGNIZE, "const target = destination.replace(/[#?].*$/s, '');", 'const target = destination;'],
  ['link-not-decoded', 'recognizer', RECOGNIZE, 'try { decoded = decodeURIComponent(target); } catch { decoded = undefined; }', 'decoded = target;'],
  // The member: tree index, dispositions, resolution and counts.
  ['secret-file-in-index', 'member', MEMBER, '    if (secretOrUnder(segments, isSecretPath)) continue;\n    files.add(path);', '    files.add(path);'],
  ['tail-index-dropped', 'member', MEMBER, '      const file = c.directory ? undefined : fileByTail.get(c.tail);', '      const file = undefined;'],
  ['directory-only-takes-file', 'member', MEMBER, 'if (!c.directory && files.has(p))', 'if (files.has(p))'],
  ['submodule-ignored', 'member', MEMBER, "if (tries.some((p) => submodules.some((s) => p === s || p.startsWith(`${s}/`)))) return unknown('submodule');", ''],
  ['outside-resolves', 'member', MEMBER, "if (c.outside) return unknown('outside-tree');", ''],
  ['ambiguous-document-only', 'member', MEMBER, "if (c.ambiguous) return unknown('ambiguous-form');", ''],
  ['build-output-document-only', 'member', MEMBER, "if ([...tries, ...(c.tail === null ? [] : [c.tail])].some((p) => vendoredOrGeneratedPath(p))) return unknown('build-output-path');", ''],
  ['code-complete-assumed', 'member', MEMBER, 'const codeComplete = wanted.size > 0 && code.secretPathsLeftOut === 0 && codeUnknown.length === 0;', 'const codeComplete = wanted.size > 0;'],
  ['comments-searched', 'member', MEMBER, '        text = scanned.code;\n', ''],
  ['code-read-always', 'member', MEMBER, '  if (wanted.size > 0) {\n    for (const entry of code.toRead) {', '  if (true) {\n    for (const entry of code.toRead) {'],
  ['class-gate-dropped', 'member', MEMBER, "if (unconsentedClass(inputs.screen.contentClass(path), inputs.consented) !== undefined) { unknown.push(unknownEntry(path, 'class-not-consented')); continue; }", ''],
  ['read-limit-off-by-one', 'member', MEMBER, 'if (readable >= limit) {', 'if (readable > limit) {'],
  ['vendored-read', 'member', MEMBER, '    if (vendoredOrGeneratedPath(path)) { setApart++; continue; }\n', ''],
  ['redacted-body-read', 'member', MEMBER, "  if (screened.kind === 'redacted') return { ok: false, reason: 'redacted-body' };\n", ''],
  ['quote-unchecked', 'member', MEMBER, 'if (secretForm || refusedValue(candidate.value) || refusedValue(candidate.quote)) leftOut++;', 'if (secretForm || refusedValue(candidate.value)) leftOut++;'],
  ['secret-tail-unchecked', 'member', MEMBER, '[candidate.value, ...candidate.tryPaths, ...(candidate.tail === null ? [] : [candidate.tail])]', '[candidate.value]'],
  ['rows-listed-unbounded', 'member', MEMBER, 'rows.slice(0, DOC_ROWS_LISTED)', 'rows'],
  ['token-boundary-dropped', 'member', MEMBER, 'export const TOKEN = /(?<![A-Za-z0-9_$])[A-Za-z_$][A-Za-z0-9_$]*/g;', 'export const TOKEN = /[A-Za-z_$][A-Za-z0-9_$]*/g;'],
  // The page and the site.
  ['page-unknown-member-drawn', 'page', PAGE, "if (member.state !== 'derived') {", 'if (false) {'],
  ['page-floor-secret-ignored', 'page', PAGE, 'const unread = d.unknown + d.secretPathsLeftOut;', 'const unread = d.unknown;'],
  ['page-quote-unescaped', 'page', PAGE, '<q>${escape(row.quote)}</q>', '<q>${row.quote}</q>'],
  ['page-excerpt-unsaid', 'page', PAGE, "${row.quoteExcerpt ? ` ${escape('(an exact excerpt of the line)')}` : ''}", ''],
  ['page-unknown-files-mixed', 'page', PAGE, "const listed = files.filter(file => file.epistemic === 'unknown');", 'const listed = files;'],
  ['site-page-without-record', 'page', SITE, 'const docsAndCode = local?.derivedStructure !== undefined && local.docsAndCode !== undefined ?', 'const docsAndCode = local?.docsAndCode !== undefined ?'],
  ['site-order-swapped', 'page', SITE, '...(roughEdges === undefined ? [] : [ROUGH_EDGES_PAGE]), ...(docsAndCode === undefined ? [] : [DOCS_AND_CODE_PAGE])]',
    '...(docsAndCode === undefined ? [] : [DOCS_AND_CODE_PAGE]), ...(roughEdges === undefined ? [] : [ROUGH_EDGES_PAGE])]'],
];

const out = process.argv[2];
if (!out) throw new Error('usage: docs_and_code_mutation.mjs <out.json>');
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
  subject: 'REQ-polaris-generation-034 version 2.48 docs and code (syzygy-5dhm.119)',
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
