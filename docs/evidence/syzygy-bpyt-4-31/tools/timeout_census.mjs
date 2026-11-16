#!/usr/bin/env node
// Census of explicit Vitest timeouts at one commit (syzygy-bpyt.4.31). Evidence tool, not authority; it reads git objects only.
//
// usage: node docs/evidence/syzygy-bpyt-4-31/tools/timeout_census.mjs REPO COMMIT OUT.json
//        node docs/evidence/syzygy-bpyt-4-31/tools/timeout_census.mjs --selftest
//
// Population: every tracked file at COMMIT under apps/ or packages/ ending .ts, .mts, .js or .mjs (not .d.ts, nothing
// under a dist/ or node_modules/ directory), and the root vitest.config.ts and vitest.setup.ts. Each is parsed with the
// TypeScript compiler API (the repository's own `typescript`).
//
// A site is one of:
//   test / suite  a call registering a test (`it`, `test`) or a suite (`describe`, `suite`), through any chain of the
//                 modifiers skip, only, concurrent, sequential, fails, todo, shuffle and the curried forms each, for,
//                 skipIf, runIf, extend, or through a `const` bound to such a chain (`const sweeping = it.skipIf(c)`),
//                 whose second argument is an object literal holding `timeout` (options first), or whose third argument
//                 is one (options last), or whose third argument is present and not a function (the timeout itself);
//   hook          a call to beforeAll, beforeEach, afterAll or afterEach with a second argument;
//   setConfig     a testTimeout or hookTimeout property of the object passed to `vi.setConfig`;
//   config        a testTimeout, hookTimeout or teardownTimeout property in an object literal of a vitest.config.* file.
// The value is evaluated when the expression is a numeric literal, or an identifier or arithmetic over numeric literals
// and identifiers that resolve to a `const` initialiser in the same file or in a relatively imported one; otherwise null.
//
// Reason: a `//` comment on the line where the timeout expression ends, after it; or, when the expression starts its own
// line, a comment ending on the line directly above it; or, when the expression is an identifier, a `//` comment on its declaration line or a comment ending on the line directly above the declaration
// (a run of lines starting `//`, or a block comment closing there); for a config property, a comment on its line or
// directly above it. A comment above a contiguous group of one-line `const` declarations (or of one-line config
// properties) is the reason of each member, recorded with `group: true`. A comment above the registration call is
// recorded as `precedingComment` for triage and is never a reason.
// Citation, inside a reason: a hex run of 7 to 40 characters naming a commit object in REPO, or a path starting
// docs/evidence/ that exists at COMMIT.
//
// Second method (verification rule 2): the line regexes of syzygy-bpyt.4.5's timing census over the test files, `}, N)`
// and `timeout: N` with N a numeric literal of 100 or more or an upper-case name; the record lists every line only one
// method finds.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOTS = new Set(['it', 'test', 'describe', 'suite']);
const HOOKS = new Set(['beforeAll', 'beforeEach', 'afterAll', 'afterEach']);
const MODIFIERS = new Set(['skip', 'only', 'concurrent', 'sequential', 'fails', 'todo', 'shuffle']);
const CURRIED = new Set(['each', 'for', 'skipIf', 'runIf', 'extend']);
const TEST_FILE = /\.test\.(ts|mts|js|mjs)$/;
const CONFIG_FILE = /(^|\/)vitest\.([^/]*\.)?config\.[mc]?[jt]s$/;
const CONST_LINE = /^\s*(export\s+)?const\s+\w+\s*=\s*[^;]*;\s*(\/\/.*)?$/;
const PROPERTY_LINE = /^\s*\w+\s*:\s*[^{}]*,\s*(\/\/.*)?$/;
const CLOSE = /\},\s*([0-9][0-9_]*|[A-Z][A-Z0-9_]*)\s*\)/;
const OPT = /\btimeout\s*:\s*([0-9][0-9_]*|[A-Z][A-Z0-9_]*)/;

