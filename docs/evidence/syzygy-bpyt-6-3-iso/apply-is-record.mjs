// Applies the stack-4 object-predicate merge to a working tree: each listed file loses its local copy of the predicate, calls the
// one in @syzygy/support, and keeps every other byte. Usage: node apply-is-record.mjs <repo root> [--check]
//
// The change per file is three syntactic edits and nothing else:
//   1. the statement that defines the local predicate is deleted (its line, and one blank line when it stood alone between two);
//   2. every identifier that is a reference to the local name is renamed to `isRecord` (comments and strings are not identifiers);
//   3. `isRecord` is added to the file's `@syzygy/support` import, or a new import line is placed beside it.
// The definition must match the census text exactly, or the file is refused. `--check` makes no edit and reports what would change.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const check = process.argv.includes('--check');
const ts = createRequire(resolve(root, 'package.json'))('typescript');

const CANON = new Set([
  'const isObj = (value: unknown): value is Readonly<Record<string, unknown>> => value !== null && typeof value === \'object\' && !Array.isArray(value);',
  'const isObject = (value: unknown): value is Readonly<Record<string, unknown>> => value !== null && typeof value === \'object\' && !Array.isArray(value);',
  'const isObject = (value: unknown): value is Fields => value !== null && typeof value === \'object\' && !Array.isArray(value);',
  'const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === \'object\' && !Array.isArray(value);',
  'const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === \'object\' && !Array.isArray(value);',
  'function isRecord(value: unknown): value is Record<string, unknown> {\n  return typeof value === \'object\' && value !== null && !Array.isArray(value);\n}',
  'function isObject(value: unknown): value is Record<string, unknown> {\n  return value !== null && typeof value === \'object\' && !Array.isArray(value);\n}',
  'function isObj(value: Json | undefined): value is Obj {\n  return value !== null && value !== undefined && typeof value === \'object\' && !Array.isArray(value);\n}',
]);

// file -> where a new import goes when the file has no @syzygy/support import: the import statement it follows, or 'before-first' to
// precede the first relative import.
const FILES = {
  'packages/polaris-dossier/src/check.ts': {},
  'packages/polaris-dossier/src/close.ts': {},
  'packages/polaris-dossier/src/design-review.ts': {},
  'packages/polaris-dossier/src/execution-flags.ts': { after: "from 'node:path'" },
  'packages/polaris-dossier/src/inventory.ts': {},
  'packages/polaris-dossier/src/render.ts': {},
  'packages/polaris-dossier/src/review.ts': {},
  'packages/polaris-dossier/src/run-record.ts': { after: "@syzygy/polaris-generation-core/live'" },
  'packages/polaris-dossier/src/screen.ts': {},
  'packages/polaris-dossier/src/session-statement.ts': { after: "from 'node:path'" },
  'packages/polaris-dossier/src/waiting-sessions.ts': {},
  'packages/polaris-generation-core/src/discovery.ts': { before: "from './canonical-json.js'" },
  'packages/polaris-generation-core/src/dossier-evaluation.ts': {},
  'packages/polaris-generation-core/src/public-source-classification.ts': {},
  'packages/polaris-generation-core/src/reader-questions.ts': { before: "from './topics.js'" },
  'packages/polaris-generation-core/src/secret-redaction.ts': {},
  'packages/three-surface-poc-core/src/authority-artifact-fields.ts': {},
};
// Three further copies were tried by this tool and kept local, because the one signature in support cannot serve them (tsc, recorded in
// typecheck-all-20-sites-attempt.log): response-identity.ts deletes keys from the narrowed value, which Readonly<Record<..>> forbids
// (TS2542 at three lines), and the two sweep tests narrow Json | undefined to their own Obj type, which a Readonly<Record<..>> guard does
// not (TS2345, TS18047, TS2339). They decide the same as every other copy at runtime (differential.json) and differ only in type.
const OLD_NAMES = new Set(['isObj', 'isObject', 'isRecord']);

function isReference(node) {
  const p = node.parent;
  if (!p) return true;
  if (ts.isPropertyAccessExpression(p) && p.name === node) return false;
  if ((ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p) || ts.isPropertySignature(p) || ts.isPropertyDeclaration(p)) && p.name === node) return false;
  if (ts.isBindingElement(p) && p.propertyName === node) return false;
  if (ts.isQualifiedName(p) && p.right === node) return false;
  return true;
}

