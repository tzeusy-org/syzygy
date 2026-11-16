// rev-541: is the testkit change comments only? A method independent of comment_only.cjs (which compares emit and print):
// scan each version with the TypeScript scanner and compare the sequences of non-trivia tokens (kind and exact text). The
// scanner is driven as the parser drives it: a slash where an expression may start is re-scanned as a regex literal, and a `}`
// that closes a template substitution is re-scanned as the template's middle or tail. Comment ranges come from the same pass.
// Then each changed line (an LCS over lines) is tested for lying wholly inside a comment of its own version.
// Usage: node tokens_equal.cjs <typescript module dir> <old.ts> <new.ts>
const ts = require(process.argv[2]);
const fs = require('node:fs');
const K = ts.SyntaxKind;
const REGEX_BEFORE = new Set([K.EqualsToken, K.OpenParenToken, K.CommaToken, K.Unknown, K.BarBarToken, K.AmpersandAmpersandToken,
  K.ExclamationToken, K.QuestionToken, K.ColonToken, K.ReturnKeyword, K.OpenBracketToken, K.SemicolonToken, K.OpenBraceToken,
  K.EqualsGreaterThanToken, K.QuestionQuestionToken]);

function scan(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.ES2022, false, ts.LanguageVariant.Standard, text);
  const tokens = [];
  const comments = [];
  const stack = [];
  let previous = K.Unknown;
  for (let kind = scanner.scan(); kind !== K.EndOfFileToken; kind = scanner.scan()) {
    if (kind === K.WhitespaceTrivia || kind === K.NewLineTrivia || kind === K.ShebangTrivia || kind === K.ConflictMarkerTrivia) continue;
    if (kind === K.MultiLineCommentTrivia || kind === K.SingleLineCommentTrivia) {
      comments.push([scanner.getTokenStart(), scanner.getTokenEnd()]);
      continue;
    }
    if ((kind === K.SlashToken || kind === K.SlashEqualsToken) && REGEX_BEFORE.has(previous)) kind = scanner.reScanSlashToken();
    if (kind === K.CloseBraceToken && stack.at(-1) === 'template') {
      kind = scanner.reScanTemplateToken(false);
      if (kind === K.TemplateTail) stack.pop();
    } else if (kind === K.CloseBraceToken) {
      stack.pop();
    } else if (kind === K.OpenBraceToken || kind === K.DollarToken) {
      if (kind === K.OpenBraceToken) stack.push('brace');
    } else if (kind === K.TemplateHead) {
      stack.push('template');
    }
    tokens.push(`${kind}:${scanner.getTokenText()}`);
    previous = kind;
  }
  return { tokens, comments, unbalanced: stack.length };
}

const [oldText, newText] = [process.argv[3], process.argv[4]].map((path) => fs.readFileSync(path, 'utf8'));
const a = scan(oldText);
const b = scan(newText);
let firstDiff = -1;
for (let i = 0; i < Math.max(a.tokens.length, b.tokens.length); i += 1) if (a.tokens[i] !== b.tokens[i]) { firstDiff = i; break; }

function lineSpans(text) { const spans = []; let at = 0; for (const line of text.split('\n')) { spans.push([at, at + line.length]); at += line.length + 1; } return spans; }
const inside = (spans, comments, index) => comments.some(([start, end]) => start <= spans[index][0] && spans[index][1] <= end);
const ol = oldText.split('\n'); const nl = newText.split('\n');
const dp = Array.from({ length: ol.length + 1 }, () => new Int32Array(nl.length + 1));
for (let i = ol.length - 1; i >= 0; i -= 1) for (let j = nl.length - 1; j >= 0; j -= 1) dp[i][j] = ol[i] === nl[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
const removed = []; const added = [];
for (let i = 0, j = 0; i < ol.length || j < nl.length;) {
  if (i < ol.length && j < nl.length && ol[i] === nl[j]) { i += 1; j += 1; } else if (j < nl.length && (i === ol.length || dp[i][j + 1] >= dp[i + 1][j])) { added.push(j); j += 1; } else { removed.push(i); i += 1; }
}
const os = lineSpans(oldText); const ns = lineSpans(newText);
const tsCommentOf = (comments, text, index) => { const spans = lineSpans(text); const hit = comments.find(([s, e]) => s <= spans[index][0] && spans[index][1] <= e); return hit ? text.slice(hit[0], hit[0] + 3) : null; };
console.log(JSON.stringify({
  typescript: ts.version,
  oldTokens: a.tokens.length, newTokens: b.tokens.length, tokensEqual: firstDiff === -1, unbalanced: [a.unbalanced, b.unbalanced],
  firstDiff: firstDiff === -1 ? null : { index: firstDiff, old: a.tokens[firstDiff] ?? null, new: b.tokens[firstDiff] ?? null },
  removedLines: removed.map((i) => i + 1), addedLines: added.map((j) => j + 1),
  removedOutsideComment: removed.filter((i) => !inside(os, a.comments, i)).map((i) => i + 1),
  addedOutsideComment: added.filter((j) => !inside(ns, b.comments, j)).map((j) => j + 1),
  commentOpenerOfChangedLines: [...new Set([...removed.map((i) => tsCommentOf(a.comments, oldText, i)), ...added.map((j) => tsCommentOf(b.comments, newText, j))])],
  commentsOld: a.comments.length, commentsNew: b.comments.length,
}, null, 1));
