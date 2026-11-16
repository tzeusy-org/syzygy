// rev-532's own elapsed-time census for PR 532 (syzygy-bpyt.4.5). Reviewer tool, not authority.
//
// usage: node census_rev.mjs REPO COMMIT OUT.json
//
// Population: every tracked file under apps/ or packages/ whose name matches /\.test\.[cm]?[jt]sx?$/ at COMMIT, read from
// git objects (`git ls-tree -r -z`, `git show`), never from a worktree. Each file is parsed with the TypeScript compiler.
//
// Clock reads: calls of Date.now, performance.now, process.hrtime, process.hrtime.bigint, process.cpuUsage,
// process.threadCpuUsage, and `new Date()` with no arguments. Taint: a variable whose initializer or any assignment holds a
// clock read or a tainted name is tainted; a function (declaration, or arrow/function expression bound to a name) whose body
// holds a clock read or a tainted name is tainted, and so is any call of it. Iterated to a fixed point per file.
// Recorded:
//   comparisons: every <, <=, >, >= whose operand holds a clock read or tainted name; every expect(A).toBe{Less,Greater}Than
//     [OrEqual] / toBeCloseTo whose A or matcher argument does; each with its enclosing statement kind.
//   raceTimers: every setTimeout( whose callback calls reject( or throws; every Promise.race(.
//   clockReads: every clock read, by line, so the population of reads can be checked against a plain grep.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const [repo, commit, out] = process.argv.slice(2);
const require = createRequire(`${repo}/package.json`);
const ts = require('typescript');
const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const files = git('ls-tree', '-r', '-z', '--name-only', commit).split('\0')
  .filter((p) => /^(apps|packages)\//.test(p) && /\.test\.[cm]?[jt]sx?$/.test(p)).sort();

const CLOCK = new Set(['Date.now', 'performance.now', 'process.hrtime', 'process.hrtime.bigint', 'process.cpuUsage', 'process.threadCpuUsage']);
const MATCHERS = new Set(['toBeLessThan', 'toBeLessThanOrEqual', 'toBeGreaterThan', 'toBeGreaterThanOrEqual', 'toBeCloseTo']);
const isClock = (n) => (ts.isCallExpression(n) && CLOCK.has(n.expression.getText()))
  || (ts.isNewExpression(n) && n.expression.getText() === 'Date' && (!n.arguments || n.arguments.length === 0));

const result = { tool: 'census_rev.mjs', commit: git('rev-parse', commit).trim(), population: files.length, comparisons: [], raceTimers: [], clockReads: [] };
for (const file of files) {
  const text = git('show', `${commit}:${file}`);
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const tainted = new Set();
  const holds = (node) => {
    let hit = false;
    const visit = (n) => {
      if (hit) return;
      if (isClock(n)) { hit = true; return; }
      if (ts.isIdentifier(n) && tainted.has(n.text)) { hit = true; return; }
      ts.forEachChild(n, visit);
    };
    visit(node);
    return hit;
  };
  // Fixed point over declarations and assignments.
  for (let changed = true; changed;) {
    changed = false;
    const visit = (n) => {
      let name = null, body = null;
      if (ts.isVariableDeclaration(n) && n.initializer) {
        if (ts.isIdentifier(n.name)) { name = n.name.text; body = n.initializer; }
        else if (ts.isObjectBindingPattern(n.name) || ts.isArrayBindingPattern(n.name)) {
          if (holds(n.initializer)) for (const el of n.name.elements) if (el.name && ts.isIdentifier(el.name) && !tainted.has(el.name.text)) { tainted.add(el.name.text); changed = true; }
        }
      } else if (ts.isFunctionDeclaration(n) && n.name && n.body) { name = n.name.text; body = n.body; }
      else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.left)) { name = n.left.text; body = n.right; }
      if (name && body && !tainted.has(name) && holds(body)) { tainted.add(name); changed = true; }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  const enclosing = (n) => {
    for (let p = n.parent; p; p = p.parent) {
      if (ts.isIfStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p) || ts.isForStatement(p) || ts.isConditionalExpression(p)) return ts.SyntaxKind[p.kind];
      if (ts.isExpressionStatement(p) || ts.isReturnStatement(p) || ts.isVariableStatement(p)) return ts.SyntaxKind[p.kind];
    }
    return 'none';
  };
  const visit = (n) => {
    if (isClock(n)) result.clockReads.push({ file, line: line(n), read: n.getText(sf).slice(0, 60) });
    if (ts.isBinaryExpression(n) && [ts.SyntaxKind.LessThanToken, ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.GreaterThanToken,
      ts.SyntaxKind.GreaterThanEqualsToken].includes(n.operatorToken.kind) && (holds(n.left) || holds(n.right))) {
      result.comparisons.push({ file, line: line(n), form: 'binary', within: enclosing(n), text: n.getText(sf).replace(/\s+/g, ' ').slice(0, 160) });
    }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && MATCHERS.has(n.expression.name.text)) {
      let e = n.expression.expression;
      while (ts.isPropertyAccessExpression(e)) e = e.expression; // expect(x).not.toBe…
      if (ts.isCallExpression(e) && e.expression.getText() === 'expect' && e.arguments.length > 0 && (holds(e.arguments[0]) || n.arguments.some(holds))) {
        result.comparisons.push({ file, line: line(n), form: `expect.${n.expression.name.text}`, within: 'expect', text: n.getText(sf).replace(/\s+/g, ' ').slice(0, 160) });
      }
    }
    if (ts.isCallExpression(n) && n.expression.getText() === 'Promise.race') result.raceTimers.push({ file, line: line(n), form: 'Promise.race', text: n.getText(sf).replace(/\s+/g, ' ').slice(0, 160) });
    if (ts.isCallExpression(n) && n.expression.getText() === 'setTimeout' && n.arguments[0]) {
      const cb = n.arguments[0].getText(sf);
      if (/\breject\s*\(|\bthrow\b/.test(cb)) result.raceTimers.push({ file, line: line(n), form: 'setTimeout-rejects', text: n.getText(sf).replace(/\s+/g, ' ').slice(0, 160) });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify({ commit: result.commit, population: result.population, comparisons: result.comparisons.length, raceTimers: result.raceTimers.length, clockReads: result.clockReads.length }));