const report = [];
for (const [file, place] of Object.entries(FILES)) {
  const path = resolve(root, file);
  const text = readFileSync(path, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits = [];

  // 1. the one top-level definition of the predicate
  const defs = sf.statements.filter((s) => {
    if (ts.isFunctionDeclaration(s)) return s.name && OLD_NAMES.has(s.name.text);
    return ts.isVariableStatement(s) && s.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && OLD_NAMES.has(d.name.text));
  });
  if (defs.length !== 1) throw new Error(`${file}: expected one definition, found ${defs.length}`);
  const def = defs[0];
  const defText = def.getText(sf);
  if (!CANON.has(defText)) throw new Error(`${file}: the definition is not one of the censused texts:\n${defText}`);
  const oldName = ts.isFunctionDeclaration(def) ? def.name.text : def.declarationList.declarations[0].name.text;
  let start = text.lastIndexOf('\n', def.getStart(sf) - 1) + 1;
  let end = text.indexOf('\n', def.getEnd());
  end = end === -1 ? text.length : end + 1;
  const blankBefore = start === 0 || text.slice(text.lastIndexOf('\n', start - 2) + 1, start - 1).trim() === '';
  const blankAfter = text.slice(end, text.indexOf('\n', end) === -1 ? text.length : text.indexOf('\n', end)).trim() === '';
  if (blankBefore && blankAfter && end < text.length) end = text.indexOf('\n', end) + 1;
  edits.push({ start, end, text: '' });

  // 2. references
  const refs = [];
  const visit = (node) => {
    if (ts.isIdentifier(node) && node.text === oldName && node !== def.name && !(ts.isVariableDeclaration(node.parent) && node.parent.parent.parent === def) && isReference(node)) refs.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (oldName !== 'isRecord') for (const n of refs) edits.push({ start: n.getStart(sf), end: n.getEnd(), text: 'isRecord' });
  // a local binding already called isRecord, besides the definition, would collide
  if (oldName !== 'isRecord') {
    const clash = [];
    const find = (node) => { if (ts.isIdentifier(node) && node.text === 'isRecord') clash.push(node.getStart(sf)); ts.forEachChild(node, find); };
    find(sf);
    if (clash.length) throw new Error(`${file}: isRecord already named at offsets ${clash.join(',')}`);
  }

  // 3. the import
  const imports = sf.statements.filter(ts.isImportDeclaration);
  const support = imports.find((i) => i.moduleSpecifier.text === '@syzygy/support');
  if (support !== undefined) {
    const clause = support.importClause;
    if (!clause || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings) || clause.isTypeOnly) throw new Error(`${file}: unexpected support import form`);
    const names = clause.namedBindings.elements.map((e) => e.getText(sf));
    if (names.includes('isRecord')) throw new Error(`${file}: isRecord already imported`);
    const next = [...names, 'isRecord'].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    edits.push({ start: clause.namedBindings.getStart(sf), end: clause.namedBindings.getEnd(), text: `{ ${next.join(', ')} }` });
  } else {
    const line = "import { isRecord } from '@syzygy/support';\n";
    let anchor;
    if (place.after !== undefined) {
      const hit = imports.filter((i) => i.getText(sf).includes(place.after));
      if (hit.length !== 1) throw new Error(`${file}: anchor ${place.after} matched ${hit.length} imports`);
      anchor = text.indexOf('\n', hit[0].getEnd()) + 1;
    } else {
      const hit = imports.filter((i) => i.getText(sf).includes(place.before));
      if (hit.length !== 1) throw new Error(`${file}: anchor ${place.before} matched ${hit.length} imports`);
      anchor = text.lastIndexOf('\n', hit[0].getStart(sf) - 1) + 1;
    }
    edits.push({ start: anchor, end: anchor, text: line });
  }

  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  for (let i = 1; i < edits.length; i += 1) if (edits[i].end > edits[i - 1].start) throw new Error(`${file}: overlapping edits`);
  let out = text;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  report.push({ file, oldName, references: refs.length, importForm: support !== undefined ? 'added to the existing import' : 'new import line', changed: out !== text });
  if (!check) writeFileSync(path, out);
}
console.log(JSON.stringify(report, null, 1));
