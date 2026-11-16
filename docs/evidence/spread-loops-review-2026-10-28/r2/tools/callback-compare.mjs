// Reviewer's check (R-GP-IMPL-SPREAD-LOOPS-2): for every it / it.each / test call of the given test files present at both commits
// (same describe path and name), is the callback text identical, and is the it.each table identical once the table identifier is
// resolved at ANY enclosing scope (not only file scope, which is all test-inventory.mjs resolves)?
// Usage: node callback-compare.mjs <root with node_modules> <base dir> <head dir> <file>...
// <base dir> and <head dir> hold the files at the two commits under the same relative paths (written by `git show`).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const [root, baseDir, headDir, ...files] = process.argv.slice(2);
const ts = createRequire(root + '/package.json')('typescript');

function inventory(dir, file) {
  const sf = ts.createSourceFile(file, readFileSync(`${dir}/${file}`, 'utf8'), ts.ScriptTarget.Latest, true);
  const rows = new Map();
  const walk = (node, path, scopes) => {
    let here = scopes;
    if (ts.isBlock(node) || ts.isSourceFile(node)) {
      const decls = new Map();
      for (const st of node.statements) if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) decls.set(d.name.text, d.initializer ? d.initializer.getText(sf) : '');
      here = [decls, ...scopes];
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const text = callee.getText(sf);
      if (/^describe$/.test(text)) {
        const name = node.arguments[0] && ts.isStringLiteralLike(node.arguments[0]) ? node.arguments[0].text : node.arguments[0]?.getText(sf);
        for (const a of node.arguments) walk(a, [...path, name], here);
        return;
      }
      let kind;
      let table = '';
      if (/^(it|test)$/.test(text)) kind = 'it';
      else if (ts.isCallExpression(callee) && /^(it|test)\.each$/.test(callee.expression.getText(sf))) {
        kind = 'each';
        const t = callee.arguments[0];
        table = t.getText(sf);
        if (ts.isIdentifier(t)) {
          const scope = here.find((s) => s.has(t.text));
          table += ' = ' + (scope ? scope.get(t.text) : '<unresolved>');
        }
      }
      if (kind) {
        const nameNode = node.arguments[0];
        const name = nameNode && ts.isStringLiteralLike(nameNode) ? nameNode.text : nameNode?.getText(sf);
        const id = [...path, name].join(' > ');
        const n = [...rows.keys()].filter((k) => k.startsWith(id + ' #')).length;
        rows.set(`${id} #${n}`, { kind, callback: node.arguments[1]?.getText(sf) ?? '', table, rest: node.arguments.slice(2).map((a) => a.getText(sf)).join(',') });
        return;
      }
    }
    ts.forEachChild(node, (c) => walk(c, path, here));
  };
  walk(sf, [], []);
  return rows;
}

const result = { files: {} };
for (const file of files) {
  const b = inventory(baseDir, file);
  const h = inventory(headDir, file);
  const common = [...b.keys()].filter((k) => h.has(k));
  const callbackChanged = common.filter((k) => b.get(k).callback !== h.get(k).callback);
  const tableChanged = common.filter((k) => b.get(k).table !== h.get(k).table);
  const optionsChanged = common.filter((k) => b.get(k).rest !== h.get(k).rest);
  result.files[file] = {
    baseCalls: b.size, headCalls: h.size, common: common.length,
    onlyBase: [...b.keys()].filter((k) => !h.has(k)), onlyHead: [...h.keys()].filter((k) => !b.has(k)),
    callbackChanged, tableChangedResolvedAnyScope: tableChanged, optionsChanged,
  };
}
console.log(JSON.stringify(result, null, 1));
