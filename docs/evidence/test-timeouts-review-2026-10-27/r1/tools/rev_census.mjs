// rev_census.mjs: the reviewer's own census of explicit Vitest timeouts (R-GP-IMPL-TEST-TIMEOUTS-1).
// Usage: node rev_census.mjs <repo> <commit> <typescript-module-path> > out.json
//
// Population: every blob tracked at <commit> whose path is under apps/ or packages/ and ends .ts .mts .cts .tsx .js
// .mjs .cjs (not .d.ts; nothing under dist/ or node_modules/), plus every tracked root file matching vitest.*.
// package.json files are swept separately for --testTimeout/--hookTimeout/--teardownTimeout CLI flags.
//
// Predicate. A candidate is any CallExpression C(a0..an) such that either
//   S1 (structural): some argument ai is a function literal (arrow or function expression) and some aj, j>i, exists;
//   S2 (callee): C's callee resolves to a test API root (below) and C has >=3 arguments (test/suite form) or the root
//                is a hook with >=2 arguments;
//   S3 (options): C's callee resolves to a test API root and some argument is an object literal with a `timeout`
//                property.
// The callee is resolved by stripping property accesses and curried calls down to a root identifier
// (it.skipIf(x).each(t) -> it). A root that is a local const whose initializer (through ?:, ||, ??, parens,
// property access and calls) reaches a test API identifier is an alias of that API.
// Test API roots: it test describe suite bench (kind test/suite) and beforeAll afterAll beforeEach afterEach (hook).
// A site is a candidate whose root is a test API (directly or by alias); its timeout expression is the argument after
// the last function-literal argument (S1/S2), or the `timeout` property (S3). Every other candidate is listed under
// `excluded` with its callee chain, for a human to read (setTimeout, vi.waitFor, expect.poll, ...).
// Also sites: vi.setConfig(...) calls; any property assignment named testTimeout, hookTimeout or teardownTimeout.
// Line: 1-based line of the timeout expression's first token.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const [repo, commit, tsPath] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const ts = require(tsPath);

const git = (args, input) => execFileSync('git', ['-C', repo, ...args], { input, maxBuffer: 1 << 30 });
const listing = git(['ls-tree', '-r', '-z', '--full-tree', commit]).toString('utf8').split('\0').filter(Boolean);
const files = [];
const pkgJson = [];
for (const row of listing) {
  const [meta, path] = row.split('\t');
  const [, type, oid] = meta.split(' ');
  if (type !== 'blob') continue;
  const inTree = /^(apps|packages)\//.test(path) && /\.(ts|mts|cts|tsx|js|mjs|cjs)$/.test(path) && !/\.d\.ts$/.test(path)
    && !/(^|\/)(dist|node_modules)\//.test(path);
  const rootVitest = !path.includes('/') && /^vitest\./.test(path);
  if (inTree || rootVitest) files.push({ path, oid });
  if (/(^|\/)package\.json$/.test(path) && !/node_modules\//.test(path)) pkgJson.push({ path, oid });
}
const readBlob = (oid) => git(['cat-file', 'blob', oid]).toString('utf8');

const API = new Map([
  ['it', 'test'], ['test', 'test'], ['bench', 'test'], ['describe', 'suite'], ['suite', 'suite'],
  ['beforeAll', 'hook'], ['afterAll', 'hook'], ['beforeEach', 'hook'], ['afterEach', 'hook'],
]);
const isFn = (n) => n && (ts.isArrowFunction(n) || ts.isFunctionExpression(n));
function chainOf(expr) {
  // returns { root: identifier text | null, chain: string }
  const parts = [];
  let e = expr;
  for (;;) {
    if (ts.isParenthesizedExpression(e)) { e = e.expression; continue; }
    if (ts.isPropertyAccessExpression(e)) { parts.unshift('.' + e.name.text); e = e.expression; continue; }
    if (ts.isCallExpression(e)) { parts.unshift('()'); e = e.expression; continue; }
    if (ts.isElementAccessExpression(e)) { parts.unshift('[]'); e = e.expression; continue; }
    if (ts.isNonNullExpression(e) || ts.isAsExpression(e)) { e = e.expression; continue; }
    break;
  }
  if (ts.isIdentifier(e)) return { root: e.text, chain: e.text + parts.join('') };
  return { root: null, chain: ts.SyntaxKind[e.kind] + parts.join('') };
}
function rootsReached(expr, seen = new Set()) {
  // identifiers reachable as a callee root through ?:, ||, ??, parens, property access and calls
  const out = new Set();
  const walk = (e) => {
    if (!e) return;
    if (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e)) return walk(e.expression);
    if (ts.isConditionalExpression(e)) { walk(e.whenTrue); walk(e.whenFalse); return; }
    if (ts.isBinaryExpression(e) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(e.operatorToken.kind)) { walk(e.left); walk(e.right); return; }
    const { root } = chainOf(e);
    if (root) out.add(root);
  };
  walk(expr);
  return out;
}

