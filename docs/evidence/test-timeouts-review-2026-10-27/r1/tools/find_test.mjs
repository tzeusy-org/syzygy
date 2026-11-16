// find_test.mjs: for a title fragment, the registration call's argument count and end line at a commit
// (R-GP-IMPL-TEST-TIMEOUTS-1). Usage: node find_test.mjs <repo> <commit> <typescript.js> <path> <title fragment>
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const [repo, commit, tsPath, path, frag] = process.argv.slice(2);
const ts = createRequire(import.meta.url)(tsPath);
const text = execFileSync('git', ['-C', repo, 'show', `${commit}:${path}`]).toString('utf8');
const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
const ln = (p) => sf.getLineAndCharacterOfPosition(p).line + 1;
const visit = (n) => {
  if (ts.isCallExpression(n) && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0]) && n.arguments[0].text.includes(frag))
    console.log(JSON.stringify({ commit, path, startLine: ln(n.getStart(sf)), endLine: ln(n.getEnd()), args: n.arguments.length, callee: n.expression.getText(sf).slice(0, 40) }));
  ts.forEachChild(n, visit);
};
visit(sf);
