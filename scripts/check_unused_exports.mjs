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
// `exports` entry names under `source`). A barrel's tokens are not uses. Uses are counted in tracked code files
// outside docs/ (evidence scripts are not consumers). Classes, first match wins:
//   public     a non-test file outside the workspace's src/ uses it
//   internal   another non-test file under its src/ uses it
//   test-only  a *.test.* file uses it and no non-test file does
//   self-only  only its own file uses it (beyond the declaration)
//   dead       nothing uses it
// Reported as findings: dead, self-only, and test-only with no `Test seam` in a comment leading its declaration.
// Exit 1 when there is any finding (`--report` always exits 0). Not wired into CI or the status battery.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SELF = fileURLToPath(import.meta.url);
const CODE = /\.(ts|mts|mjs|js|cjs)$/;
const TEST = /\.test\.(ts|mts|mjs|js|cjs)$/;
const SEAM = /Test seam/;
const IDENT = /^[A-Za-z_$][\w$]*$/;

function declNameNodes(statement) {
  const out = [];
  const bind = (name) => {
    if (ts.isIdentifier(name)) out.push(name);
    else for (const e of name.elements) if (ts.isBindingElement(e)) bind(e.name);
  };
  if (ts.isVariableStatement(statement)) for (const d of statement.declarationList.declarations) bind(d.name);
  else if (statement.name && ts.isIdentifier(statement.name) && !ts.isExportDeclaration(statement) && !ts.isImportDeclaration(statement)) out.push(statement.name);
  return out;
}

