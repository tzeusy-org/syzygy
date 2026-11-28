#!/usr/bin/env node
// Rule-6 mutation run for syzygy-5dhm.116 (REQ-polaris-generation-034 version 2.51, the cliffs).
// Usage: node docs/evidence/syzygy-5dhm-116/cliffs_mutation.mjs <out.json>
// Applies each mutant (an exact, unique old -> new fragment) to a clean tree, runs the cliffs test files, records the failed-test count read
// from vitest's output, and restores the file byte for byte. Refuses to start on a dirty source or test file. It is the docs and code's run
// (docs/evidence/syzygy-5dhm-119/docs_and_code_mutation.mjs) over this version's files and predicates.
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';

const SRC = 'packages/polaris-dossier/src';
const RECOGNIZE = `${SRC}/limits-recognize.ts`;
const MEMBER = `${SRC}/limits.ts`;
const PAGE = 'apps/three-surface-poc/src/polaris-generation/dossier-cliffs.ts';
const SITE = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts';
const TESTS = [`${SRC}/limits-recognize.test.ts`, `${SRC}/limits.test.ts`, 'apps/three-surface-poc/src/polaris-generation/dossier-cliffs.test.ts'];

// [id, layer, file, old, new]
const MUTANTS = [
  // The recognizer: candidates, names, definition forms, value forms and the two line grammars.
  ['candidate-bare-extension', 'recognizer', RECOGNIZE, '&& base.length > e.length;', ';'],
  ['candidate-yaml-any-name', 'recognizer', RECOGNIZE, '|| (base.startsWith(c.yamlPrefix) && c.yamlExtensions', '|| (c.yamlExtensions'],
  ['candidate-ini-dropped', 'recognizer', RECOGNIZE, "if (c.ini.some(ends)) return { source: 'config', form: 'ini' };", ''],
  ['name-lower-case', 'recognizer', RECOGNIZE, "const NAME = '(?<name>_*[A-Z][A-Z0-9_]*)';", "const NAME = '(?<name>_*[A-Za-z][A-Za-z0-9_]*)';"],
  ['max-inside-word', 'recognizer', RECOGNIZE, 'max: /(?:^|_)MAX/', 'max: /MAX/'],
  ['default-anywhere', 'recognizer', RECOGNIZE, 'default: /^_*DEFAULT_/', 'default: /DEFAULT_/'],
  ['kind-precedence-reversed', 'recognizer', RECOGNIZE, 'return LIMIT_DEFAULT.kinds.find(', 'return [...LIMIT_DEFAULT.kinds].reverse().find('],
  ['python-equality-taken', 'recognizer', RECOGNIZE, "python: new RegExp(`^[ \\\\t]*${NAME}[ \\\\t]*(?::[^=\\\\r\\\\n]*)?=(?!=)", "python: new RegExp(`^[ \\\\t]*${NAME}[ \\\\t]*(?::[^=\\\\r\\\\n]*)?="],
  ['javascript-arrow-taken', 'recognizer', RECOGNIZE, '(?:const|let|var)[ \\\\t]+${NAME}[ \\\\t]*(?::[^=\\\\r\\\\n]*)?=(?![=>])', '(?:const|let|var)[ \\\\t]+${NAME}[ \\\\t]*(?::[^=\\\\r\\\\n]*)?=(?![=])'],
  ['javascript-field-dropped', 'recognizer', RECOGNIZE, 'javascript: [LIMIT_PATTERNS.javascript, LIMIT_PATTERNS.javascriptField],', 'javascript: [LIMIT_PATTERNS.javascript],'],
  ['java-semicolon-optional', 'recognizer', RECOGNIZE, '${NAME}[ \\\\t]*=(?!=)[ \\\\t]*(?<value>.*?)[ \\\\t]*;[ \\\\t]*$`, \'d\'),\n  cDefine', '${NAME}[ \\\\t]*=(?!=)[ \\\\t]*(?<value>.*?)[ \\\\t]*;?[ \\\\t]*$`, \'d\'),\n  cDefine'],
  ['c-declaration-dropped', 'recognizer', RECOGNIZE, 'c: [LIMIT_PATTERNS.cDefine, LIMIT_PATTERNS.cDeclaration],', 'c: [LIMIT_PATTERNS.cDefine],'],
  ['comments-read', 'recognizer', RECOGNIZE, 'const code = lineText(lines, index, scanned.code);', 'const code = lineText(lines, index);'],
  ['unterminated-read-past', 'recognizer', RECOGNIZE, 'if (!scanned.ok) return { ok: false, parseFault: scanned.fault };', 'if (!scanned.ok) return { ok: true, limits: [], sequenceItems: 0 };'],
  ['non-limit-tries-next-form', 'recognizer', RECOGNIZE, '      if (kind === undefined) break;\n', '      if (kind === undefined) continue;\n'],
  ['partial-string-taken', 'recognizer', RECOGNIZE, 'string !== undefined && string.end === offset + to ? string : undefined', 'string'],
  ['formatted-string-typed', 'recognizer', RECOGNIZE, "string.value !== null && !LIMIT_PATTERNS.formatted.test(value) ? 'string' : null", "string.value !== null ? 'string' : null"],
  ['parentheses-not-stripped', 'recognizer', RECOGNIZE, '  const inner = withoutEnclosingParentheses(value);\n', '  const inner = value;\n'],
  ['parentheses-stripped-unpaired', 'recognizer', RECOGNIZE, '    if (closesEarly) break;\n', ''],
  ['decimal-as-integer', 'recognizer', RECOGNIZE, "(LIMIT_PATTERNS.decimal.test(text) ? 'decimal' : 'integer')", "'integer'"],
  ['expression-single-operand', 'recognizer', RECOGNIZE, 'return !expectOperand && depth === 0 && operators > 0;', 'return !expectOperand && depth === 0;'],
  ['expression-unbalanced', 'recognizer', RECOGNIZE, 'return !expectOperand && depth === 0 && operators > 0;', 'return !expectOperand && operators > 0;'],
  ['expression-close-unchecked', 'recognizer', RECOGNIZE, '      if (--depth < 0) return false;\n', '      --depth;\n'],
  ['expression-any-unary', 'recognizer', RECOGNIZE, "else if (g['operator'] !== '-' && g['operator'] !== '+') return false;", "else if (g['operator'] === undefined) return false;"],
  ['value-evaluated-name', 'recognizer', RECOGNIZE, "  return isExpression(inner) ? 'expression' : null;\n}", "  return isExpression(inner) || /^[A-Z_]+$/.test(inner) ? 'expression' : null;\n}"],
  ['bom-kept', 'recognizer', RECOGNIZE, "source.slice(index === 0 && lines.text.startsWith('\uFEFF') ? 1 : lines.starts[index]!", 'source.slice(lines.starts[index]!'],
  ['quote-untrimmed', 'recognizer', RECOGNIZE, ".replace(/^[ \\t]+|[ \\t]+$/gu, '');", ';'],
  ['ini-key-only-fault', 'recognizer', RECOGNIZE, '    const k = LIMIT_PATTERNS.iniKeyOnly.exec(line);\n', '    const k = null as RegExpExecArray | null;\n'],
  ['ini-section-ignored', 'recognizer', RECOGNIZE, "(section === null ? key : `${section}.${key}`)", '(key)'],
  // Review repairs (R-CLIFFS-1 F2, F3): ini continuation lines, and yaml lines read past an entry with a value.
  ['ini-continuation-ignored', 'recognizer', RECOGNIZE, '    if (last !== null && indent > last.indent) {\n', '    if (false) {\n'],
  ['ini-continuation-equal-indent', 'recognizer', RECOGNIZE, '    if (last !== null && indent > last.indent) {\n', '    if (last !== null && indent >= last.indent) {\n'],
  ['ini-continuation-keeps-value', 'recognizer', RECOGNIZE, '      } else limits[last.at] = { ...limits[last.at]!, value: null, valueType: null };\n', '      }\n'],
  ['ini-key-continuation-dropped', 'recognizer', RECOGNIZE, "        limits.push({ source: 'config', kind: 'entry', name: named(last.key), value: null, valueType: null, line: last.index + 1, quote: quoteOf(lines, last.index) });\n        last = { indent: last.indent, at: limits.length - 1 };\n", ''],
  ['ini-section-keeps-last', 'recognizer', RECOGNIZE, "section = s.groups!['section']!.trim(); last = null; continue; }", "section = s.groups!['section']!.trim(); continue; }"],
  ['yaml-valued-deeper-read', 'recognizer', RECOGNIZE, "    if (valuedAt !== null && indent > valuedAt) return { ok: false, parseFault: 'outside-grammar' };\n", ''],
  ['yaml-valued-not-reset', 'recognizer', RECOGNIZE, '    valuedAt = null;\n    if (item', '    if (item'],
  ['yaml-plain-mapping-read', 'recognizer', RECOGNIZE, "    if (LIMIT_PATTERNS.yamlPlainMapping.test(plain)) return { ok: false, parseFault: 'outside-grammar' };\n", ''],
  ['ini-block-read', 'recognizer', RECOGNIZE, "if (e === null || e.groups!['value']!.endsWith('{'))", 'if (e === null)'],
  ['ini-boolean-as-text', 'recognizer', RECOGNIZE, "  if (LIMIT_PATTERNS.iniBoolean.test(value)) return 'boolean';\n", ''],
  ['ini-string-as-text', 'recognizer', RECOGNIZE, "return LIMIT_PATTERNS.iniString.test(value) ? 'string' : 'text';", "return 'text';"],
  ['yaml-tab-read', 'recognizer', RECOGNIZE, "    if (LIMIT_PATTERNS.yamlTab.test(line)) return { ok: false, parseFault: 'outside-grammar' };\n", ''],
  ['yaml-items-read', 'recognizer', RECOGNIZE, '    if (item !== null) { sequenceItems++; skipUnder = { indent, items: true }; continue; }\n', '    if (item !== null) { sequenceItems++; continue; }\n'],
  ['yaml-items-uncounted', 'recognizer', RECOGNIZE, '        if (item !== null && indent === skipUnder.indent) sequenceItems++;\n', ''],
  ['yaml-parents-kept', 'recognizer', RECOGNIZE, '    while (parents.length > 0 && parents.at(-1)!.indent >= indent) parents.pop();\n', ''],
  ['yaml-parent-not-joined', 'recognizer', RECOGNIZE, "const name = [...parents.map((p) => p.name), key].join('.');", 'const name = key;'],
  ['yaml-node-read', 'recognizer', RECOGNIZE, "    if (LIMIT_PATTERNS.yamlNode.test(raw)) return { ok: false, parseFault: 'outside-grammar' };\n", ''],
  ['yaml-open-quote-read', 'recognizer', RECOGNIZE, "      if (q === null) return { ok: false, parseFault: 'outside-grammar' };\n      entry(q.groups!['quoted']!, 'string');", "      entry(q === null ? raw : q.groups!['quoted']!, 'string');"],
  ['yaml-comment-kept', 'recognizer', RECOGNIZE, "const plain = raw.replace(LIMIT_PATTERNS.yamlComment, '');", 'const plain = raw;'],
  ['yaml-block-lines-read', 'recognizer', RECOGNIZE, '{ entry(null, null); skipUnder = { indent, items: false }; continue; }', '{ entry(null, null); continue; }'],
  ['yaml-open-flow-read', 'recognizer', RECOGNIZE, "      if (!plain.endsWith(plain.startsWith('[') ? ']' : '}')) return { ok: false, parseFault: 'outside-grammar' };\n", ''],
  ['yaml-null-as-text', 'recognizer', RECOGNIZE, " : LIMIT_PATTERNS.yamlNull.test(plain) ? 'null'", ''],
  // The member: dispositions, read limits, batches, value checks and counts.
  ['secret-path-read', 'member', MEMBER, '    if (secretOrUnder(path.split(\'/\'), isSecretPath)) { secretPathsLeftOut++; continue; }\n', ''],
  ['vendored-read', 'member', MEMBER, '    if (vendoredOrGeneratedPath(path)) { setApart++; continue; }\n', ''],
  ['symlink-read', 'member', MEMBER, "    if (mode === '120000') { outcomes.push(unknownFile(path, source, 'symbolic-link', false)); continue; }\n", ''],
  ['class-gate-dropped', 'member', MEMBER, "    if (unconsentedClass(screen.contentClass(path), inputs.consented) !== undefined) { outcomes.push(unknownFile(path, source, 'class-not-consented', false)); continue; }\n", ''],
  ['read-limit-off-by-one', 'member', MEMBER, 'if (readable[source] >= limitOf[source])', 'if (readable[source] > limitOf[source])'],
  ['read-limit-shared', 'member', MEMBER, 'if (readable[source] >= limitOf[source])', 'if (readable.code + readable.config >= limitOf[source])'],
  ['batch-whole-refused', 'member', MEMBER, '    if (!(cause instanceof GitObjectReadRefusal)) throw cause;\n  }\n  const out', '    if (!(cause instanceof GitObjectReadRefusal)) throw cause;\n    return entries.map(() => cause);\n  }\n  const out'],
  ['batch-other-error-swallowed', 'member', MEMBER, '  } catch (cause) {\n    if (!(cause instanceof GitObjectReadRefusal)) throw cause;\n  }\n', '  } catch (cause) {\n  }\n'],
  ['too-large-unchecked', 'member', MEMBER, "  if (read.bytes.byteLength > MANIFEST_BLOB_LIMIT) return unknownFile(path, source, 'too-large', true);\n", ''],
  ['active-content-read', 'member', MEMBER, "  if (screened.kind === 'excluded') {", "  if (screened.kind === 'excluded' && screened.outcome !== 'active-content') {"],
  ['unparsed-read', 'member', MEMBER, "  if (!recognized.ok) return unknownFile(path, source, 'unparsed', true, recognized.parseFault);", "  if (!recognized.ok) return { entry: { path, source, epistemic: 'observed', unknownReason: null, parseFault: null, rows: 0, valuesLeftOut: 0 }, read: true, rows: [], sequenceItems: 0 };"],
  ['value-check-dropped', 'member', MEMBER, '    if (refusedValue(found.quote)) { leftOut++; return; }\n', ''],
  ['value-secret-unchecked', 'member', MEMBER, " || screen.screenBody(value) === 'secret-detector-match';", ';'],
  ['value-limit-unchecked', 'member', MEMBER, ' || value.length > MANIFEST_VALUE_LIMIT', ''],
  ['unknown-value-observed', 'member', MEMBER, "epistemic: found.valueType === null ? 'unknown' : 'observed'", "epistemic: 'observed'"],
  ['rows-unsorted', 'member', MEMBER, '  pending.sort((a, b) => byCodeUnit(a.row.path, b.row.path) || a.row.line - b.row.line || a.order - b.order);\n', ''],
  ['rows-listed-uncapped', 'member', MEMBER, 'pending.slice(0, LIMITS_LISTED)', 'pending'],
  ['sequence-items-uncounted', 'member', MEMBER, '    sequenceItemsNotRead += outcome.sequenceItems;\n', ''],
  ['values-unknown-uncounted', 'member', MEMBER, "    if (p.epistemic === 'unknown') row.valuesUnknown++;\n", ''],
  ['unit-without-row-dropped', 'member', MEMBER, '  for (const unit of unitFiles.keys()) rows.set(unit, { constants: 0, entries: 0, valuesUnknown: 0 });\n', '  for (const { row: p } of pending) rows.set(unitOf(p.path), { constants: 0, entries: 0, valuesUnknown: 0 });\n'],
  ['unknown-files-first', 'member', MEMBER, 'const files = [...outcomes.filter((o) => o.read), ...outcomes.filter((o) => !o.read)]', 'const files = [...outcomes.filter((o) => !o.read), ...outcomes.filter((o) => o.read)]'],
  // The page and the site.
  ['page-unknown-row-valued', 'page', PAGE, "  if (row.epistemic === 'unknown' || row.value === null || row.valueType === null) {", '  if (row.value === null || row.valueType === null) {'],
  ['page-row-reason-unchecked', 'page', PAGE, "    if (row.unknownReason !== 'value-not-literal') throw new Error('cliffs: a row reason this version does not name');\n", ''],
  ['page-file-reason-unchecked', 'page', PAGE, "  if (!Object.hasOwn(FILE_REASON, key)) throw new Error('cliffs: a file reason this version does not name');\n", ''],
  ['page-kind-unchecked', 'page', PAGE, "  if (!Object.hasOwn(KIND_WORDS, row.kind)) throw new Error('cliffs: a kind this version does not name');\n", ''],
  ['page-class-reason-merged', 'page', PAGE, "'class-not-consented': 'unconsented-source-or-provider'", "'class-not-consented': 'excluded-content'"],
  ['page-floor-without-secret', 'page', PAGE, 'const unread = r.unknown + r.secretPathsLeftOut;', 'const unread = r.unknown;'],
  ['page-coverage-sentence-dropped', 'page', PAGE, "    + 'JSON, TOML and environment-file configuration, command-line flag defaults and values computed at run time are not read by this version, so a limit set only there is not on this page. '\n", ''],
  ['page-quote-dropped', 'page', PAGE, '(${row.valueType}).`)} <q>${escape(row.quote)}</q>', '(${row.valueType}).`)}'],
  ['page-unknown-files-uncounted', 'page', PAGE, "    + (unknownNotListed === 0 ? '' :", "    + (true ? '' :"],
  ['site-machine-dropped', 'site', SITE, "      ...(cliffs === undefined ? {} : { limitsAndDefaults: cliffsMachine(cliffs.member) }),\n", ''],
  ['site-page-dropped', 'site', SITE, '  if (cliffs !== undefined) add(CLIFFS_PAGE.path, 1, CLIFFS_PAGE.title, cliffsPage(cliffs.member, cliffs.derived.revision));\n', ''],
  ['site-legend-dropped', 'site', SITE, '    : cliffs !== undefined && path === CLIFFS_PAGE.path ? `${CLIFFS_LEGEND}${main}`\n', ''],
  ['site-link-dropped', 'site', SITE, ', ...(cliffs === undefined ? [] : [CLIFFS_PAGE])]', ']'],
];

const out = process.argv[2];
if (!out) throw new Error('usage: cliffs_mutation.mjs <out.json>');
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
  subject: 'REQ-polaris-generation-034 version 2.51 the cliffs (syzygy-5dhm.116)',
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
