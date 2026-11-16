// R-GP-IMPL-HOST-TIDY-1 reviewer tool: for each built .js file that differs between two built trees, the token-level
// difference with comments and whitespace skipped (TypeScript's scanner). Usage: node dist_tokens.mjs <base tree> <head tree> <rel.js>...
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [a, b, ...files] = process.argv.slice(2);
const ts = createRequire(join(resolve(b), 'package.json'))('typescript');
const tokens = (text) => {
  const s = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
  const out = [];
  for (let k = s.scan(); k !== ts.SyntaxKind.EndOfFileToken; k = s.scan()) out.push(s.getTokenText());
  return out;
};
for (const f of files) {
  const ta = tokens(readFileSync(join(a, f), 'utf8')), tb = tokens(readFileSync(join(b, f), 'utf8'));
  const diffs = [];
  for (let i = 0; i < Math.max(ta.length, tb.length); i++) if (ta[i] !== tb[i]) diffs.push([i, ta[i], tb[i]]);
  console.log(JSON.stringify({ file: f, tokens: [ta.length, tb.length], differingTokens: diffs.length, diffs: diffs.slice(0, 3) }));
}
