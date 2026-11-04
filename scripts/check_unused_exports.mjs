// Unused-export check (syzygy-bpyt.4.9): dead, self-only and uncommented test-only exports.
//
//   node scripts/check_unused_exports.mjs [--json out.json] [--report]   scan the tracked tree
//   node scripts/check_unused_exports.mjs --selftest                     fixtures, then one run per mutant
//
// Replaces the one-off census in docs/evidence/poc-core-hygiene-2026-10-22/export_census.py (whose regex
// predecessor a '/*' inside a string derailed). Method: every tracked code file outside docs/ is parsed once by the
// TypeScript compiler API, so a comment is never a node and a string is never a comment. Identifier nodes are counted
// per file; a string literal whose text is exactly an identifier also counts (`mod['name']`), erring toward keeping an
// export. A name is matched by spelling, not by symbol, so a same-named local elsewhere keeps an export alive: the
// classes under-report, never over-report.
//
// Per workspace (`packages/*`, `apps/*`) the declared exports are the top-level `export` declarations and
// `export { ... }` specifiers of its non-test `src/**/*.ts` files except the barrels (the files a package.json
// `exports` entry names under `source`; their own declarations are not audited). A barrel is not always a pure
// re-export file (`cli.ts`, `review.ts` are subpath modules with logic), so its ordinary identifier uses count; only
// its re-export specifiers (`export { x } from`, which name the export without using it) do not. Uses are counted in
// tracked code files outside docs/ (evidence scripts are not consumers). Classes, first match wins:
//   public     a non-test file outside the workspace's src/ uses it
//   internal   another non-test file under its src/ uses it
//   test-only  a *.test.* file uses it and no non-test file does
//   self-only  only its own file uses it (beyond the declaration)
//   dead       nothing uses it
// `published` marks an export a barrel re-exports by name or by `export *` from its declaring file: removing it
// changes a package's public API. It never changes the class or the finding; it is a flag beside them.
// Reported as findings: dead, self-only, and test-only with no `Test seam` in a comment leading its declaration.
// Exit 1 when there is any finding (`--report` always exits 0). Not wired into CI or the status battery.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SELF = fileURLToPath(import.meta.url);
const CODE = /\.(ts|mts|mjs|js|cjs)$/;
const TEST = /\.test\.(ts|mts|mjs|js|cjs)$/;
const SEAM = /Test seam/;

/** Tracked files the census reads: code outside docs/ and node_modules/. */
export const isScannable = (path) => CODE.test(path) && !path.startsWith('docs/') && !path.startsWith('node_modules/');

function declNameNodes(statement) {
  const out = [];
  const bind = (name) => {
    if (ts.isIdentifier(name)) out.push(name);
    else for (const e of name.elements) if (ts.isBindingElement(e)) bind(e.name);
  };
  if (ts.isVariableStatement(statement)) for (const d of statement.declarationList.declarations) bind(d.name);
  else if (statement.name && ts.isIdentifier(statement.name)) out.push(statement.name);
  return out;
}

const isExported = (s) => {
  const kinds = (ts.getModifiers(s) ?? []).map((m) => m.kind);
  return kinds.includes(ts.SyntaxKind.ExportKeyword) && !kinds.includes(ts.SyntaxKind.DefaultKeyword);
};
const seamNear = (text, statement) => (ts.getLeadingCommentRanges(text, statement.getFullStart()) ?? []).some((r) => SEAM.test(text.slice(r.pos, r.end)));

/**
 * Parse one file: identifier counts (declaration sites excluded), the subset of them that sit in `export { } from`
 * specifiers, its re-export edges, and its declared exports.
 */
