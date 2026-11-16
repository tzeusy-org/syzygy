// Reviewer's own resolvePathIntent census (R-GP-IMPL-DOSSIER-CLI-TABLE-1): the base daemon copy (lifted from base main.ts by AST),
// the base state-directory copy (base dist) and the head shared copy (head dist, or a mutated lift), over a path corpus built here.
// Usage: node census.mjs <base-tree> <head-tree> <fixture-dir> <out.json> [mutant-js-module]
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

const [baseTree, headTree, fx, outFile, mutant] = process.argv.slice(2).map((p) => path.resolve(p));
const ts = createRequire(path.join(baseTree, 'package.json'))('typescript');

// Lift the daemon's own copy and its helper out of base main.ts.
const mainFile = path.join(baseTree, 'apps/syzygy/src/main.ts');
const source = ts.createSourceFile(mainFile, fs.readFileSync(mainFile, 'utf8'), ts.ScriptTarget.Latest, true);
const pick = (name) => {
  const found = source.statements.filter((s) => ts.isFunctionDeclaration(s) && s.name?.text === name);
  if (found.length !== 1) throw new Error(`${name}: ${found.length}`);
  return found[0].getText(source);
};
const liftDir = path.join(path.dirname(outFile), 'census-lift');
fs.mkdirSync(liftDir, { recursive: true });
const daemonJs = ts.transpileModule(`import * as fs from 'node:fs';\nimport * as path from 'node:path';\n${pick('filesystemFailureCode')}\n${pick('resolvePathIntent')}\nexport { resolvePathIntent };\n`,
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
fs.writeFileSync(path.join(liftDir, 'daemon-copy.mjs'), daemonJs);
const daemonCopy = (await import(path.join(liftDir, 'daemon-copy.mjs'))).resolvePathIntent;
const baseState = (await import(path.join(baseTree, 'packages/polaris-dossier/dist/state-directory.js'))).resolvePathIntent;
const shared = (await import(mutant ?? path.join(headTree, 'packages/polaris-dossier/dist/state-directory.js'))).resolvePathIntent;

// The fixture.
fs.rmSync(fx, { recursive: true, force: true });
const at = (...p) => path.join(fx, ...p);
for (const d of ['root/.syzygy/gov', 'root/openspec', 'real/dir/sub', 'locked/in', 'elsewhere', 'deep/a/b/c']) fs.mkdirSync(at(d), { recursive: true });
fs.writeFileSync(at('real/file.txt'), 'x');
const links = [
  ['abs-dir', at('real/dir')], ['rel-dir', 'real/dir'], ['rel-up', '../' + path.basename(fx) + '/real/dir'], ['dangling-abs', at('nowhere/x')],
  ['dangling-rel', 'nowhere/y'], ['chain-1', 'chain-2'], ['chain-2', 'chain-3'], ['chain-3', at('real/dir')], ['loop-a', 'loop-b'], ['loop-b', 'loop-a'],
  ['self', 'self'], ['to-root', '/'], ['to-file', 'real/file.txt'], ['trailing', 'real/dir/'], ['dotdot', 'real/dir/../dir/sub'], ['slashes', 'real//dir///sub'],
  ['into-gov', at('root/.syzygy/gov/x')], ['into-gov-rel', 'root/openspec/y'], ['to-locked', 'locked/in'], ['real/dir/up', '..'], ['real/dir/dot', '.'],
  ['real/dir/back', '../../real/dir'], ['deep/a/b/c/out', '../../../../real'], ['through-loop', 'loop-a/x'], ['to-dangling-chain', 'dangling-rel/z'],
  ['root/.syzygy/link-out', at('elsewhere')], ['gov-link', at('root/.syzygy')], ['link-to-link-dir', 'abs-dir/sub'],
];
for (const [name, target] of links) fs.symlinkSync(target, at(name));
fs.chmodSync(at('locked'), 0o000);

const bases = ['abs-dir', 'rel-dir', 'rel-up', 'dangling-abs', 'dangling-rel', 'chain-1', 'loop-a', 'self', 'to-root', 'to-file', 'trailing', 'dotdot', 'slashes',
  'into-gov', 'into-gov-rel', 'to-locked', 'real/dir/up', 'real/dir/dot', 'real/dir/back', 'deep/a/b/c/out', 'through-loop', 'to-dangling-chain',
  'root/.syzygy/link-out', 'gov-link', 'link-to-link-dir', 'real/dir', 'real/file.txt', 'locked', 'locked/in', 'root', 'root/.syzygy', 'missing', '.'];
const suffixes = ['', '/', '/x', '/x/', '/..', '/../x', '/.', '//x', '/x/../y', '/sub', '/sub/z'];
const inputs = new Set(['/', '//', '///', '/.', '/..', '/tmp/..', fx, fx + '/', fx + '//']);
for (const b of bases) for (const s of suffixes) inputs.add(at(b) + s);
inputs.add(at('x'.repeat(255))); inputs.add(at('x'.repeat(256))); inputs.add(at('real', 'y'.repeat(300), 'z'));
inputs.add('real/dir'); inputs.add('./rel-dir'); inputs.add('');

const answer = (fn, input) => { try { return fn(input); } catch (cause) { return { threw: String(cause) }; } };
const norm = (a) => (a.threw ? a : a.resolved ? { resolved: true, realPath: a.realPath ?? a.intendedRealPath } : { resolved: false, reason: a.reason, detail: a.detail });
const cwd = process.cwd();
process.chdir(fx);
const rows = [];
for (const input of inputs) {
  const d = answer(daemonCopy, input), s = answer(baseState, input), h = answer(shared, input);
  rows.push({ input, daemon: d, baseState: s, shared: h });
}
process.chdir(cwd);
fs.chmodSync(at('locked'), 0o700);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const tally = (k) => rows.reduce((t, r) => { const key = r.daemon.threw ? 'threw' : r.daemon.resolved ? 'resolved' : r.daemon.reason; t[key] = (t[key] ?? 0) + 1; return t; }, {});
const summary = {
  inputs: rows.length, daemonAnswers: tally(),
  daemonVsBaseState: rows.filter((r) => !eq(norm(r.daemon), { ...norm(r.baseState), ...(r.daemon.resolved === false ? { reason: r.daemon.reason } : {}) })).length,
  daemonVsShared: rows.filter((r) => !eq(norm(r.daemon), norm(r.shared))).length,
  baseStateVsSharedOnStateFields: rows.filter((r) => !eq(norm(r.baseState).resolved, norm(r.shared).resolved) || (norm(r.shared).resolved ? norm(r.baseState).realPath !== norm(r.shared).realPath : norm(r.baseState).detail !== norm(r.shared).detail)).length,
  sharedKeys: [...new Set(rows.map((r) => Object.keys(r.shared).sort().join(',')))],
};
fs.writeFileSync(outFile, JSON.stringify({ summary, rows }, null, 1));
console.log(JSON.stringify(summary));
