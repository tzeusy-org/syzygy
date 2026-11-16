// List each source file's exported names from the TypeScript parse tree.
//
// Usage: node ts_exports.mjs   (stdin: JSON [{ "name": "a.ts", "text": "..." }, ...])
//        stdout: JSON [{ "name", "exports": [...sorted unique names], "star": bool, "default": bool }, ...]
//
// Reads only top-level statements. Counted as exports: a declaration carrying the
// `export` modifier (function, class, interface, type alias, enum, namespace, and
// every name of a variable statement, binding patterns included) and every
// specifier of `export { ... }` / `export type { ... }` (the exported, i.e. last,
// name). `star` is true for `export * from`, `default` for `export default` and
// `export =`. It is the independent oracle for export_census.py's declaration
// regexes: the two must give the same (file, name) set.
import ts from 'typescript';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const files = JSON.parse(Buffer.concat(chunks).toString('utf8'));

const hasExport = (node) => (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
const hasDefault = (node) => (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);

function bindingNames(name, into) {
  if (ts.isIdentifier(name)) { into.push(name.text); return; }
  for (const element of name.elements) if (ts.isBindingElement(element)) bindingNames(element.name, into);
}

const result = files.map(({ name, text }) => {
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, /\.(mjs|cjs|js)$/.test(name) ? ts.ScriptKind.JS : ts.ScriptKind.TS);
  const names = new Set();
  let star = false;
  let isDefault = false;
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) for (const e of statement.exportClause.elements) names.add(e.name.text);
      else star = true;
    } else if (ts.isExportAssignment(statement)) {
      isDefault = true;
    } else if (hasExport(statement)) {
      if (hasDefault(statement)) { isDefault = true; continue; }
      if (ts.isVariableStatement(statement)) {
        const found = [];
        for (const d of statement.declarationList.declarations) bindingNames(d.name, found);
        for (const n of found) names.add(n);
      } else if (statement.name && ts.isIdentifier(statement.name)) {
        names.add(statement.name.text);
      }
    }
  }
  return { name, exports: [...names].sort(), star, default: isDefault };
});
process.stdout.write(JSON.stringify(result));