const sites = [];
const excluded = [];
const perFile = [];
for (const { path, oid } of files) {
  const text = readBlob(oid);
  const kind = path.endsWith('x') ? ts.ScriptKind.TSX : (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  // aliases: const X = <expr reaching a test API root>
  const alias = new Map();
  const collectAliases = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      const roots = rootsReached(n.initializer);
      for (const r of roots) {
        if (API.has(r)) { alias.set(n.name.text, r); break; }
      }
    }
    ts.forEachChild(n, collectAliases);
  };
  collectAliases(sf);
  // second pass so an alias of an alias resolves
  for (let i = 0; i < 3; i += 1) for (const [k, v] of alias) if (alias.has(v)) alias.set(k, alias.get(v));
  const apiOf = (root) => (API.has(root) ? root : alias.has(root) ? alias.get(root) : null);
  let count = 0;
  const visit = (n) => {
    if (ts.isCallExpression(n)) {
      const args = n.arguments;
      const { root, chain } = chainOf(n.expression);
      const api = root ? apiOf(root) : null;
      let lastFn = -1;
      args.forEach((a, i) => { if (isFn(a)) lastFn = i; });
      const s1 = lastFn >= 0 && lastFn < args.length - 1;
      const kindApi = api ? API.get(api) : null;
      const s2 = kindApi === 'hook' ? args.length >= 2 : (kindApi === 'test' || kindApi === 'suite') ? args.length >= 3 : false;
      const optIdx = api ? args.findIndex((a) => ts.isObjectLiteralExpression(a) && a.properties.some((p) => p.name && ts.isIdentifier(p.name) && p.name.text === 'timeout')) : -1;
      const s3 = optIdx >= 0;
      if (chain === 'vi.setConfig' || /\.setConfig$/.test(chain)) {
        sites.push({ path, line: line(n), kind: 'setConfig', chain, expr: n.getText(sf).slice(0, 120), predicates: ['setConfig'] });
        count += 1;
      } else if (s1 || s2 || s3) {
        if (api) {
          let timeoutNode;
          if (s3) timeoutNode = args[optIdx].properties.find((p) => p.name && ts.isIdentifier(p.name) && p.name.text === 'timeout');
          else if (s1) timeoutNode = args[lastFn + 1];
          else timeoutNode = kindApi === 'hook' ? args[1] : args[2];
          const preds = [s1 && 'S1', s2 && 'S2', s3 && 'S3'].filter(Boolean);
          const title = kindApi !== 'hook' && args[0] && (ts.isStringLiteral(args[0]) || ts.isNoSubstitutionTemplateLiteral(args[0]) || ts.isTemplateExpression(args[0])) ? args[0].getText(sf).slice(0, 100) : null;
          sites.push({ path, line: line(timeoutNode), callLine: line(n), kind: kindApi, api, root, chain, timeout: timeoutNode.getText(sf).slice(0, 60), title, predicates: preds });
          count += 1;
        } else {
          excluded.push({ path, line: line(n), chain, predicates: [s1 && 'S1'].filter(Boolean) });
        }
      }
    }
    if ((ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n)) && n.name && ts.isIdentifier(n.name) && ['testTimeout', 'hookTimeout', 'teardownTimeout'].includes(n.name.text)) {
      sites.push({ path, line: line(n), kind: 'config', name: n.name.text, timeout: ts.isPropertyAssignment(n) ? n.initializer.getText(sf).slice(0, 60) : n.name.text, predicates: ['config-property'] });
      count += 1;
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (count) perFile.push({ path, sites: count });
}
const cli = [];
for (const { path, oid } of pkgJson) {
  const text = readBlob(oid);
  for (const [i, l] of text.split('\n').entries()) if (/--(test|hook|teardown)Timeout/.test(l)) cli.push({ path, line: i + 1, text: l.trim() });
}
const byKind = {};
for (const s of sites) byKind[s.kind] = (byKind[s.kind] ?? 0) + 1;
const excludedChains = {};
for (const e of excluded) excludedChains[e.chain] = (excludedChains[e.chain] ?? 0) + 1;
process.stdout.write(JSON.stringify({ commit, population: files.length, sites: sites.length, files: perFile.length, byKind, cliFlags: cli, sitesList: sites, excludedCount: excluded.length, excludedChains, excluded }, null, 1));