const lineOf = (sf, pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
const lines = (sf) => sf.text.split('\n');

/** The identifier a callee chain starts from, through any modifiers and curried factory calls. */
function calleeRoot(e) {
  for (;;) {
    if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && CURRIED.has(e.expression.name.text)) e = e.expression.expression;
    else if (ts.isPropertyAccessExpression(e) && (MODIFIERS.has(e.name.text) || CURRIED.has(e.name.text))) e = e.expression;
    else return ts.isIdentifier(e) ? e.text : null;
  }
}
/** The registration root of a call, or null when the call is not one. */
function registration(call, aliases) {
  const root = calleeRoot(call.expression);
  return root === null ? null : (aliases.get(root) ?? root);
}
/** File-scoped names bound by `const` to a registration chain, by root. */
function aliasesOf(sf) {
  const aliases = new Map();
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && (node.parent.flags & ts.NodeFlags.Const)) {
      const root = calleeRoot(node.initializer);
      if (root && (ROOTS.has(root) || HOOKS.has(root)) && root !== node.name.text) aliases.set(node.name.text, root);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return aliases;
}
const timeoutProp = (obj) => obj.properties.find((p) => ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === 'timeout');
const commentAfter = (sf, line, fromCol) => { const text = lines(sf)[line - 1] ?? ''; const i = text.indexOf('//', fromCol); return i < 0 ? null : text.slice(i + 2).trim(); };
// The comment ending on the line directly above `line`: a run of `//` lines, or one block comment closing on that line.
function commentAbove(sf, line) {
  const ls = lines(sf); let i = line - 2; const block = [];
  if (i >= 0 && /\*\/\s*$/.test(ls[i])) {
    while (i >= 0) { block.unshift(ls[i].trim()); if (/\/\*/.test(ls[i])) break; i--; }
  } else {
    while (i >= 0 && /^\s*\/\//.test(ls[i])) { block.unshift(ls[i].trim()); i--; }
  }
  return block.length ? block.join(' ') : null;
}
// The comment above a group of one-line siblings: walk up over contiguous lines matching `sibling`, then read above.
function commentAboveGroup(sf, line, sibling) {
  const ls = lines(sf); let top = line;
  while (top - 2 >= 0 && sibling.test(ls[top - 2]) && !/^\s*\/\//.test(ls[top - 2])) top--;
  return top === line ? null : commentAbove(sf, top);
}

export function census(repo, commitArg) {
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
  const commit = git('rev-parse', commitArg).trim();
  const all = git('ls-tree', '-r', '-z', '--name-only', commit).split('\0').filter(Boolean);
  const population = all.filter((p) => (/^(apps|packages)\//.test(p) && /\.(ts|mts|js|mjs)$/.test(p) && !p.endsWith('.d.ts') && !/(^|\/)(dist|node_modules)\//.test(p))
    || p === 'vitest.config.ts' || p === 'vitest.setup.ts');
  const tracked = new Set(all);
  const sources = new Map();
  const source = (p) => {
    if (!sources.has(p)) {
      const text = tracked.has(p) ? git('show', `${commit}:${p}`) : null;
      sources.set(p, text === null ? null : ts.createSourceFile(p, text, ts.ScriptTarget.Latest, true));
    }
    return sources.get(p);
  };

  /** The const declaration an identifier names, in this file or a relatively imported one. */
  function declaration(sf, name, seen = new Set()) {
    const key = `${sf.fileName}:${name}`;
    if (seen.has(key)) return null;
    seen.add(key);
    for (const st of sf.statements) {
      if (ts.isVariableStatement(st) && (st.declarationList.flags & ts.NodeFlags.Const)) {
        for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === name && d.initializer) return { sf, decl: d, statement: st };
      }
      if (ts.isImportDeclaration(st) && st.importClause?.namedBindings && ts.isNamedImports(st.importClause.namedBindings) && ts.isStringLiteral(st.moduleSpecifier)) {
        const spec = st.moduleSpecifier.text;
        for (const el of st.importClause.namedBindings.elements) {
          if (el.name.text !== name) continue;
          if (!spec.startsWith('.')) return { imported: spec };
          const base = path.posix.join(path.posix.dirname(sf.fileName), spec).replace(/\.js$/, '');
          for (const cand of [`${base}.ts`, `${base}.mts`, `${base}/index.ts`]) {
            const other = source(cand);
            if (other) return declaration(other, (el.propertyName ?? el.name).text, seen);
          }
          return { imported: spec };
        }
      }
    }
    return null;
  }
  function evaluate(sf, expr) {
    if (ts.isNumericLiteral(expr)) return Number(expr.text.replace(/_/g, ''));
    if (ts.isParenthesizedExpression(expr)) return evaluate(sf, expr.expression);
    if (ts.isIdentifier(expr)) {
      const d = declaration(sf, expr.text);
      return d && d.decl ? evaluate(d.sf, d.decl.initializer) : null;
    }
    if (ts.isBinaryExpression(expr)) {
      const a = evaluate(sf, expr.left), b = evaluate(sf, expr.right);
      if (a === null || b === null) return null;
      switch (expr.operatorToken.kind) {
        case ts.SyntaxKind.AsteriskToken: return a * b;
        case ts.SyntaxKind.PlusToken: return a + b;
        case ts.SyntaxKind.MinusToken: return a - b;
        case ts.SyntaxKind.SlashToken: return a / b;
        default: return null;
      }
    }
    return null;
  }
  function reasonFor(sf, expr) {
    const endLine = lineOf(sf, expr.getEnd());
    const onLine = commentAfter(sf, endLine, sf.getLineAndCharacterOfPosition(expr.getEnd()).character);
    if (onLine) return { where: `${sf.fileName}:${endLine}`, text: onLine };
    const startLine = lineOf(sf, expr.getStart());
    const ownLine = /^\s*$/.test(lines(sf)[startLine - 1].slice(0, sf.getLineAndCharacterOfPosition(expr.getStart()).character));
    const aboveOwnLine = ownLine ? commentAbove(sf, startLine) : null;
    if (aboveOwnLine) return { where: `${sf.fileName}:${startLine - 1}`, text: aboveOwnLine };
    if (ts.isIdentifier(expr)) {
      const d = declaration(sf, expr.text);
      if (d && d.decl) {
        const dl = lineOf(d.sf, d.statement.getStart());
        const dEnd = lineOf(d.sf, d.statement.getEnd());
        const own = commentAfter(d.sf, dEnd, d.sf.getLineAndCharacterOfPosition(d.statement.getEnd()).character);
        if (own) return { where: `${d.sf.fileName}:${dEnd}`, text: own };
        const above = commentAbove(d.sf, dl);
        if (above) return { where: `${d.sf.fileName}:${dl - 1}`, text: above };
        const group = dl === dEnd ? commentAboveGroup(d.sf, dl, CONST_LINE) : null;
        if (group) return { where: `${d.sf.fileName}:${dl}`, text: group, group: true };
      }
    }
    return null;
  }
  const commitCache = new Map();
  const isCommit = (h) => {
    if (!commitCache.has(h)) { try { git('cat-file', '-e', `${h}^{commit}`); commitCache.set(h, true); } catch { commitCache.set(h, false); } }
    return commitCache.get(h);
  };
  function citations(text) {
    if (!text) return { commits: [], measurements: [] };
    const commits = [...new Set(text.match(/\b[0-9a-f]{7,40}\b/g) ?? [])].filter(isCommit);
    const measurements = [...new Set((text.match(/docs\/evidence\/[^\s)`'",;]+/g) ?? []).map((p) => p.replace(/[.:]$/, '')))].filter((p) => tracked.has(p));
    return { commits, measurements };
  }

  const sites = [];
  const parsed = [];
  // The test's title and the titles of the suites around it, as vitest joins them into a full name.
  const titleOf = (call) => { const a = call.arguments[0]; return a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) ? a.text : a ? a.getText() : null; };
  function titles(call, aliases) {
    const path = [];
    for (let n = call.parent; n; n = n.parent) {
      if (ts.isCallExpression(n)) { const root = registration(n, aliases); if (root === 'describe' || root === 'suite') path.unshift(titleOf(n)); }
    }
    return { title: titleOf(call), suites: path };
  }
  function push(sf, expr, kind, callee, form, callLine = null, named = null) {
    let reason = reasonFor(sf, expr);
    if (!reason && kind === 'config') {
      const l = lineOf(sf, expr.getStart());
      const above = commentAbove(sf, l);
      const group = above ? null : commentAboveGroup(sf, l, PROPERTY_LINE);
      if (above) reason = { where: `${sf.fileName}:${l - 1}`, text: above };
      else if (group) reason = { where: `${sf.fileName}:${l}`, text: group, group: true };
    }
    const d = ts.isIdentifier(expr) ? declaration(sf, expr.text) : null;
    sites.push({
      path: sf.fileName, line: lineOf(sf, expr.getStart()), callLine, kind, callee, form, expression: expr.getText(sf), valueMs: evaluate(sf, expr),
      constant: d ? (d.decl ? { name: expr.text, at: `${d.sf.fileName}:${lineOf(d.sf, d.statement.getStart())}` } : { name: expr.text, imported: d.imported }) : null,
      ...(named ?? {}), reason, citations: citations(reason?.text),
      // Triage only, never a reason: the comment directly above the registration call.
      precedingComment: callLine ? commentAbove(sf, callLine) : null,
    });
  }
  for (const p of population) {
    const sf = source(p);
    parsed.push(p);
    const aliases = aliasesOf(sf);
    const isConfig = CONFIG_FILE.test(p);
    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        const root = registration(node, aliases);
        const args = node.arguments;
        let expr = null, form = null, kind = null;
        if (root && ROOTS.has(root)) {
          kind = root === 'describe' || root === 'suite' ? 'suite' : 'test';
          if (args.length >= 2 && ts.isObjectLiteralExpression(args[1])) {
            const t = timeoutProp(args[1]); if (t) { expr = t.initializer; form = 'options-first'; }
          } else if (args.length >= 3 && ts.isObjectLiteralExpression(args[2])) {
            const t = timeoutProp(args[2]); if (t) { expr = t.initializer; form = 'options-last'; }
          } else if (args.length >= 3 && !ts.isFunctionLike(args[2])) { expr = args[2]; form = 'third-argument'; }
        } else if (root && HOOKS.has(root) && args.length >= 2) {
          kind = 'hook'; expr = args[1]; form = 'second-argument';
        } else if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'vi'
                   && node.expression.name.text === 'setConfig' && args[0] && ts.isObjectLiteralExpression(args[0])) {
          for (const prop of args[0].properties) {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && /^(testTimeout|hookTimeout)$/.test(prop.name.text)) push(sf, prop.initializer, 'setConfig', 'vi.setConfig', prop.name.text);
          }
        }
        if (expr) push(sf, expr, kind, root, form, lineOf(sf, node.getStart()), kind === 'hook' ? { suites: titles(node, aliases).suites } : titles(node, aliases));
      }
      if (isConfig && ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && /^(testTimeout|hookTimeout|teardownTimeout)$/.test(node.name.text)) {
        push(sf, node.initializer, 'config', node.name.text, 'config-property');
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  const regexLines = [];
  for (const p of parsed.filter((q) => TEST_FILE.test(q))) {
    lines(source(p)).forEach((text, i) => {
      const m = CLOSE.exec(text) ?? OPT.exec(text);
      if (m && !(/^[0-9_]+$/.test(m[1]) && Number(m[1].replace(/_/g, '')) < 100)) regexLines.push({ path: p, line: i + 1, text: text.trim().slice(0, 160) });
    });
  }
  const astKeys = new Set(sites.map((s) => `${s.path}:${s.line}`));
  const regexKeys = new Set(regexLines.map((r) => `${r.path}:${r.line}`));
  const byKind = {};
  for (const s of sites) {
    const k = (byKind[s.kind] ??= { sites: 0, files: new Set(), withReason: 0, cited: 0 });
    k.sites++; k.files.add(s.path); if (s.reason) k.withReason++; if (s.citations.commits.length || s.citations.measurements.length) k.cited++;
  }
  const uncited = (s) => !s.citations.commits.length && !s.citations.measurements.length;
  return {
    commit,
    population: { files: population.length, parsed: parsed.length, testFiles: parsed.filter((q) => TEST_FILE.test(q)).length },
    summary: {
      sites: sites.length, files: new Set(sites.map((s) => s.path)).size,
      withoutReason: sites.filter((s) => !s.reason).length, filesWithoutReason: new Set(sites.filter((s) => !s.reason).map((s) => s.path)).size,
      withoutCitation: sites.filter(uncited).length, filesWithoutCitation: new Set(sites.filter(uncited).map((s) => s.path)).size,
      byKind: Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, { ...v, files: v.files.size }])),
    },
    sites,
    secondMethod: {
      regexLines: regexLines.length, matched: regexLines.filter((r) => astKeys.has(`${r.path}:${r.line}`)).length,
      onlyByRegex: regexLines.filter((r) => !astKeys.has(`${r.path}:${r.line}`)),
      onlyByAst: sites.filter((s) => TEST_FILE.test(s.path) && !regexKeys.has(`${s.path}:${s.line}`)).map((s) => ({ path: s.path, line: s.line, expression: s.expression, form: s.form })),
    },
  };
}

// The selftest: a two-commit fixture repository holding one case per predicate, each with its negative.
const FIXTURE_TEST = (commit) => `import { beforeAll, describe, expect, it, test, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { SHARED_MS } from './shared.js';

it('literal with a cited reason', () => {}, 30_000); // reason, measured in ${commit}
it('literal on its own line', async () => {
},
  20_000);
it.skipIf(false).each([1])('curried chain %s', () => {}, 15_000);
const sweeping = it.skipIf(false);
sweeping('alias of a chain', () => {}, 12_000);
// options budget, docs/evidence/kept.json and docs/evidence/missing.json and abcdef1
const T_MS = 9_000;
describe('options first', { timeout: T_MS }, () => {});
test('options last', () => {}, { timeout: 8_000 });
beforeAll(() => {}, 7_000);
vi.setConfig({ testTimeout: 6_000 });
// group reason
const A_MS = 1_000;
const B_MS = 2 * 1_000;
it('group member', () => {}, B_MS);
// a comment above the call is not a reason
it('preceding comment only', () => {}, 11_000);
it('imported constant', () => {}, SHARED_MS);
it.only.concurrent('modifiers', () => {}, 13_000);
setTimeout(() => {
}, 5_000);
spawnSync('x', [], { timeout: 4_000 });
it('no timeout', () => {});
it('a function third argument', { retry: 1 }, () => {});
vi.waitFor(() => {}, { timeout: 3_000 });
it.each([1]);
expect(A_MS).toBe(1_000);
const OPTS = { retry: 1 };
it('an options variable', OPTS, () => {});
it('own-line literal with a comment above', () => {},
  // own-line reason
  16_000);
`;
const FIXTURE_SHARED = `// shared budget
export const SHARED_MS = 14_000;
`;
const FIXTURE_CONFIG = `export default {
  test: {
    testTimeout: 60_000, // config reason
    // above the group
    include: ['x'],
    hookTimeout: 61_000,
    teardownTimeout: 62_000,
  },
};
`;
// [line, kind, form, valueMs, reason (null, 'line', 'above', 'group'), commits cited, measurements cited]
const EXPECTED = [
  ['packages/x/src/a.test.ts', 5, 'test', 'third-argument', 30000, 'line', 1, 0],
  ['packages/x/src/a.test.ts', 8, 'test', 'third-argument', 20000, null, 0, 0],
  ['packages/x/src/a.test.ts', 9, 'test', 'third-argument', 15000, null, 0, 0],
  ['packages/x/src/a.test.ts', 11, 'test', 'third-argument', 12000, null, 0, 0],
  ['packages/x/src/a.test.ts', 14, 'suite', 'options-first', 9000, 'above', 0, 1],
  ['packages/x/src/a.test.ts', 15, 'test', 'options-last', 8000, null, 0, 0],
  ['packages/x/src/a.test.ts', 16, 'hook', 'second-argument', 7000, null, 0, 0],
  ['packages/x/src/a.test.ts', 17, 'setConfig', 'testTimeout', 6000, null, 0, 0],
  ['packages/x/src/a.test.ts', 21, 'test', 'third-argument', 2000, 'group', 0, 0],
  ['packages/x/src/a.test.ts', 23, 'test', 'third-argument', 11000, null, 0, 0],
  ['packages/x/src/a.test.ts', 24, 'test', 'third-argument', 14000, 'above', 0, 0],
  ['packages/x/src/a.test.ts', 25, 'test', 'third-argument', 13000, null, 0, 0],
  ['packages/x/src/a.test.ts', 38, 'test', 'third-argument', 16000, 'above', 0, 0],
  ['packages/x/vitest.config.ts', 3, 'config', 'config-property', 60000, 'line', 0, 0],
  ['packages/x/vitest.config.ts', 6, 'config', 'config-property', 61000, 'group', 0, 0],
  ['packages/x/vitest.config.ts', 7, 'config', 'config-property', 62000, 'group', 0, 0],
];
function selftest() {
  const dir = mkdtempSync(path.join(tmpdir(), 'timeout-census-selftest-'));
  try {
    const g = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    g('init', '-q'); g('config', 'user.email', 'selftest@example.invalid'); g('config', 'user.name', 'selftest');
    mkdirSync(path.join(dir, 'packages/x/src'), { recursive: true }); mkdirSync(path.join(dir, 'docs/evidence'), { recursive: true });
    writeFileSync(path.join(dir, 'docs/evidence/kept.json'), '{}\n');
    g('add', '-A'); g('commit', '-q', '-m', 'first');
    const first = g('rev-parse', '--short=8', 'HEAD').trim();
    writeFileSync(path.join(dir, 'packages/x/src/a.test.ts'), FIXTURE_TEST(first));
    writeFileSync(path.join(dir, 'packages/x/src/shared.ts'), FIXTURE_SHARED);
    writeFileSync(path.join(dir, 'packages/x/vitest.config.ts'), FIXTURE_CONFIG);
    writeFileSync(path.join(dir, 'docs/outside.test.ts'), "it('outside the population', () => {}, 40_000);\n");
    g('add', '-A'); g('commit', '-q', '-m', 'second');
    const got = census(dir, 'HEAD');
    const rows = got.sites.map((s) => [s.path, s.line, s.kind, s.form, s.valueMs,
      s.reason === null ? null : s.reason.group ? 'group' : s.reason.where === `${s.path}:${s.line}` ? 'line' : 'above',
      s.citations.commits.length, s.citations.measurements.length]);
    const want = EXPECTED.map((r) => JSON.stringify(r)), have = rows.map((r) => JSON.stringify(r));
    const missing = want.filter((r) => !have.includes(r)), extra = have.filter((r) => !want.includes(r));
    const preceding = got.sites.find((s) => s.line === 23)?.precedingComment;
    const problems = [...missing.map((r) => `missing ${r}`), ...extra.map((r) => `unexpected ${r}`)];
    if (preceding !== '// a comment above the call is not a reason') problems.push(`precedingComment of line 23 is ${JSON.stringify(preceding)}`);
    if (got.population.files !== 3) problems.push(`population ${got.population.files}, expected 3 (docs/outside.test.ts is outside it)`);
    const onlyByRegex = got.secondMethod.onlyByRegex.map((r) => r.line).join(',');
    if (onlyByRegex !== '27,28,31') problems.push(`second method: lines only the regexes find are ${onlyByRegex}, expected 27,28,31`);
    if (got.secondMethod.onlyByAst.map((r) => r.line).join(',') !== '8,17,38') problems.push(`second method: AST-only lines are ${got.secondMethod.onlyByAst.map((r) => r.line).join(',')}`);
    console.log(problems.length ? `selftest FAILED:\n  ${problems.join('\n  ')}` : `selftest passed: ${EXPECTED.length} sites, every predicate and its negative`);
    return problems.length ? 1 : 0;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv[2] === '--selftest') process.exit(selftest());
  const [repo, commitArg, out] = process.argv.slice(2);
  if (!repo || !commitArg || !out) { console.error('usage: timeout_census.mjs REPO COMMIT OUT.json | --selftest'); process.exit(2); }
  const self = fileURLToPath(import.meta.url);
  const result = census(repo, commitArg);
  writeFileSync(out, JSON.stringify({ tool: { name: path.basename(self), sha256: createHash('sha256').update(readFileSync(self)).digest('hex') }, ...result }, null, 1) + '\n');
  const { summary, secondMethod } = result;
  console.log(JSON.stringify({ commit: result.commit.slice(0, 8), population: result.population.files, sites: summary.sites, files: summary.files,
    withoutReason: summary.withoutReason, filesWithoutReason: summary.filesWithoutReason, withoutCitation: summary.withoutCitation,
    filesWithoutCitation: summary.filesWithoutCitation, regexLines: secondMethod.regexLines, matched: secondMethod.matched,
    onlyByRegex: secondMethod.onlyByRegex.length, onlyByAst: secondMethod.onlyByAst.length }));
}
