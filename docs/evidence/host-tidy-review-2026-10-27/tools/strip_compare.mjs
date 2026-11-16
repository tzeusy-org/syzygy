// R-GP-IMPL-HOST-TIDY-1 reviewer tool: is a file's change comment-only? Two methods, neither the lane's printer.
//  1. tokens: TypeScript's scanner over the source with trivia skipped (comments, whitespace, newlines); the stream of
//     (kind, text) pairs at the two commits must be equal.
//  2. emit: ts.transpileModule with removeComments, ES2022/NodeNext; the emitted JavaScript must be byte-equal.
// Usage: node strip_compare.mjs <repo> <base> <head> <path>... [--selftest]
// --selftest: for each path, three head mutants in memory (a renamed identifier, a changed literal, an added comment); the
// first two must differ by both methods, the third must stay equal by both.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const [repoArg, base, head, ...paths] = args.filter((a) => a !== '--selftest');
const repo = resolve(repoArg);
const ts = createRequire(join(repo, 'package.json'))('typescript');
const show = (commit, path) => execFileSync('git', ['-C', repo, 'show', `${commit}:${path}`], { encoding: 'utf8' });

function tokens(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
  const out = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    // Template and regex re-scans are not needed for equality: both sides are scanned the same way.
    out.push(`${kind}:${scanner.getTokenText()}`);
  }
  return out;
}

function emit(text, name) {
  return ts.transpileModule(text, {
    fileName: name,
    compilerOptions: { removeComments: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext },
  }).outputText;
}

function compare(a, b, name) {
  const ta = tokens(a), tb = tokens(b);
  const firstDiff = ta.findIndex((t, i) => t !== tb[i]);
  return {
    tokensEqual: ta.length === tb.length && firstDiff === -1,
    tokenCounts: [ta.length, tb.length],
    firstTokenDiff: firstDiff === -1 ? null : [ta[firstDiff], tb[firstDiff]],
    emitEqual: emit(a, name) === emit(b, name),
  };
}

let failed = 0;
const rows = [];
for (const path of paths) {
  const a = show(base, path), b = show(head, path);
  const r = { path, bytesEqual: a === b, ...compare(a, b, path) };
  if (selftest) {
    const ident = /\bexport (?:async )?(?:const|function) ([A-Za-z_]+)/.exec(b)[1]; // a value export, so the emit must change too
    const lits = [...b.matchAll(/'[^'\n]+'/g)];
    const last = lits[lits.length - 1]; // the last literal: in these files a value position, never an elided type import
    const mutants = {
      identifierRenamed: b.replace(new RegExp(`\\b${ident}\\b`), `${ident}X`),
      literalChanged: b.slice(0, last.index) + `${last[0].slice(0, -1)}x'` + b.slice(last.index + last[0].length),
      commentAdded: b.replace('\n', '\n// an added comment line\n'),
    };
    r.selftest = Object.fromEntries(Object.entries(mutants).map(([k, m]) => {
      const c = compare(a, m, path);
      return [k, { tokensEqual: c.tokensEqual, emitEqual: c.emitEqual }];
    }));
    const st = r.selftest;
    const ok = !st.identifierRenamed.tokensEqual && !st.identifierRenamed.emitEqual && !st.literalChanged.tokensEqual
      && !st.literalChanged.emitEqual && st.commentAdded.tokensEqual && st.commentAdded.emitEqual;
    r.selftestOk = ok;
    if (!ok) failed++;
  }
  rows.push(r);
  console.log(JSON.stringify(r));
}
process.exitCode = failed ? 1 : 0;
