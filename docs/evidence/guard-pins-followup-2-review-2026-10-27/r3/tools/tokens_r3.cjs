// rev-541c: is a change to a TypeScript file comment-only? Two independent readings of each pair of blobs:
//  - the TypeScript scanner's token stream with comments and whitespace skipped (kind and text of every token);
//  - esbuild's transform with every comment dropped (legalComments: 'none').
// Pairs are given as git blob specs (<commit>:<path>), read from the repository at argv[2]; a spec of the form file:<path> reads a
// local file instead. With --selftest, three mutants of the first pair's second blob must make the tokens differ (a code edit, a
// comment that closes early and adds a token, an identifier rename) and one (a reworded comment) must not.
// Usage: node tokens_r3.cjs <repo> <typescript dir> <esbuild dir> <a> <b> [--selftest]
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const crypto = require('node:crypto');
const [repo, tsDir, esDir, a, b] = process.argv.slice(2);
const ts = require(tsDir);
const esbuild = require(esDir);
const read = (spec) => spec.startsWith('file:') ? fs.readFileSync(spec.slice(5), 'utf8')
  : execFileSync('git', ['-C', repo, 'show', spec], { encoding: 'utf8', maxBuffer: 1 << 26 });
function tokens(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
  const out = [];
  const stack = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    // Re-scan a `/` or `/=` as a regular expression where one can start, as the parser would; a slash after an identifier,
    // literal or closing bracket stays a division.
    if ((kind === ts.SyntaxKind.SlashToken || kind === ts.SyntaxKind.SlashEqualsToken)) {
      const prev = out.length ? out[out.length - 1][0] : undefined;
      const divides = [ts.SyntaxKind.Identifier, ts.SyntaxKind.NumericLiteral, ts.SyntaxKind.StringLiteral, ts.SyntaxKind.CloseParenToken,
        ts.SyntaxKind.CloseBracketToken, ts.SyntaxKind.CloseBraceToken].includes(prev);
      if (!divides) kind = scanner.reScanSlashToken();
    }
    // Track braces so a `}` that closes a template substitution is re-scanned as the template's middle or tail, as the parser does.
    if (kind === ts.SyntaxKind.TemplateHead) stack.push('tpl');
    else if (kind === ts.SyntaxKind.OpenBraceToken) stack.push('{');
    else if (kind === ts.SyntaxKind.CloseBraceToken) {
      if (stack[stack.length - 1] === 'tpl') {
        kind = scanner.reScanTemplateToken(false);
        if (kind === ts.SyntaxKind.TemplateTail) stack.pop();
      } else stack.pop();
    }
    out.push([kind, scanner.getTokenText()]);
  }
  return out;
}
const emit = (text) => esbuild.transformSync(text, { loader: 'ts', legalComments: 'none', format: 'esm', target: 'es2022' }).code;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function compare(x, y) {
  const tx = tokens(x), ty = tokens(y);
  return { bytesDiffer: x !== y, tokens: [tx.length, ty.length], tokensEqual: JSON.stringify(tx) === JSON.stringify(ty), emitEqual: emit(x) === emit(y),
           emitSha256: [sha(emit(x)), sha(emit(y))] };
}
const x = read(a), y = read(b);
const result = { a, b, aSha256: sha(x), bSha256: sha(y), ...compare(x, y), typescript: ts.version, esbuild: esbuild.version };
if (process.argv.includes('--selftest')) {
  const once = (text, from, to) => { if (text.split(from).length !== 2) throw new Error(`not once: ${from}`); return text.replace(from, to); };
  const kit = y;
  result.selftest = {
    codeEdit: compare(x, once(kit, '|link:|', '|lnk:|')),
    commentClosesEarly: compare(x, once(kit, ' *   a workspace package\'s name,', ' *   a workspace package\'s name */ const EXTRA = 1; /*')),
    identifierRenamed: compare(x, once(kit, 'function localNames(', 'function localNamez(')),
    commentReworded: compare(x, once(kit, 'failing closed.\n * The tarball arm', 'failing shut.\n * The tarball arm')),
  };
}
console.log(JSON.stringify(result, null, 1));