export function scanFile(name, text) {
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  const skip = new Set();
  const exports = [];
  const reexportFrom = [];
  const starFrom = [];
  const locals = new Map();
  for (const s of source.statements) for (const id of declNameNodes(s)) locals.set(id.text, [...(locals.get(id.text) ?? []), s]);
  const lineOf = (node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  let star = false;
  for (const s of source.statements) {
    if (ts.isExportDeclaration(s)) {
      if (s.exportClause && ts.isNamedExports(s.exportClause)) {
        for (const e of s.exportClause.elements) {
          if (s.moduleSpecifier) { reexportFrom.push({ imported: (e.propertyName ?? e.name).text, spec: s.moduleSpecifier.text }); continue; }
          const local = (e.propertyName ?? e.name).text;
          const decls = locals.get(local) ?? [];
          for (const d of decls) for (const id of declNameNodes(d)) skip.add(id);
          const seam = seamNear(text, s) || decls.some((d) => seamNear(text, d));
          exports.push({ name: e.name.text, line: lineOf(e), seam });
        }
      } else {
        if (!s.exportClause) star = true;
        starFrom.push(s.moduleSpecifier.text);
      }
    } else if (isExported(s)) {
      const seam = seamNear(text, s);
      for (const id of declNameNodes(s)) {
        skip.add(id);
        exports.push({ name: id.text, line: lineOf(id), seam });
      }
    }
  }
  const counts = new Map();
  const reexports = new Map();
  const bump = (m, t) => m.set(t, (m.get(t) ?? 0) + 1);
  const walk = (node) => {
    if (ts.isIdentifier(node)) {
      const p = node.parent;
      const listed = ts.isExportSpecifier(p);
      const reexport = listed && Boolean(p.parent.parent.moduleSpecifier);
      // A local export list names the declaration; it is not a use.
      if (!(listed && !reexport) && !skip.has(node)) {
        bump(counts, node.text);
        if (reexport) bump(reexports, node.text);
      }
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      bump(counts, node.text);
    }
    ts.forEachChild(node, walk);
  };
  walk(source);
  return { counts, reexports, reexportFrom, starFrom, exports: dedupe(exports), star };
}

function dedupe(rows) {
  const seen = new Map();
  for (const r of rows) if (!seen.has(r.name)) seen.set(r.name, r);
  return [...seen.values()];
}

const resolveSpec = (from, spec) => posix.join(posix.dirname(from), spec).replace(/\.js$/, '.ts');

/**
 * files: Map<path, text>; units: [{ id, prefix, barrels:Set<path> }]. Returns { rows, star, scanned }.
 * Each row: { unit, file, name, line, class, seam, published, finding }.
 */
export function analyze(files, units) {
  const scans = new Map();
  for (const [path, text] of files) if (CODE.test(path)) scans.set(path, scanFile(path, text));
  const allBarrels = new Set(units.flatMap((u) => [...u.barrels]));
  // What a barrel publishes: `file\0name` for a named re-export, `file` for `export *` / `export * as ns`.
  const published = new Set();
  for (const [path, scan] of scans) {
    if (!allBarrels.has(path)) continue;
    for (const r of scan.reexportFrom) published.add(`${resolveSpec(path, r.spec)}\0${r.imported}`);
    for (const spec of scan.starFrom) published.add(resolveSpec(path, spec));
  }
  // A barrel's re-export specifiers name an export without using it; everything else it says is a use.
  const usesOf = (path, scan, name) => (scan.counts.get(name) ?? 0) - (allBarrels.has(path) ? scan.reexports.get(name) ?? 0 : 0);
  const rows = [];
  const star = [];
  for (const unit of units) {
    for (const [file, scan] of scans) {
      if (!file.startsWith(unit.prefix) || !file.endsWith('.ts') || file.endsWith('.d.ts') || TEST.test(file) || allBarrels.has(file)) continue;
      if (scan.star) star.push(file);
      for (const e of scan.exports) {
        let outside = false;
        let inside = false;
        let tests = false;
        for (const [other, os] of scans) {
          if (other === file || usesOf(other, os, e.name) === 0) continue;
          if (TEST.test(other)) tests = true;
          else if (other.startsWith(unit.prefix)) inside = true;
          else outside = true;
        }
        const cls = outside ? 'public' : inside ? 'internal' : tests ? 'test-only' : scan.counts.has(e.name) ? 'self-only' : 'dead';
        const finding = cls === 'dead' || cls === 'self-only' || (cls === 'test-only' && !e.seam);
        rows.push({ unit: unit.id, file, name: e.name, line: e.line, class: cls, seam: e.seam, published: published.has(file) || published.has(`${file}\0${e.name}`), finding });
      }
    }
  }
  return { rows, star, scanned: scans.size };
}

export function sourceEntries(value, out = []) {
  if (typeof value === 'string') return out;
  for (const [k, v] of Object.entries(value ?? {})) {
    if (k === 'source' && typeof v === 'string') out.push(v);
    else sourceEntries(v, out);
  }
  return out;
}

/** packages: [{ group, dir, pkg }] -> units. */
export function unitsFromPackages(packages) {
  return packages.map(({ group, dir, pkg }) => ({
    id: `${group}/${dir}`,
    prefix: `${group}/${dir}/src/`,
    barrels: new Set(sourceEntries(pkg.exports).map((p) => posix.normalize(`${group}/${dir}/${p}`))),
  }));
}

export function discover(root, list = readdirSync) {
  const packages = [];
  for (const group of ['packages', 'apps']) {
    for (const dir of list(join(root, group)).sort()) {
      const pkgPath = join(root, group, dir, 'package.json');
      if (existsSync(pkgPath)) packages.push({ group, dir, pkg: JSON.parse(readFileSync(pkgPath, 'utf8')) });
    }
  }
  return unitsFromPackages(packages);
}

/** Read the scannable paths that still exist on disk (a tracked file may be deleted in the working tree). */
export function loadFiles(root, paths) {
  const files = new Map();
  for (const path of paths) if (isScannable(path) && existsSync(join(root, path))) files.set(path, readFileSync(join(root, path), 'utf8'));
  return files;
}

export function trackedFiles(root) {
  const ls = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (ls.status !== 0) throw new Error(`git ls-files failed: ${ls.stderr}`);
  return loadFiles(root, ls.stdout.split('\0'));
}

/** Exit status of a census run: 1 on any finding unless `--report` was asked for. */
export const exitCodeFor = (rows, report) => (rows.some((r) => r.finding) && !report ? 1 : 0);

// ---- selftest -------------------------------------------------------------------------------------------------
// Fixture workspaces: two units, a pure barrel, a logic-bearing subpath barrel, declarers, internal and outside users,
// tests, and files the census must not read. Expected values are literals, never read from the tool.
const FIXTURE_UNITS = [
  { id: 'pkg', prefix: 'pkg/src/', barrels: new Set(['pkg/src/index.ts', 'pkg/src/sub.ts']) },
  { id: 'pkg2', prefix: 'pkg2/src/', barrels: new Set(['pkg2/src/index.ts']) },
];
const FIXTURE_FILES = new Map([
  ['pkg/src/a.ts', [
    'export const deadThing = 1;',
    'export const selfOnlyThing = 2;',
    'export const useSelf = selfOnlyThing + 1;',
    'export const testOnlyBare = 3;',
    '// Test seam: the tests pin it.',
    'export const testOnlySeam = 4;',
    '/** Test seam: block form. */',
    'export function testOnlySeamFn() {}',
    'export const internalThing = 5;',
    'export const publicThing = 6;',
    'export const commentOnlyThing = 7;',
    '// commentOnlyThing is only named in this comment',
    'export const barrelOnlyThing = 8;',
    'const listedLocal = 9;',
    '// Test seam: listed below.',
    'const listedSeamLocal = 10;',
    'export { listedLocal, listedSeamLocal };',
    'const listedDead = 13;',
    'export {',
    '  listedDead,',
    '};',
    '// Test seam: first overload carries it.',
    'export function overloaded(a: string): void;',
    'export function overloaded(a: number): void;',
    'export function overloaded(a: unknown): void { void a; }',
    "export const globHolder = '**/*.ts'; export const afterGlob = 11; /* c */ export const afterGlobUse = afterGlob + 1;",
    "export const stringOnly = 'http://h/x'; export const quotedOnly = 12;",
    'export interface RedisShapedMeasurement { n: number }',
    'export const bothThing = 14;',
    'export const internalAndTest = 15;',
    'export const selfAndTest = 16; export const useSelfAndTest = selfAndTest + 1;',
    '// only a plain comment',
    'export const plainCommentOnly = 17;',
    '// the seam of it',
    'export const seamWordOnly = 18;',
    '// test seam: lowercase',
    'export const seamLowercase = 19;',
    'const listedOnListLocal = 20;',
    '// Test seam: leads the list.',
    'export { listedOnListLocal };',
    '// Test seam: on the first overload only.',
    'function lo(a: string): void;',
    'function lo(a: number): void;',
    'function lo(a: unknown): void { void a; }',
    'export { lo };',
    '// Test seam: on the aliased declaration.',
    'const aliasLocal = 22;',
    'export { aliasLocal as aliasPublic };',
    'export const tplOnly = 23;',
    'export const mjsTestUsed = 24;',
    'export const subUsed = 25;',
    'export const subReexported = 26;',
    'export const aliasSource = 27;',
    'export const sameName = 28;',
    'export const mjsConsumed = 29;',
    "import { importedThing } from './c.js';",
    'export { importedThing };',
    'export const docOnlyThing = 30;',
    'export const reexportedThing = 31;',
    'export const { dA, dB: [dC] } = JSON.parse("{}");',
    'export const [, dD] = [1, 2];',
    'export namespace NsThing { export const inner = 1; }',
    "export declare module 'strmod' {}",
    'export default function defaultFn() {}',
    'const plainLocal = 21; void plainLocal;',
    'declare const ambientLocal: number;',
    'export class ClassT {}',
    'export type TypeT = 1;',
    'export const attestUsed = 32; export const bakOnly = 33; export const lintsOnly = 34;',
    'export const mtsConsumed = 35; export const jsConsumed = 36; export const cjsConsumed = 37;',
    'export const tMts = 38; export const tJs = 39; export const tCjs = 40;',
    'export const wrapUsed = 41;',
    'export const',
    '  multiLine = 42;',
    '',
  ].join('\n')],
  ['pkg/src/b.ts', [
    "import { internalThing, RedisShapedMeasurement, bothThing, internalAndTest } from './a.js';",
    "const g = '**/*.ts'; /* later */",
    'export const useInternal: RedisShapedMeasurement | typeof internalThing = internalThing;',
    "const q = { n: 1 }; void (q as never)['quotedOnly']; void (q as never)[`tplOnly`];",
    'void [bothThing, internalAndTest, g];',
    '',
  ].join('\n')],
  ['pkg/src/a.test.ts', [
    "import { testOnlyBare, testOnlySeam, testOnlySeamFn, listedLocal, listedSeamLocal, overloaded, internalAndTest, selfAndTest, plainCommentOnly, seamWordOnly, seamLowercase, listedOnListLocal, lo, aliasPublic } from './a.js';",
    'void [testOnlyBare, testOnlySeam, testOnlySeamFn, listedLocal, listedSeamLocal, overloaded, internalAndTest, selfAndTest, plainCommentOnly, seamWordOnly, seamLowercase, listedOnListLocal, lo, aliasPublic];',
    'export const testFileExport = 1;',
    '',
  ].join('\n')],
  ['pkg/src/attest.ts', "import { attestUsed } from './a.js';\nvoid attestUsed;\n"],
  ['pkg/src/a.ts.bak', "import { bakOnly } from './a.js';\nvoid bakOnly;\n"],
  ['app/lints', "import { lintsOnly } from '@pkg/core';\nvoid lintsOnly;\n"],
  ['app/y.mts', "import { mtsConsumed } from '@pkg/core';\nvoid mtsConsumed;\n"],
  ['app/z.js', "import { jsConsumed } from '@pkg/core';\nvoid jsConsumed;\n"],
  ['app/w.cjs', "const { cjsConsumed } = require('@pkg/core');\nvoid cjsConsumed;\n"],
  ['pkg/src/t.test.mts', "import { tMts } from './a.js';\nvoid tMts;\n"],
  ['pkg/src/t.test.js', "import { tJs } from './a.js';\nvoid tJs;\n"],
  ['pkg/src/t.test.cjs', "const { tCjs } = require('./a.js');\nvoid tCjs;\n"],
  ['pkg/src/wrap.test.mjs.ts', "import { wrapUsed } from './a.js';\nexport const wrapDecl = wrapUsed;\n"],
  ['pkg/src/nsfile.ts', "export * as nsInFile from './a.js';\n"],
  ['pkg/src/m.test.mjs', "import { mjsTestUsed } from './a.js';\nvoid mjsTestUsed;\n"],
  ['pkg/src/mod.mjs', 'export const mjsDecl = 1;\n'],
  ['pkg/src/types.d.ts', 'export declare const dtsThing: number;\n'],
  ['pkg/src/sub.ts', "import { subUsed } from './a.js';\nexport const subHolder = subUsed + 1;\nexport { subReexported } from './a.js';\n"],
  ['pkg/src/index.ts', [
    "export * from './star.js';",
    "export { barrelOnlyThing } from './a.js';",
    "export { aliasSource as aliasOut } from './a.js';",
    "export { sameName } from './c.js';",
    "export * as nsAll from './ns.js';",
    '',
  ].join('\n')],
  ['pkg/src/star.ts', 'export const starMember = 1;\n'],
  ['pkg/src/ns.ts', 'export const nsMember = 1;\n'],
  ['pkg/src/c.ts', 'export const sameName = 1;\nexport const importedThing = 2;\n'],
  ['pkg/src/starfile.ts', "export * from './a.js';\n"],
  ['pkg/src/reex.ts', "export { reexportedThing } from './a.js';\n"],
  ['pkg2/src/z.ts', 'export const otherUnitThing = 1;\n'],
  ['app/x.ts', "import { publicThing, bothThing } from '@pkg/core';\nvoid [publicThing, bothThing];\n"],
  ['app/x.test.ts', "import { testOnlyBare } from '@pkg/core';\nvoid testOnlyBare;\n"],
  ['scripts/tool.mjs', "import { mjsConsumed } from '@pkg/core';\nvoid mjsConsumed;\n"],
  ['app/notes.md', 'docOnlyThing;\n'],
]);
// name (or name@file) -> [class, finding, published, line?]
const FIXTURE_EXPECTED = {
  deadThing: ['dead', true, false, 1],
  selfOnlyThing: ['self-only', true, false],
  useSelf: ['dead', true, false],
  testOnlyBare: ['test-only', true, false],
  testOnlySeam: ['test-only', false, false, 6],
  testOnlySeamFn: ['test-only', false, false],
  internalThing: ['internal', false, false],
  publicThing: ['public', false, false],
  commentOnlyThing: ['dead', true, false],
  barrelOnlyThing: ['dead', true, true],
  listedLocal: ['test-only', true, false],
  listedSeamLocal: ['test-only', false, false],
  listedDead: ['dead', true, false, 20],
  overloaded: ['test-only', false, false],
  globHolder: ['dead', true, false],
  afterGlob: ['self-only', true, false],
  afterGlobUse: ['dead', true, false],
  stringOnly: ['dead', true, false],
  quotedOnly: ['internal', false, false],
  RedisShapedMeasurement: ['internal', false, false],
  useInternal: ['dead', true, false],
  bothThing: ['public', false, false],
  internalAndTest: ['internal', false, false],
  selfAndTest: ['test-only', true, false],
  useSelfAndTest: ['dead', true, false],
  plainCommentOnly: ['test-only', true, false],
  seamWordOnly: ['test-only', true, false],
  seamLowercase: ['test-only', true, false],
  listedOnListLocal: ['test-only', false, false],
  lo: ['test-only', false, false],
  aliasPublic: ['test-only', false, false],
  tplOnly: ['internal', false, false],
  mjsTestUsed: ['test-only', true, false],
  subUsed: ['internal', false, false],
  subReexported: ['dead', true, true],
  aliasSource: ['dead', true, true],
  'sameName@pkg/src/a.ts': ['dead', true, false],
  mjsConsumed: ['public', false, false],
  'importedThing@pkg/src/a.ts': ['self-only', true, false],
  'importedThing@pkg/src/c.ts': ['internal', false, false],
  docOnlyThing: ['dead', true, false],
  reexportedThing: ['internal', false, false],
  dA: ['dead', true, false],
  dC: ['dead', true, false],
  dD: ['dead', true, false],
  NsThing: ['dead', true, false],
  ClassT: ['dead', true, false],
  TypeT: ['dead', true, false],
  attestUsed: ['internal', false, false],
  bakOnly: ['dead', true, false],
  lintsOnly: ['dead', true, false],
  mtsConsumed: ['public', false, false],
  jsConsumed: ['public', false, false],
  cjsConsumed: ['public', false, false],
  tMts: ['test-only', true, false],
  tJs: ['test-only', true, false],
  tCjs: ['test-only', true, false],
  wrapUsed: ['internal', false, false],
  wrapDecl: ['dead', true, false],
  multiLine: ['dead', true, false, 74],
  starMember: ['dead', true, true],
  nsMember: ['dead', true, true],
  'sameName@pkg/src/c.ts': ['dead', true, true],
  otherUnitThing: ['dead', true, false],
};
// Names declared by files or statements the census must not audit.
const FIXTURE_ABSENT = ['testFileExport', 'mjsDecl', 'dtsThing', 'subHolder', 'defaultFn', 'plainLocal', 'ambientLocal', 'strmod', 'inner'];
const FIXTURE_CODE_FILES = 26;

let failed = 0;
let checks = 0;
function check(ok, label) {
  checks += 1;
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
}

function selftestFixtures() {
  failed = 0;
  checks = 0;
  const { rows, star, scanned } = analyze(FIXTURE_FILES, FIXTURE_UNITS);
  for (const [key, [cls, finding, published, line]] of Object.entries(FIXTURE_EXPECTED)) {
    const [name, file] = key.split('@');
    const r = rows.find((x) => x.name === name && (file === undefined || x.file === file));
    const ok = r?.class === cls && r?.finding === finding && r?.published === published && (line === undefined || r?.line === line);
    check(ok, `${key}: expected ${cls}${finding ? ' (finding)' : ''}${published ? ' published' : ''}${line ? ` line ${line}` : ''}, got ${r ? `${r.class}${r.finding ? ' (finding)' : ''}${r.published ? ' published' : ''} line ${r.line}` : 'absent'}`);
  }
  const present = FIXTURE_ABSENT.filter((n) => rows.some((r) => r.name === n));
  check(present.length === 0, `not audited: ${FIXTURE_ABSENT.length} names absent${present.length ? `, found ${present.join(', ')}` : ''}`);
  check(rows.length === Object.keys(FIXTURE_EXPECTED).length, `row count ${rows.length} equals ${Object.keys(FIXTURE_EXPECTED).length} expectations`);
  check(rows.every((r) => r.unit === (r.file.startsWith('pkg2/') ? 'pkg2' : 'pkg')), 'every row sits in the unit owning its file');
  check(JSON.stringify(star) === JSON.stringify(['pkg/src/starfile.ts']), `export * declarers: ${star.join(', ') || 'none'}`);
  check(scanned === FIXTURE_CODE_FILES, `code files scanned: ${scanned}`);
  selftestHelpers();
  console.log(`fixtures: ${checks - failed} of ${checks} hold`);
  return failed;
}

function selftestHelpers() {
  const scannable = ['a.ts', 'x/b.mts', 'c.mjs', 'd.js', 'e.cjs', 'packages/p/docs/g.ts', 'xdocs/h.ts', 'node_modulesish/i.ts'];
  const not = ['a.json', 'docs/a.ts', 'node_modules/x/y.js', 'a.tsx', 'a.md', 'a.ts.bak'];
  check(scannable.every(isScannable) && not.every((p) => !isScannable(p)), `isScannable: ${scannable.length} read, ${not.length} refused`);

  const exportsMap = { '.': { source: './src/index.ts', types: './dist/index.d.ts' }, './sub': { import: { source: './src/sub.ts' } }, './plain': './dist/p.js', './null': null, './odd': { source: { default: './src/odd.ts' } } };
  const units = unitsFromPackages([{ group: 'packages', dir: 'p', pkg: { exports: exportsMap } }, { group: 'apps', dir: 'q', pkg: {} }]);
  const want = [{ id: 'packages/p', prefix: 'packages/p/src/', barrels: ['packages/p/src/index.ts', 'packages/p/src/sub.ts'] }, { id: 'apps/q', prefix: 'apps/q/src/', barrels: [] }];
  check(JSON.stringify(units.map((u) => ({ ...u, barrels: [...u.barrels] }))) === JSON.stringify(want), 'unitsFromPackages: prefixes and normalized source barrels (nested, string, null, object-valued)');

  const dir = mkdtempSync(join(tmpdir(), 'unused-exports-fs-'));
  try {
    const put = (rel, text) => { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), text); };
    mkdirSync(join(dir, 'packages'), { recursive: true });
    mkdirSync(join(dir, 'apps'), { recursive: true });
    for (const d of ['m', 'b', 'h', 'd', 'g', 'a', 'f', 'c', 'zed']) put(`packages/${d}/package.json`, d === 'zed' ? JSON.stringify({ exports: { '.': { source: './src/index.ts' } } }) : '{}');
    put('packages/nopkg/readme.txt', 'x');
    put('apps/web/package.json', '{}');
    // A directory listing's order is the file system's; hand discover the worst case.
    const ids = discover(dir, (p) => readdirSync(p).sort().reverse()).map((u) => u.id);
    check(JSON.stringify(ids) === JSON.stringify([...'abcdfghm'].map((d) => `packages/${d}`).concat(['packages/zed', 'apps/web'])), 'discover: sorted, groups in order, directories without package.json skipped');
    put('kept.ts', 'export const k = 1;');
    put('docs/doc.ts', 'export const d = 1;');
    put('we ird/qu"ote.ts', 'export const q = 1;');
    const loaded = loadFiles(dir, ['kept.ts', 'gone.ts', 'docs/doc.ts', 'note.md']);
    check(JSON.stringify([...loaded.keys()]) === JSON.stringify(['kept.ts']), 'loadFiles: missing and unscannable paths dropped');
    let threw = false;
    try { trackedFiles(dir); } catch { threw = true; }
    check(threw, 'trackedFiles: a directory that is not a git repository throws');
    const git = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
    git('init', '-q');
    git('add', 'kept.ts', 'docs/doc.ts', 'we ird/qu"ote.ts');
    const tracked = [...trackedFiles(dir).keys()].sort();
    check(JSON.stringify(tracked) === JSON.stringify(['kept.ts', 'we ird/qu"ote.ts']), 'trackedFiles: NUL-separated listing, quoted path intact, docs/ left out');
    const finding = [{ finding: false }, { finding: true }];
    check(exitCodeFor(finding, false) === 1 && exitCodeFor(finding, true) === 0 && exitCodeFor([{ finding: false }], false) === 0, 'exit status: 1 on a finding, 0 with --report or none');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Each mutant rewrites one predicate of this file; the fixtures (and the helper checks) must then fail. `old` must
// occur exactly once in this file outside the MUTANTS block. A mutant that throws counts as killed.
// MUTANTS-BEGIN
const MUTANTS = [
  // scanFile: what counts as a use
  { id: 'string-literal-names-not-counted', old: 'ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)', new: 'false' },
  { id: 'template-literal-names-not-counted', old: 'ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)', new: 'ts.isStringLiteral(node)' },
  { id: 'identifier-uses-not-counted', old: 'if (!(listed && !reexport) && !skip.has(node)) {', new: 'if (false) {' },
  { id: 'declaration-site-counted-as-use', old: '!(listed && !reexport) && !skip.has(node)', new: '!(listed && !reexport)' },
  { id: 'export-list-specifier-counted-as-use', old: '!(listed && !reexport) && !skip.has(node)', new: '!skip.has(node)' },
  { id: 'export-specifier-test-off', old: 'const listed = ts.isExportSpecifier(p);', new: 'const listed = false;' },
  { id: 'reexport-specifier-not-a-use', old: 'const reexport = listed && Boolean(p.parent.parent.moduleSpecifier);', new: 'const reexport = false;' },
  { id: 'reexport-specifier-not-tracked', old: 'if (reexport) bump(reexports, node.text);', new: '' },
  // scanFile: what is declared
  { id: 'reexport-specifier-declares-export', old: 'if (s.moduleSpecifier) { reexportFrom.push(', new: 'if (false) { reexportFrom.push(' },
  { id: 'reexport-edge-uses-alias-not-original', old: '{ imported: (e.propertyName ?? e.name).text, spec', new: '{ imported: e.name.text, spec' },
  { id: 'namespace-export-read-as-named-list', old: 'ts.isNamedExports(s.exportClause)', new: 'true' },
  { id: 'star-flag-never-set', old: 'if (!s.exportClause) star = true;', new: '' },
  { id: 'star-flag-set-by-namespace-export', old: 'if (!s.exportClause) star = true;', new: 'star = true;' },
  { id: 'list-seam-only-on-export-statement', old: 'const seam = seamNear(text, s) || decls.some((d) => seamNear(text, d));', new: 'const seam = seamNear(text, s);' },
  { id: 'list-seam-only-on-declaration', old: 'const seam = seamNear(text, s) || decls.some', new: 'const seam = decls.some' },
  { id: 'overloaded-local-keeps-last-declaration', old: 'locals.set(id.text, [...(locals.get(id.text) ?? []), s])', new: 'locals.set(id.text, [s])' },
  { id: 'list-of-imported-name-crashes', old: 'locals.get(local) ?? []', new: 'locals.get(local)' },
  { id: 'list-local-found-by-exported-alias', old: 'const local = (e.propertyName ?? e.name).text;', new: 'const local = e.name.text;' },
  { id: 'list-export-named-by-local', old: 'exports.push({ name: e.name.text, line: lineOf(e), seam });', new: 'exports.push({ name: (e.propertyName ?? e.name).text, line: lineOf(e), seam });' },
  { id: 'list-declaration-site-not-skipped', old: 'for (const d of decls) for (const id of declNameNodes(d)) skip.add(id);', new: '' },
  { id: 'list-line-taken-from-statement', old: 'line: lineOf(e), seam });', new: 'line: lineOf(s), seam });' },
  { id: 'declaration-line-taken-from-statement', old: 'exports.push({ name: id.text, line: lineOf(id), seam });', new: 'exports.push({ name: id.text, line: lineOf(s), seam });' },
  { id: 'line-numbers-zero-based', old: '.line + 1;', new: '.line;' },
  { id: 'line-taken-from-leading-trivia', old: 'node.getStart(source)', new: 'node.pos' },
  { id: 'declaration-without-export-keyword-audited', old: 'return kinds.includes(ts.SyntaxKind.ExportKeyword) && !', new: 'return kinds.length > 0 && !' },
  { id: 'default-export-audited', old: ' && !kinds.includes(ts.SyntaxKind.DefaultKeyword)', new: '' },
  { id: 'statement-without-modifiers-crashes-export-read', old: 'const kinds = (ts.getModifiers(s) ?? [])', new: 'const kinds = (ts.getModifiers(s))' },
  { id: 'string-named-declaration-audited', old: 'statement.name && ts.isIdentifier(statement.name)', new: 'statement.name' },
  { id: 'nameless-statement-read-as-named', old: 'statement.name && ts.isIdentifier(statement.name)', new: 'ts.isIdentifier(statement.name)' },
  { id: 'destructuring-not-bound', old: 'else for (const e of name.elements) if (ts.isBindingElement(e)) bind(e.name);', new: '' },
  { id: 'omitted-binding-element-bound', old: 'if (ts.isBindingElement(e)) bind(e.name);', new: 'bind(e.name);' },
  { id: 'variable-declarations-not-read', old: 'if (ts.isVariableStatement(statement)) for', new: 'if (false) for' },
  { id: 'same-name-export-deduped-away', old: 'if (!seen.has(r.name)) seen.set(r.name, r);', new: 'seen.set(r.name, r);' },
  // the Test seam comment
  { id: 'seam-matches-any-only-word', old: 'const SEAM = /Test seam/;', new: 'const SEAM = /Test seam|only/;' },
  { id: 'seam-matches-bare-seam-word', old: 'const SEAM = /Test seam/;', new: 'const SEAM = /seam/;' },
  { id: 'seam-matches-lowercase', old: 'const SEAM = /Test seam/;', new: 'const SEAM = /test seam/i;' },
  { id: 'seam-read-from-statement-start-not-leading-trivia', old: 'statement.getFullStart()', new: 'statement.getStart()' },
  { id: 'jsdoc-comment-ignored', old: 'getLeadingCommentRanges(text, statement.getFullStart()) ?? []).some((r) => SEAM', new: 'getLeadingCommentRanges(text, statement.getFullStart()) ?? []).filter((r) => r.kind === ts.SyntaxKind.SingleLineCommentTrivia).some((r) => SEAM' },
  { id: 'statement-without-comment-crashes-seam-read', old: 'statement.getFullStart()) ?? []).some', new: 'statement.getFullStart())).some' },
  // which files are read
  { id: 'code-filter-off', old: 'if (CODE.test(path)) scans.set(path, scanFile(path, text));', new: 'scans.set(path, scanFile(path, text));' },
  { id: 'code-regex-drops-mjs', old: 'const CODE = /\\.(ts|mts|mjs|js|cjs)$/;', new: 'const CODE = /\\.(ts|mts|js|cjs)$/;' },
  { id: 'code-regex-drops-mts', old: 'const CODE = /\\.(ts|mts|mjs|js|cjs)$/;', new: 'const CODE = /\\.(ts|mjs|js|cjs)$/;' },
  { id: 'code-regex-drops-js', old: 'const CODE = /\\.(ts|mts|mjs|js|cjs)$/;', new: 'const CODE = /\\.(ts|mts|mjs|cjs)$/;' },
  { id: 'code-regex-drops-cjs', old: 'const CODE = /\\.(ts|mts|mjs|js|cjs)$/;', new: 'const CODE = /\\.(ts|mts|mjs|js)$/;' },
  { id: 'code-regex-end-anchor-dropped', old: 'const CODE = /\\.(ts|mts|mjs|js|cjs)$/;', new: 'const CODE = /\\.(ts|mts|mjs|js|cjs)/;' },
  { id: 'code-regex-dot-any-char', old: 'const CODE = /\\.(ts|mts|mjs|js|cjs)$/;', new: 'const CODE = /.(ts|mts|mjs|js|cjs)$/;' },
  { id: 'test-regex-drops-mts', old: 'const TEST = /\\.test\\.(ts|mts|mjs|js|cjs)$/;', new: 'const TEST = /\\.test\\.(ts|mjs|js|cjs)$/;' },
  { id: 'test-regex-drops-mjs', old: 'const TEST = /\\.test\\.(ts|mts|mjs|js|cjs)$/;', new: 'const TEST = /\\.test\\.(ts|mts|js|cjs)$/;' },
  { id: 'test-regex-drops-js', old: 'const TEST = /\\.test\\.(ts|mts|mjs|js|cjs)$/;', new: 'const TEST = /\\.test\\.(ts|mts|mjs|cjs)$/;' },
  { id: 'test-regex-drops-cjs', old: 'const TEST = /\\.test\\.(ts|mts|mjs|js|cjs)$/;', new: 'const TEST = /\\.test\\.(ts|mts|mjs|js)$/;' },
  { id: 'test-regex-drops-ts', old: 'const TEST = /\\.test\\.(ts|mts|mjs|js|cjs)$/;', new: 'const TEST = /\\.test\\.(mts|mjs|js|cjs)$/;' },
  { id: 'test-regex-end-anchor-dropped', old: 'const TEST = /\\.test\\.(ts|mts|mjs|js|cjs)$/;', new: 'const TEST = /\\.test\\.(ts|mts|mjs|js|cjs)/;' },
  { id: 'test-regex-leading-dot-any-char', old: 'const TEST = /\\.test\\.(ts|mts|mjs|js|cjs)$/;', new: 'const TEST = /.test\\.(ts|mts|mjs|js|cjs)$/;' },
  { id: 'test-regex-without-dots', old: 'const TEST = /\\.test\\.(ts|mts|mjs|js|cjs)$/;', new: 'const TEST = /test(ts|mts|mjs|js|cjs)$/;' },
  { id: 'scannable-drops-code-test', old: 'CODE.test(path) && !path.startsWith', new: '!path.startsWith' },
  { id: 'scannable-keeps-docs', old: " && !path.startsWith('docs/')", new: '' },
  { id: 'scannable-keeps-node-modules', old: " && !path.startsWith('node_modules/')", new: '' },
  { id: 'scannable-docs-anywhere', old: "!path.startsWith('docs/')", new: "!path.includes('docs/')" },
  // declarers
  { id: 'declarer-prefix-ignored', old: '!file.startsWith(unit.prefix) ||', new: 'false ||' },
  { id: 'declarer-non-ts-audited', old: "!file.endsWith('.ts') ||", new: 'false ||' },
  { id: 'declarer-d-ts-audited', old: "file.endsWith('.d.ts') ||", new: 'false ||' },
  { id: 'declarer-test-file-audited', old: 'TEST.test(file) ||', new: 'false ||' },
  { id: 'declarer-barrel-audited', old: 'allBarrels.has(file)) continue;', new: 'false) continue;' },
  { id: 'star-declarers-not-listed', old: 'if (scan.star) star.push(file);', new: '' },
  // users and classes
  { id: 'own-file-counts-as-user', old: 'other === file || usesOf', new: 'usesOf' },
  { id: 'every-file-counts-as-user', old: 'usesOf(other, os, e.name) === 0', new: 'false' },
  { id: 'user-test-inverted', old: 'usesOf(other, os, e.name) === 0', new: 'usesOf(other, os, e.name) > 0' },
  { id: 'tests-ignored', old: 'if (TEST.test(other)) tests = true;', new: 'if (TEST.test(other)) tests = false;' },
  { id: 'outside-user-ignored', old: 'else outside = true;', new: 'else inside = true;' },
  { id: 'sibling-user-ignored', old: 'else if (other.startsWith(unit.prefix)) inside = true;', new: 'else if (other.startsWith(unit.prefix)) outside = false;' },
  { id: 'every-user-inside', old: 'else if (other.startsWith(unit.prefix)) inside = true;', new: 'else if (true) inside = true;' },
  { id: 'barrel-re-export-specifiers-count-as-uses', old: 'allBarrels.has(path) ? scan.reexports.get(name) ?? 0 : 0', new: '0' },
  { id: 'barrel-tokens-all-ignored', old: '(scan.counts.get(name) ?? 0) - (allBarrels.has(path) ?', 'new': '(allBarrels.has(path) ? 0 : scan.counts.get(name) ?? 0) - (allBarrels.has(path) ?' },
  { id: 'use-count-undefined-is-a-use', old: '(scan.counts.get(name) ?? 0) -', new: 'scan.counts.get(name) -' },
  { id: 'reexport-count-undefined-is-a-use', old: 'scan.reexports.get(name) ?? 0 : 0', new: 'scan.reexports.get(name) : 0' },
  { id: 'inside-ranked-above-outside', old: "outside ? 'public' : inside ? 'internal'", new: "inside ? 'internal' : outside ? 'public'" },
  { id: 'tests-ranked-above-inside', old: "inside ? 'internal' : tests ? 'test-only'", new: "tests ? 'test-only' : inside ? 'internal'" },
  { id: 'self-use-ranked-above-tests', old: "tests ? 'test-only' : scan.counts.has(e.name) ? 'self-only' : 'dead'", new: "scan.counts.has(e.name) ? 'self-only' : tests ? 'test-only' : 'dead'" },
  { id: 'self-only-merged-into-dead', old: "scan.counts.has(e.name) ? 'self-only' : 'dead'", new: "'dead'" },
  { id: 'dead-merged-into-self-only', old: "scan.counts.has(e.name) ? 'self-only' : 'dead'", new: "'self-only'" },
  { id: 'dead-never-a-finding', old: "const finding = cls === 'dead' || cls === 'self-only'", new: "const finding = cls === 'self-only'" },
  { id: 'self-only-never-a-finding', old: "cls === 'dead' || cls === 'self-only' ||", new: "cls === 'dead' ||" },
  { id: 'test-only-never-a-finding', old: " || (cls === 'test-only' && !e.seam);", new: ';' },
  { id: 'test-seam-comment-ignored', old: "(cls === 'test-only' && !e.seam)", new: "cls === 'test-only'" },
  { id: 'internal-a-finding', old: " || (cls === 'test-only' && !e.seam);", new: " || (cls === 'test-only' && !e.seam) || cls === 'internal';" },
  // published
  { id: 'published-ignores-named-re-exports', old: 'published.has(file) || published.has(`${file}\\0${e.name}`)', new: 'published.has(file)' },
  { id: 'published-ignores-star-re-exports', old: 'published.has(file) || published.has(`${file}\\0${e.name}`)', new: 'published.has(`${file}\\0${e.name}`)' },
  { id: 'published-read-from-non-barrels', old: 'if (!allBarrels.has(path)) continue;', new: '' },
  { id: 'named-re-exports-not-published', old: 'for (const r of scan.reexportFrom) published.add(', new: 'for (const r of []) published.add(' },
  { id: 'star-re-exports-not-published', old: 'for (const spec of scan.starFrom) published.add(', new: 'for (const spec of []) published.add(' },
  { id: 'published-name-ignores-declaring-file', old: 'published.add(`${resolveSpec(path, r.spec)}\\0${r.imported}`)', new: 'published.add(`${path.replace(/[^/]*$/, "a.ts")}\\0${r.imported}`)' },
  { id: 're-export-specifier-js-not-mapped-to-ts', old: ".replace(/\\.js$/, '.ts')", new: '' },
  { id: 're-export-specifier-not-relative-to-barrel', old: 'posix.join(posix.dirname(from), spec)', new: 'posix.join(spec)' },
  // discovery
  { id: 'string-exports-entry-walked', old: "if (typeof value === 'string') return out;", new: '' },
  { id: 'null-exports-entry-walked', old: 'Object.entries(value ?? {})', new: 'Object.entries(value)' },
  { id: 'object-valued-source-collected', old: "k === 'source' && typeof v === 'string'", new: "k === 'source'" },
  { id: 'any-string-collected-as-source', old: "k === 'source' && typeof v === 'string'", new: "typeof v === 'string'" },
  { id: 'source-path-not-normalized', old: 'posix.normalize(`${group}/${dir}/${p}`)', new: '`${group}/${dir}/${p}`' },
  { id: 'package-directories-unsorted', old: "list(join(root, group)).sort()", new: 'list(join(root, group))' },
  { id: 'directory-without-package-json-read', old: 'if (existsSync(pkgPath)) packages.push', new: 'if (true) packages.push' },
  { id: 'groups-in-reverse-order', old: "['packages', 'apps']", new: "['apps', 'packages']" },
  { id: 'deleted-tracked-file-read', old: 'isScannable(path) && existsSync(join(root, path))', new: 'isScannable(path)' },
  { id: 'unscannable-path-loaded', old: 'isScannable(path) && existsSync', new: 'existsSync' },
  { id: 'ls-files-not-nul-separated', old: "['ls-files', '-z']", new: "['ls-files']" },
  { id: 'ls-files-failure-ignored', old: 'if (ls.status !== 0) throw', new: 'if (ls.status === 0) throw' },
  { id: 'exit-status-ignores-report-flag', old: '(rows.some((r) => r.finding) && !report ? 1 : 0)', new: '(rows.some((r) => r.finding) ? 1 : 0)' },
  { id: 'exit-status-ignores-findings', old: '(rows.some((r) => r.finding) && !report ? 1 : 0)', new: '(!report ? 1 : 0)' },
];
// MUTANTS-END

function selftestMutants() {
  const full = readFileSync(SELF, 'utf8');
  const begin = full.indexOf('// MUTANTS-BEGIN');
  const end = full.indexOf('// MUTANTS-END');
  const outside = full.slice(0, begin) + full.slice(end);
  let survived = 0;
  const ids = new Set();
  for (const m of MUTANTS) {
    if (ids.has(m.id)) { survived += 1; console.log(`FAIL mutant ${m.id}: duplicate id`); continue; }
    ids.add(m.id);
    const hits = outside.split(m.old).length - 1;
    if (hits !== 1) { survived += 1; console.log(`FAIL mutant ${m.id}: fragment occurs ${hits} times outside the mutants block`); continue; }
    // Written beside the script so `typescript` resolves from the repository.
    const path = join(dirname(SELF), `.mutant-${process.pid}.mjs`);
    writeFileSync(path, full.replace(m.old, () => m.new));
    const run = spawnSync(process.execPath, [path, '--fixtures-only'], { encoding: 'utf8' });
    rmSync(path, { force: true });
    const killed = run.status === 1 && /FAIL/.test(run.stdout);
    if (!killed) survived += 1;
    console.log(`${killed ? 'killed  ' : 'SURVIVED'} ${m.id} (exit ${run.status})`);
  }
  console.log(`mutants: ${MUTANTS.length - survived} of ${MUTANTS.length} killed`);
  return survived;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--fixtures-only')) {
    try { return selftestFixtures() ? 1 : 0; } catch (error) { console.log(`FAIL threw: ${error instanceof Error ? error.message : error}`); return 1; }
  }
  if (args.includes('--selftest')) {
    const f = selftestFixtures();
    if (f) { console.log('mutants not run: the unmutated fixtures must hold first'); return 1; }
    return selftestMutants() ? 1 : 0;
  }
  const root = join(dirname(SELF), '..');
  const units = discover(root);
  const files = trackedFiles(root);
  const { rows, star, scanned } = analyze(files, units);
  const count = (pred) => rows.filter(pred).length;
  console.log(`files scanned: ${scanned}; workspaces: ${units.length}; exports declared: ${rows.length}; star re-export files: ${star.length}`);
  const classes = ['public', 'internal', 'test-only', 'self-only', 'dead'];
  console.log(classes.map((c) => `${c}=${count((r) => r.class === c)}`).join('; '));
  const seamed = count((r) => r.class === 'test-only' && r.seam);
  const bare = count((r) => r.class === 'test-only' && !r.seam);
  console.log(`findings: dead=${count((r) => r.class === 'dead')}; self-only=${count((r) => r.class === 'self-only')}; test-only without Test seam=${bare} (test-only with Test seam, not a finding: ${seamed})`);
  console.log(`of the findings, published through a barrel (removal changes the public API): dead=${count((r) => r.finding && r.published && r.class === 'dead')}; self-only=${count((r) => r.finding && r.published && r.class === 'self-only')}; test-only=${count((r) => r.finding && r.published && r.class === 'test-only')}`);
  for (const u of units) {
    const mine = rows.filter((r) => r.unit === u.id);
    console.log(`  ${u.id}: exports=${mine.length}; findings=${mine.filter((r) => r.finding).length}`);
  }
  for (const r of rows.filter((x) => x.finding)) console.log(`${r.file}:${r.line} ${r.name} [${r.class === 'test-only' ? 'test-only, no Test seam' : r.class}${r.published ? ', published' : ''}]`);
  const out = args.indexOf('--json');
  if (out >= 0) writeFileSync(args[out + 1], `${JSON.stringify({ scanned, workspaces: units.length, rows }, null, 1)}\n`);
  return exitCodeFor(rows, args.includes('--report'));
}

if (process.argv[1] === SELF) process.exit(main());
