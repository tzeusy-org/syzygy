// Split each file into top-level statements, printed without comments.
//
// Usage: node ts_statements.mjs   (stdin: JSON [{ "name": "a.d.ts", "text": "..." }, ...])
//        stdout: JSON [{ "name", "statements": [{ "kind", "exported", "names", "text" }] }, ...]
//
// `text` is TypeScript's print of the statement with comments removed. `exported`
// is true for a declaration with the `export` modifier or an `export { }` list;
// `names` are the names it declares or exports (a variable statement lists all
// of its names; an `export { a as b }` lists b; an import lists its local names).
// `kind` is the SyntaxKind name, so a reader can tell an import from a declaration.
import ts from 'typescript';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const files = JSON.parse(Buffer.concat(chunks).toString('utf8'));
const printer = ts.createPrinter({ removeComments: true });
const hasExport = (node) => (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

function bindingNames(name, into) {
  if (ts.isIdentifier(name)) { into.push(name.text); return; }
  for (const element of name.elements) if (ts.isBindingElement(element)) bindingNames(element.name, into);
}

const result = files.map(({ name, text }) => {
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, /\.(mjs|cjs|js)$/.test(name) ? ts.ScriptKind.JS : ts.ScriptKind.TS);
  const statements = source.statements.map((statement) => {
    const names = [];
    let exported = false;
    if (ts.isExportDeclaration(statement)) {
      exported = true;
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) for (const e of statement.exportClause.elements) names.push(e.name.text);
    } else if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (clause?.name) names.push(clause.name.text);
      if (clause?.namedBindings) {
        if (ts.isNamedImports(clause.namedBindings)) for (const e of clause.namedBindings.elements) names.push(e.name.text);
        else names.push(clause.namedBindings.name.text);
      }
    } else {
      exported = hasExport(statement);
      if (ts.isVariableStatement(statement)) for (const d of statement.declarationList.declarations) bindingNames(d.name, names);
      else if (statement.name && ts.isIdentifier(statement.name)) names.push(statement.name.text);
    }
    return { kind: ts.SyntaxKind[statement.kind], exported, names, text: printer.printNode(ts.EmitHint.Unspecified, statement, source) };
  });
  return { name, statements };
});
process.stdout.write(JSON.stringify(result));
