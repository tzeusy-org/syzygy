// Old-versus-new differential of entryModulesIn (base c672492c vs head 9fd03a8e testkits, argv[2], argv[3]) over a corpus of
// target forms under several entry shapes, in a two-package fixture whose isFile holds every src file a target could join to.
import { posix } from 'node:path';
const [base, head] = [await import(process.argv[2]), await import(process.argv[3])];
const BS = String.fromCharCode(92);
const T = ['./dist/index.js', './dist/./index.js', './dist/x/../index.js', './dist/x/..', './dist/.', './dist/node_modules/index.js', './dist/NODE_MODULES/index.js',
  './dist/%2e/index.js', './dist/%2E%2e/index.js', './dist/%6eode_modules/index.js', `./dist/x${BS}..${BS}index.js`, `./dist${BS}.${BS}index.js`,
  './dist//index.js', './dist/', './/dist/index.js', '../index.js', './../index.js', './dist/.hidden/index.js', './dist/..x/index.js'];
const SHAPES = {
  string: (t) => t, import: (t) => ({ import: t, default: t }), require: (t) => ({ require: t, default: t }), source: (t) => ({ source: t.replace(/^\.\/dist\//, './src/').replace(/\.js$/, '.ts'), import: './dist/index.js', default: './dist/index.js' }),
  types: (t) => ({ types: t, import: './dist/index.js', default: './dist/index.js' }), browser: (t) => ({ browser: t, import: './dist/index.js', default: './dist/index.js' }),
  nested: (t) => ({ node: { import: t }, default: t }), array: (t) => [t, './dist/index.js'],
};
const srcOf = (t) => posix.join('packages/lib', t.replace(/^\.\/dist\//u, 'src/').replace(/\.js$/u, '.ts'));
const files = new Set(['apps/app/src/main.ts', 'packages/lib/src/index.ts', 'packages/lib/src/argv.ts', ...T.map(srcOf)]);
const ws = (dot, main = './dist/main.js') => ({ manifests: new Map([
  ['@syzygy/app', { name: '@syzygy/app', dir: 'apps/app', main }],
  ['@syzygy/lib', { name: '@syzygy/lib', dir: 'packages/lib', exports: { '.': dot, './argv': { types: './dist/argv.d.ts', import: './dist/argv.js' } } }]]), isFile: (p) => files.has(p) });
const run = (kit, w) => { try { const m = kit.entryModulesIn(w); return `ok ${m['@syzygy/lib']}|${m['@syzygy/app']}`; } catch (e) { return `throws ${e.message}`; } };
const rows = [];
for (const t of T) for (const [shape, f] of Object.entries(SHAPES)) rows.push({ target: t, shape, old: run(base, ws(f(t))), new: run(head, ws(f(t))) });
for (const t of ['./dist/main.js', './dist/x/../main.js', './dist/./main.js']) { files.add(srcOf(t).replace('packages/lib', 'apps/app')); rows.push({ target: t, shape: 'main', old: run(base, ws('./dist/index.js', t)), new: run(head, ws('./dist/index.js', t)) }); }
rows.push({ target: 'condition key a/../b', shape: 'key', old: run(base, ws({ 'a/../b': './dist/index.js' })), new: run(head, ws({ 'a/../b': './dist/index.js' })) });
const kind = (s) => s.startsWith('ok') ? 'accepts' : s.includes('segment') ? 'segment-refusal' : 'other-refusal';
const groups = {};
for (const r of rows) { const k = `${kind(r.old)} -> ${kind(r.new)}`; (groups[k] ??= []).push(`${r.shape}:${JSON.stringify(r.target)}`); }
console.log(JSON.stringify({ rows: rows.length, groups: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, { n: v.length, items: v }])) }, null, 1));
