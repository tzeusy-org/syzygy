// rev-532: an independent row delta for PR 532 (rows as written: each it/test call, it.each counted once). Not authority.
// usage: node row_delta_rev.mjs REPO BASE HEAD
// For every test file changed between BASE and HEAD, lists each it()/test()/it.each()() call by its title text and its
// body text; a title at both sides with a different body is changed (~), a title only at HEAD is added (+), only at BASE removed (-).
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const [repo, base, head] = process.argv.slice(2);
const ts = createRequire(`${repo}/package.json`)('typescript');
const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const files = git('diff', '--name-only', base, head).split('\n').filter((p) => /\.test\.ts$/.test(p) && !p.startsWith('docs/'));
const rows = (commit, file) => {
  const sf = ts.createSourceFile(file, git('show', `${commit}:${file}`), ts.ScriptTarget.Latest, true);
  const out = new Map();
  const visit = (n) => {
    if (ts.isCallExpression(n)) {
      let callee = n.expression, each = false;
      if (ts.isCallExpression(callee) && ts.isPropertyAccessExpression(callee.expression) && callee.expression.name.text === 'each') { each = true; callee = callee.expression.expression; }
      const name = callee.getText(sf);
      if (['it', 'test', 'it.skip', 'it.skipIf', 'it.runIf'].includes(name) || (each && ['it', 'test'].includes(name))) {
        const title = n.arguments[0]?.getText(sf) ?? '?';
        out.set(title, n.getText(sf));
        return;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
};
let add = 0, chg = 0, del = 0;
for (const f of files) {
  const a = rows(base, f), b = rows(head, f);
  for (const [t, body] of b) { if (!a.has(t)) { add++; console.log(`+ ${f.split('/').pop()}: ${t.slice(0, 110)}`); } else if (a.get(t) !== body) { chg++; console.log(`~ ${f.split('/').pop()}: ${t.slice(0, 110)}`); } }
  for (const t of a.keys()) if (!b.has(t)) { del++; console.log(`- ${f.split('/').pop()}: ${t.slice(0, 110)}`); }
}
console.log(`files ${files.length}; Tests: +${add} ~${chg} -${del}`);