const isExported = (s) => (ts.getModifiers(s) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword) && !(ts.getModifiers(s) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
const seamNear = (text, statement) => (ts.getLeadingCommentRanges(text, statement.getFullStart()) ?? []).some((r) => SEAM.test(text.slice(r.pos, r.end)));

/** Parse one file: identifier counts (declaration sites excluded) and its declared exports. */
export function scanFile(name, text) {
  const kind = /\.(mjs|cjs|js)$/.test(name) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, kind);
  const skip = new Set();
  const exports = [];
  const locals = new Map();
  for (const s of source.statements) for (const id of declNameNodes(s)) locals.set(id.text, [...(locals.get(id.text) ?? []), s]);
  const lineOf = (node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  let star = false;
  for (const s of source.statements) {
    if (ts.isExportDeclaration(s)) {
      if (s.exportClause && ts.isNamedExports(s.exportClause) && !s.moduleSpecifier) {
        for (const e of s.exportClause.elements) {
          const local = (e.propertyName ?? e.name).text;
          const decls = locals.get(local) ?? [];
          for (const d of decls) for (const id of declNameNodes(d)) if (id.text === local) skip.add(id);
          const seam = seamNear(text, s) || decls.some((d) => seamNear(text, d));
          exports.push({ name: e.name.text, line: lineOf(e), seam });
        }
      } else if (!s.exportClause) star = true;
    } else if (isExported(s)) {
      const seam = seamNear(text, s);
      const seen = new Set();
      for (const id of declNameNodes(s)) {
        skip.add(id);
        if (!seen.has(id.text)) exports.push({ name: id.text, line: lineOf(id), seam });
        seen.add(id.text);
      }
    }
  }
  const counts = new Map();
  const bump = (t) => counts.set(t, (counts.get(t) ?? 0) + 1);
  const walk = (node) => {
    if (ts.isIdentifier(node)) {
      const p = node.parent;
      const listed = p && ts.isExportSpecifier(p) && !p.parent.parent.moduleSpecifier;
      if (!skip.has(node) && !listed) bump(node.text);
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && IDENT.test(node.text)) {
      bump(node.text);
    }
    ts.forEachChild(node, walk);
  };
  walk(source);
  return { counts, exports: dedupe(exports), star };
}

function dedupe(rows) {
  const seen = new Map();
  for (const r of rows) if (!seen.has(r.name)) seen.set(r.name, r);
  return [...seen.values()];
}

/**
 * files: Map<path, text>; units: [{ id, prefix, barrels:Set<path> }]. Returns { rows, star, scanned }.
 * Each row: { unit, file, name, line, class, seam, finding }.
 */
export function analyze(files, units) {
  const scans = new Map();
  for (const [path, text] of files) if (CODE.test(path)) scans.set(path, scanFile(path, text));
  const allBarrels = new Set(units.flatMap((u) => [...u.barrels]));
  const rows = [];
  const star = [];
  for (const unit of units) {
    for (const [file, scan] of scans) {
      if (!file.startsWith(unit.prefix) || !file.endsWith('.ts') || file.endsWith('.d.ts') || TEST.test(file) || allBarrels.has(file)) continue;
      if (scan.star) star.push(file);
      for (const e of scan.exports) {
        const selfUses = scan.counts.get(e.name) ?? 0;
        let outside = false;
        let inside = false;
        let tests = false;
        for (const [other, os] of scans) {
          if (other === file || allBarrels.has(other) || !os.counts.has(e.name)) continue;
          if (TEST.test(other)) tests = true;
          else if (other.startsWith(unit.prefix)) inside = true;
          else outside = true;
        }
        const cls = outside ? 'public' : inside ? 'internal' : tests ? 'test-only' : selfUses > 0 ? 'self-only' : 'dead';
        const finding = cls === 'dead' || cls === 'self-only' || (cls === 'test-only' && !e.seam);
        rows.push({ unit: unit.id, file, name: e.name, line: e.line, class: cls, seam: e.seam, finding });
      }
    }
  }
  return { rows, star, scanned: scans.size };
}

function sourceEntries(value, out = []) {
  if (typeof value === 'string') return out;
  for (const [k, v] of Object.entries(value ?? {})) {
    if (k === 'source' && typeof v === 'string') out.push(v);
    else sourceEntries(v, out);
  }
  return out;
}

function discover(root) {
  const units = [];
  for (const group of ['packages', 'apps']) {
    for (const dir of readdirSync(join(root, group)).sort()) {
      const pkgPath = join(root, group, dir, 'package.json');
      if (!existsSync(pkgPath)) continue;
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      const barrels = new Set(sourceEntries(pkg.exports).map((p) => posix.normalize(`${group}/${dir}/${p}`)));
      units.push({ id: `${group}/${dir}`, prefix: `${group}/${dir}/src/`, barrels });
    }
  }
  return units;
}

function trackedFiles(root) {
  const ls = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (ls.status !== 0) throw new Error(`git ls-files failed: ${ls.stderr}`);
  const files = new Map();
  for (const path of ls.stdout.split('\0')) {
    if (!CODE.test(path) || path.startsWith('docs/') || path.startsWith('node_modules/')) continue;
    if (existsSync(join(root, path))) files.set(path, readFileSync(join(root, path), 'utf8'));
  }
  return files;
}

// ---- selftest -------------------------------------------------------------------------------------------------
// One fixture workspace: a barrel, a declaring file, an internal user, a test, an outside user. Expected classes are
// literals, never read from the tool.
const FIXTURE_UNITS = [{ id: 'pkg', prefix: 'pkg/src/', barrels: new Set(['pkg/src/index.ts']) }];
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
    'export { listedDead };',
    '// Test seam: first overload carries it.',
    'export function overloaded(a: string): void;',
    'export function overloaded(a: number): void;',
    'export function overloaded(a: unknown): void { void a; }',
    "export const globHolder = '**/*.ts'; export const afterGlob = 11; /* c */ export const afterGlobUse = afterGlob + 1;",
    "export const stringOnly = 'http://h/x'; export const quotedOnly = 12;",
    'export interface RedisShapedMeasurement { n: number }',
    '',
  ].join('\n')],
  ['pkg/src/b.ts', "import { internalThing, RedisShapedMeasurement } from './a.js';\nconst g = '**/*.ts'; /* later */\nexport const useInternal: RedisShapedMeasurement | typeof internalThing = internalThing;\nconst q = { n: 1 }; void (q as never)['quotedOnly'];\n"],
  ['pkg/src/a.test.ts', "import { testOnlyBare, testOnlySeam, testOnlySeamFn, listedLocal, listedSeamLocal, overloaded } from './a.js';\nvoid [testOnlyBare, testOnlySeam, testOnlySeamFn, listedLocal, listedSeamLocal, overloaded];\n"],
  ['app/x.ts', "import { publicThing } from '@pkg/core';\nvoid publicThing;\n"],
  ['app/x.test.ts', "import { testOnlyBare } from '@pkg/core';\nvoid testOnlyBare;\n"],
  ['pkg/src/index.ts', "export * from './a.js';\nexport { barrelOnlyThing } from './a.js';\n"],
]);
// name -> [class, finding]
const FIXTURE_EXPECTED = {
  deadThing: ['dead', true],
  selfOnlyThing: ['self-only', true],
  useSelf: ['dead', true],
  testOnlyBare: ['test-only', true],
  testOnlySeam: ['test-only', false],
  testOnlySeamFn: ['test-only', false],
  internalThing: ['internal', false],
  publicThing: ['public', false],
  commentOnlyThing: ['dead', true],
  barrelOnlyThing: ['dead', true],
  listedLocal: ['test-only', true],
  listedSeamLocal: ['test-only', false],
  listedDead: ['dead', true],
  overloaded: ['test-only', false],
  globHolder: ['dead', true],
  afterGlob: ['self-only', true],
  afterGlobUse: ['dead', true],
  stringOnly: ['dead', true],
  quotedOnly: ['internal', false],
  RedisShapedMeasurement: ['internal', false],
  useInternal: ['dead', true],
};

