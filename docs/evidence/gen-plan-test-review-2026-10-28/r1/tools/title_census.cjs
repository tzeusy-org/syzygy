// usage: node title_census.cjs <clone> <test-file>...
// Enumerates every call in the given test files whose callee chain starts at
// `it`, `test` or `describe` (any property chain: .each, .skip, .only,
// .concurrent, .todo, ... and tagged-template `each` tables), and prints one
// JSON line per call: file, line, callee chain, the title argument's syntax
// kind, its text when literal, and whether the plan test's reader at 02eb444f
// (`it`/`test` identifiers, or `it.each(...)`/`test.each(...)` calls, with a
// string-literal-like title) would capture it.
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const clone = path.resolve(process.argv[2]);
const ts = createRequire(path.join(clone, 'package.json'))('typescript');

// The plan test's predicate, re-stated: same structure as the test's isTestCallee.
const readerCaptures = (callee) =>
  (ts.isIdentifier(callee) && ['it', 'test'].includes(callee.text)) ||
  (ts.isCallExpression(callee) && ts.isPropertyAccessExpression(callee.expression) && callee.expression.name.text === 'each' &&
    ts.isIdentifier(callee.expression.expression) && ['it', 'test'].includes(callee.expression.expression.text));

function chain(expr) {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) { const c = chain(expr.expression); return c === null ? null : `${c}.${expr.name.text}`; }
  if (ts.isCallExpression(expr)) { const c = chain(expr.expression); return c === null ? null : `${c}(...)`; }
  if (ts.isTaggedTemplateExpression(expr)) { const c = chain(expr.tag); return c === null ? null : `${c}\`...\``; }
  return null;
}

for (const rel of process.argv.slice(3)) {
  const file = path.join(clone, rel);
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const c = chain(node.expression);
      if (c !== null && /^(it|test|describe)\b/.test(c)) {
        const [title] = node.arguments;
        const kind = title === undefined ? 'none' : ts.SyntaxKind[title.kind];
        const literal = title !== undefined && ts.isStringLiteralLike(title);
        const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        process.stdout.write(JSON.stringify({
          file: rel, line, callee: c, titleKind: kind, title: literal ? title.text : (title ? title.getText().slice(0, 120) : null),
          captured: readerCaptures(node.expression) && literal,
        }) + '\n');
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
