// Static inventory of the it / it.each / test calls of the given test files: the describe path, the name, and the call's body text
// (for an it.each over a same-file const, the const's initializer too). For syzygy-bpyt.6.3 stack 4's `Tests: +a ~b -c` line.
// Usage: node test-inventory.mjs <checkout root> <test file relative to the root>...   (prints JSON; the root must hold node_modules)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const root = process.argv[2];
const require = createRequire(root + '/package.json');
const ts = require('typescript');
const out = {};
for (const file of process.argv.slice(3)) {
  const src = readFileSync(`${root}/${file}`, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
  const decls = new Map();
  for (const st of sf.statements) if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) decls.set(d.name.text, d.initializer ? d.initializer.getText(sf) : '');
  const rows = [];
  const walk = (node, path) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const text = callee.getText(sf);
      if (/^(describe|describe\.each)$/.test(text) || (ts.isCallExpression(callee) && /^describe\.each$/.test(callee.expression.getText(sf)))) {
        const name = node.arguments[0] && ts.isStringLiteralLike(node.arguments[0]) ? node.arguments[0].text : node.arguments[0]?.getText(sf);
        for (const a of node.arguments) walk(a, [...path, name ?? '']);
        return;
      }
      let kind;
      let table = '';
      if (/^(it|test)$/.test(text)) kind = 'it';
      else if (ts.isCallExpression(callee) && /^(it|test)\.each$/.test(callee.expression.getText(sf))) {
        kind = 'each';
        const t = callee.arguments[0];
        table = t.getText(sf);
        if (ts.isIdentifier(t) && decls.has(t.text)) table += ' = ' + decls.get(t.text);
      }
      if (kind) {
        const nameNode = node.arguments[0];
        const name = nameNode && ts.isStringLiteralLike(nameNode) ? nameNode.text : nameNode?.getText(sf);
        rows.push({ id: [...path, name].join(' > '), kind, body: (node.arguments[1]?.getText(sf) ?? '') + '\n' + table });
        return;
      }
    }
    ts.forEachChild(node, (c) => walk(c, path));
  };
  walk(sf, []);
  out[file] = rows;
}
console.log(JSON.stringify(out));
