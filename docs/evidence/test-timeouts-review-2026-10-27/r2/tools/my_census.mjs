// my_census.mjs: round-2 reviewer's own census of explicit Vitest timeouts (R-GP-IMPL-TEST-TIMEOUTS-2).
// Written fresh for this round; it shares no code with the lane's timeout_census.mjs or round 1's rev_census.mjs.
// Usage: node my_census.mjs <repo> <commit> <typescript-module-path> > out.json
//
// Population: every blob at <commit> (git ls-tree -r -z) under apps/ or packages/ ending .ts .tsx .mts .cts .js .mjs .cjs,
// not .d.ts, nothing under dist/ or node_modules/; plus every root-level file ending in one of those extensions.
//
// Binding (different from both other censuses: it starts from the vitest import, not from a name list):
//   - a name is bound to a Vitest API when it is a named import from 'vitest' (`import { it as t } from 'vitest'` binds t
//     to it), or when it is one of the global names below and the file declares no binding of that name of its own;
//   - API kinds: it/test -> test, describe/suite -> suite, beforeAll/afterAll/beforeEach/afterEach -> hook;
//   - a `const`/`let`/`var` whose initializer's root (through parens, property access, element access, calls, `?:`
//     branches, `||`, `??`, `&&`) is a bound name is bound to the same kind; iterated to a fixed point.
// A call's root is found by walking its callee through property access, element access, calls, parens, `!` and `as`.
// Site predicate, for a call whose root is bound:
//   - test or suite: an object-literal argument with a `timeout` property (assignment or shorthand) is a site at that
//     property's value; otherwise, with >= 3 arguments, a last argument that is neither a function literal nor an
//     object literal is a site;
//   - hook: >= 2 arguments, the second is a site;
//   - vi.setConfig({...}): each testTimeout/hookTimeout/teardownTimeout property is a site (kind setConfig);
//   - anywhere else, a property assignment named testTimeout, hookTimeout or teardownTimeout is a site (kind config).
// Line: 1-based line of the timeout expression's first token. valueMs: the numeric literal, or a same-file const whose
// initializer is a numeric literal or a product/sum of them; otherwise null.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const [repo, commit, tsPath] = process.argv.slice(2);
const ts = createRequire(import.meta.url)(tsPath);
const git = (args) => execFileSync('git', ['-C', repo, ...args], { maxBuffer: 1 << 30 });
const EXT = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;
const files = [];
for (const row of git(['ls-tree', '-r', '-z', '--full-tree', commit]).toString('utf8').split('\0').filter(Boolean)) {
  const [meta, path] = row.split('\t');
  const [, type, oid] = meta.split(' ');
  if (type !== 'blob' || !EXT.test(path) || /\.d\.ts$/.test(path)) continue;
  const scoped = /^(apps|packages)\//.test(path) && !/(^|\/)(dist|node_modules)\//.test(path);
  if (scoped || !path.includes('/')) files.push({ path, oid });
}
const KIND = { it: 'test', test: 'test', describe: 'suite', suite: 'suite', beforeAll: 'hook', afterAll: 'hook', beforeEach: 'hook', afterEach: 'hook' };
const CONFIG = new Set(['testTimeout', 'hookTimeout', 'teardownTimeout']);
const isFnLit = (n) => n && (ts.isArrowFunction(n) || ts.isFunctionExpression(n));
function root(e) {
  for (;;) {
    if (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e)) e = e.expression;
    else if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isCallExpression(e)) e = e.expression;
    else if (ts.isTaggedTemplateExpression(e)) e = e.tag;
    else break;
  }
  return ts.isIdentifier(e) ? e.text : null;
}
function roots(e) { // every root an initializer can take
  if (!e) return [];
  if (ts.isParenthesizedExpression(e)) return roots(e.expression);
  if (ts.isConditionalExpression(e)) return [...roots(e.whenTrue), ...roots(e.whenFalse)];
  if (ts.isBinaryExpression(e) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(e.operatorToken.kind))
    return [...roots(e.left), ...roots(e.right)];
  const r = root(e);
  return r ? [r] : [];
}
function numeric(e, consts) {
  if (!e) return null;
  if (ts.isParenthesizedExpression(e)) return numeric(e.expression, consts);
  if (ts.isNumericLiteral(e)) return Number(e.text.replace(/_/g, ''));
  if (ts.isIdentifier(e) && consts.has(e.text)) return numeric(consts.get(e.text), consts);
  if (ts.isBinaryExpression(e)) {
    const a = numeric(e.left, consts), b = numeric(e.right, consts);
    if (a == null || b == null) return null;
    if (e.operatorToken.kind === ts.SyntaxKind.AsteriskToken) return a * b;
    if (e.operatorToken.kind === ts.SyntaxKind.PlusToken) return a + b;
  }
  return null;
}
const sites = [];
for (const { path, oid } of files) {
  const text = git(['cat-file', 'blob', oid]).toString('utf8');
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, /x$/.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const bound = new Map();
  const declared = new Set();
  const consts = new Map();
  const decls = [];
  const visitDecl = (n) => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && n.moduleSpecifier.text === 'vitest') {
      const nb = n.importClause?.namedBindings;
      if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) {
        const orig = (el.propertyName ?? el.name).text;
        if (KIND[orig]) bound.set(el.name.text, KIND[orig]);
      }
    } else if (ts.isImportDeclaration(n)) {
      const nb = n.importClause?.namedBindings;
      if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) declared.add(el.name.text);
      if (n.importClause?.name) declared.add(n.importClause.name.text);
    }
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) {
      declared.add(n.name.text);
      decls.push(n);
      if (n.initializer && (n.parent.flags & ts.NodeFlags.Const)) consts.set(n.name.text, n.initializer);
    }
    if ((ts.isFunctionDeclaration(n) || ts.isParameter(n)) && n.name && ts.isIdentifier(n.name)) declared.add(n.name.text);
    ts.forEachChild(n, visitDecl);
  };
  visitDecl(sf);
  for (const g of Object.keys(KIND)) if (!bound.has(g) && !declared.has(g)) bound.set(g, KIND[g]);
  for (let changed = true; changed;) {
    changed = false;
    for (const d of decls) {
      if (bound.has(d.name.text)) continue;
      const k = roots(d.initializer).map((r) => bound.get(r)).find(Boolean);
      if (k) { bound.set(d.name.text, k); changed = true; }
    }
  }
  const at = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const add = (kind, node, call) => sites.push({ path, line: at(node), kind, expression: node.getText(sf), valueMs: numeric(node, consts), callLine: call ? at(call) : null });
  const inSetConfig = new Set();
  const visit = (n) => {
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'setConfig' && ts.isIdentifier(callee.expression) && callee.expression.text === 'vi') {
        for (const a of n.arguments) if (ts.isObjectLiteralExpression(a)) for (const p of a.properties) {
          if (p.name && ts.isIdentifier(p.name) && CONFIG.has(p.name.text)) { inSetConfig.add(p); add('setConfig', ts.isShorthandPropertyAssignment(p) ? p.name : p.initializer, n); }
        }
      }
      const kind = bound.get(root(callee));
      if (kind === 'test' || kind === 'suite') {
        let hit = null;
        for (const a of n.arguments) if (ts.isObjectLiteralExpression(a)) for (const p of a.properties) {
          if (p.name && ts.isIdentifier(p.name) && p.name.text === 'timeout') hit = ts.isShorthandPropertyAssignment(p) ? p.name : p.initializer;
        }
        if (!hit && n.arguments.length >= 3) {
          const last = n.arguments[n.arguments.length - 1];
          if (!isFnLit(last) && !ts.isObjectLiteralExpression(last)) hit = last;
        }
        if (hit) add(kind, hit, n);
      } else if (kind === 'hook' && n.arguments.length >= 2) add('hook', n.arguments[1], n);
    }
    if ((ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n)) && n.name && ts.isIdentifier(n.name) && CONFIG.has(n.name.text) && !inSetConfig.has(n))
      add('config', ts.isShorthandPropertyAssignment(n) ? n.name : n.initializer, null);
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
const byKind = {};
for (const s of sites) byKind[s.kind] = (byKind[s.kind] ?? 0) + 1;
process.stdout.write(JSON.stringify({ commit, population: files.length, sites: sites.length, files: new Set(sites.map((s) => s.path)).size, byKind, sitesList: sites }, null, 1) + '\n');
