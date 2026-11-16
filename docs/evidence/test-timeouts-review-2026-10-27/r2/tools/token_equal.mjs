// token_equal.mjs: whether two blobs have the same comment-free token stream: the AST's leaf tokens (node.getChildren,
// JSDoc nodes skipped), kind and text. usage: node token_equal.mjs <repo> <typescript.js> <commitA> <commitB> <path> [...]
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const [repo, tsPath, a, b, ...paths] = process.argv.slice(2);
const ts = createRequire(import.meta.url)(tsPath);
const toks = (c, p) => {
  const text = execFileSync('git', ['-C', repo, 'show', `${c}:${p}`]).toString('utf8');
  const sf = ts.createSourceFile(p, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out = [];
  const walk = (n) => {
    if (ts.isJSDoc?.(n) || n.kind === ts.SyntaxKind.JSDoc) return;
    const kids = n.getChildren(sf);
    if (kids.length === 0) { if (n.kind !== ts.SyntaxKind.EndOfFileToken) out.push(`${n.kind}:${n.getText(sf)}`); return; }
    for (const k of kids) walk(k);
  };
  walk(sf);
  return out;
};
for (const p of paths) {
  const x = toks(a, p), y = toks(b, p);
  let i = 0; while (i < x.length && i < y.length && x[i] === y[i]) i++;
  const same = x.length === y.length && i === x.length;
  console.log(p, 'tokens', x.length, y.length, same ? 'IDENTICAL' : `differ at ${i}: ${JSON.stringify(x.slice(i, i + 3)).slice(0, 200)} | ${JSON.stringify(y.slice(i, i + 3)).slice(0, 200)}`);
}