function selftestFixtures() {
  let failed = 0;
  const { rows } = analyze(FIXTURE_FILES, FIXTURE_UNITS);
  const byName = new Map(rows.map((r) => [r.name, r]));
  for (const [name, [cls, finding]] of Object.entries(FIXTURE_EXPECTED)) {
    const r = byName.get(name);
    const ok = r?.class === cls && r?.finding === finding;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: expected ${cls}${finding ? ' (finding)' : ''}, got ${r ? `${r.class}${r.finding ? ' (finding)' : ''}` : 'absent'}`);
  }
  const extra = rows.map((r) => r.name).filter((n) => !(n in FIXTURE_EXPECTED));
  if (extra.length) { failed += 1; console.log(`FAIL unexpected exports: ${extra.join(', ')}`); }
  const total = Object.keys(FIXTURE_EXPECTED).length + 1;
  console.log(`fixtures: ${total - failed} of ${total} hold`);
  return failed;
}

// Each mutant rewrites one predicate of this file; the fixtures must then fail (exit 1). `old` must occur exactly once
// in this file outside the MUTANTS block.
// MUTANTS-BEGIN
const MUTANTS = [
  { id: 'string-literal-names-not-counted', old: "(ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && IDENT.test(node.text)", new: 'false' },
  { id: 'identifier-uses-not-counted', old: 'if (!skip.has(node) && !listed) bump(node.text);', new: 'if (false) bump(node.text);' },
  { id: 'declaration-site-counted-as-use', old: 'if (!skip.has(node) && !listed) bump', new: 'if (!listed) bump' },
  { id: 'export-list-specifier-counted-as-use', old: 'if (!skip.has(node) && !listed) bump', new: 'if (!skip.has(node)) bump' },
  { id: 'barrel-tokens-count-as-uses', old: 'other === file || allBarrels.has(other) || !os.counts.has(e.name)', new: 'other === file || !os.counts.has(e.name)' },
  { id: 'tests-ignored', old: 'if (TEST.test(other)) tests = true;', new: 'if (TEST.test(other)) tests = false;' },
  { id: 'test-seam-comment-ignored', old: "const finding = cls === 'dead' || cls === 'self-only' || (cls === 'test-only' && !e.seam);", new: "const finding = cls === 'dead' || cls === 'self-only' || cls === 'test-only';" },
  { id: 'test-only-never-a-finding', old: " || (cls === 'test-only' && !e.seam);", new: ';' },
  { id: 'self-only-never-a-finding', old: "cls === 'dead' || cls === 'self-only' ||", new: "cls === 'dead' ||" },
  { id: 'self-only-merged-into-dead', old: "selfUses > 0 ? 'self-only' : 'dead'", new: "'dead'" },
  { id: 'outside-user-ignored', old: 'else outside = true;', new: 'else inside = true;' },
  { id: 'sibling-user-ignored', old: 'else if (other.startsWith(unit.prefix)) inside = true;', new: 'else if (other.startsWith(unit.prefix)) outside = false;' },
  { id: 'list-seam-looked-up-on-declaration-only', old: 'const seam = seamNear(text, s) || decls.some((d) => seamNear(text, d));', new: 'const seam = seamNear(text, s);' },
  { id: 'jsdoc-comment-ignored', old: 'getLeadingCommentRanges(text, statement.getFullStart()) ?? []).some((r) => SEAM', new: 'getLeadingCommentRanges(text, statement.getFullStart()) ?? []).filter((r) => r.kind === ts.SyntaxKind.SingleLineCommentTrivia).some((r) => SEAM' },
  { id: 'same-name-export-deduped-away', old: 'if (!seen.has(r.name)) seen.set(r.name, r);', new: 'seen.set(r.name, r);' },
];
// MUTANTS-END

function selftestMutants() {
  const full = readFileSync(SELF, 'utf8');
  const begin = full.indexOf('// MUTANTS-BEGIN');
  const end = full.indexOf('// MUTANTS-END');
  const outside = full.slice(0, begin) + full.slice(end);
  const dir = mkdtempSync(join(tmpdir(), 'unused-exports-mutant-'));
  let survived = 0;
  try {
    for (const m of MUTANTS) {
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
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(`mutants: ${MUTANTS.length - survived} of ${MUTANTS.length} killed`);
  return survived;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--fixtures-only')) return selftestFixtures() ? 1 : 0;
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
  for (const u of units) {
    const mine = rows.filter((r) => r.unit === u.id);
    console.log(`  ${u.id}: exports=${mine.length}; findings=${mine.filter((r) => r.finding).length}`);
  }
  for (const r of rows.filter((x) => x.finding)) console.log(`${r.file}:${r.line} ${r.name} [${r.class === 'test-only' ? 'test-only, no Test seam' : r.class}]`);
  const out = args.indexOf('--json');
  if (out >= 0) writeFileSync(args[out + 1], `${JSON.stringify({ scanned, workspaces: units.length, rows }, null, 1)}\n`);
  return rows.some((r) => r.finding) && !args.includes('--report') ? 1 : 0;
}

if (process.argv[1] === SELF) process.exit(main());
