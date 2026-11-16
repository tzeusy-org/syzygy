// Reviewer's independent comment-only check: the TypeScript scanner's token stream (kind and text, trivia skipped) of one file at two
// commits, plus the comment-free text with every comment's line count kept. Mutants: a type-only change and a string change must differ.
// Usage: node token_compare.cjs <tree> <base> <head> <file>
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const [tree, base, head, file] = process.argv.slice(2);
const ts = require(path.join(tree, 'node_modules', 'typescript'));
const show = (c) => execFileSync('git', ['-C', tree, 'show', `${c}:${file}`], { encoding: 'utf8' });
function tokens(text) {
  // Leaf tokens of the parsed tree (the parser rescans regex and template literals); comments are trivia and never leaves.
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out = [];
  const walk = (node) => {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return;  // getChildren includes JSDoc
    const kids = node.getChildren(sf);
    if (kids.length === 0) out.push(`${node.kind}:${node.getText(sf)}`);
    else kids.forEach(walk);
  };
  walk(sf);
  const comments = (text.match(/\/\*[\s\S]*?\*\//g) || []).length;
  return { tokens: out, comments };
}
const compare = (a, b) => {
  const x = tokens(a), y = tokens(b);
  return { tokensBase: x.tokens.length, tokensHead: y.tokens.length, equal: JSON.stringify(x.tokens) === JSON.stringify(y.tokens),
    commentsBase: x.comments, commentsHead: y.comments, linesBase: a.split('\n').length, linesHead: b.split('\n').length };
};
const before = show(base), after = show(head);
const once = (t, o, n) => { if (t.split(o).length !== 2) throw new Error(`not once: ${o}`); return t.replace(o, n); };
console.log(JSON.stringify({
  real: compare(before, after),
  typeOnlyMutant: compare(before, once(after, 'function localNames(', 'function localNames<T>(')),
  stringMutant: compare(before, once(after, '|npm:|', '|npm :|')),
  commentMutant: compare(before, `/* x */\n${after}`),
}, null, 1));
