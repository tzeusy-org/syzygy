// tokens.mjs: print the comment-free token stream of files at a commit, as JSON lines (R-GP-IMPL-TEST-TIMEOUTS-1).
// Usage: node tokens.mjs <repo> <commit> <typescript.js> <path>...
// A token is a leaf of the TypeScript AST (getChildren), skipping JSDoc nodes; comments are trivia and never leaves.
// Each line: {"path", "tokens": [[kindName, text, line], ...]}.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const [repo, commit, tsPath, ...paths] = process.argv.slice(2);
const ts = createRequire(import.meta.url)(tsPath);
for (const path of paths) {
  let text;
  try { text = execFileSync('git', ['-C', repo, 'show', `${commit}:${path}`], { maxBuffer: 1 << 28 }).toString('utf8'); }
  catch { process.stdout.write(JSON.stringify({ path, missing: true }) + '\n'); continue; }
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out = [];
  const walk = (n) => {
    if (n.kind >= ts.SyntaxKind.FirstJSDocNode && n.kind <= ts.SyntaxKind.LastJSDocNode) return;
    const kids = n.getChildren(sf);
    if (kids.length === 0) {
      if (n.kind === ts.SyntaxKind.EndOfFileToken) return;
      out.push([ts.SyntaxKind[n.kind], n.getText(sf), sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1]);
      return;
    }
    for (const k of kids) walk(k);
  };
  walk(sf);
  process.stdout.write(JSON.stringify({ path, tokens: out }) + '\n');
}
