// Remove the `export` keyword from named declarations, in place.
//
// Usage: node unexport.mjs <repo-root> <targets.json>
//   targets.json: [{ "file": "packages/x/src/a.ts", "name": "foo" }, ...]
//   stdout: JSON { unexported: [{file,name,sites}], unplaced: [{file,name,reason}] }
//
// Edits come from the TypeScript parse tree: every top-level declaration of the
// name that carries `export` (all overload signatures and the implementation, a
// type and a value of one name alike) loses the keyword and the blank run after
// it; nothing else in the file is touched. A name that cannot be edited alone is
// reported, never guessed: a variable statement declaring several names, an
// `export { }` specifier list entry (removed only when it is a plain specifier),
// a re-export. Nothing is written for a file with an unplaced target unless the
// other targets of that file were placed.
import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2]);
const targets = JSON.parse(readFileSync(process.argv[3], 'utf8'));
const byFile = new Map();
for (const t of targets) byFile.set(t.file, [...(byFile.get(t.file) ?? []), t.name]);

const report = { unexported: [], unplaced: [] };
for (const [file, names] of byFile) {
  const full = path.join(root, file);
  const text = readFileSync(full, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits = []; // [start, end)
  const placed = new Map(names.map((n) => [n, 0]));
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause) && !statement.moduleSpecifier) {
        for (const name of names) {
          const hit = statement.exportClause.elements.filter((e) => e.name.text === name);
          if (hit.length) report.unplaced.push({ file, name, reason: 'export-list specifier: edit by hand' });
        }
      }
      continue;
    }
    const modifiers = ts.getModifiers(statement) ?? [];
    const exportModifier = modifiers.find((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exportModifier) continue;
    let declared = [];
    if (ts.isVariableStatement(statement)) {
      declared = statement.declarationList.declarations.map((d) => (ts.isIdentifier(d.name) ? d.name.text : null));
      const hit = names.filter((n) => declared.includes(n));
      if (hit.length && declared.length > 1) { for (const name of hit) report.unplaced.push({ file, name, reason: 'variable statement declares several names' }); continue; }
      if (hit.length && declared.some((d) => d === null)) { for (const name of hit) report.unplaced.push({ file, name, reason: 'destructuring declaration' }); continue; }
    } else if (statement.name && ts.isIdentifier(statement.name)) {
      declared = [statement.name.text];
    }
    for (const name of names) {
      if (!declared.includes(name)) continue;
      const start = exportModifier.getStart(source);
      let end = exportModifier.getEnd();
      while (end < text.length && /[ \t]/.test(text[end])) end += 1;
      edits.push([start, end]);
      placed.set(name, placed.get(name) + 1);
    }
  }
  for (const [name, sites] of placed) {
    if (sites > 0) report.unexported.push({ file, name, sites });
    else if (!report.unplaced.some((u) => u.file === file && u.name === name)) report.unplaced.push({ file, name, reason: 'no exported top-level declaration found' });
  }
  edits.sort((a, b) => b[0] - a[0]);
  let out = text;
  for (const [start, end] of edits) out = out.slice(0, start) + out.slice(end);
  if (out !== text) writeFileSync(full, out, 'utf8');
}
process.stdout.write(JSON.stringify(report));
