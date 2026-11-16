// Round-2 reviewer tool: base (argv[2]) versus code-commit (argv[3]) entryModulesIn over condition-key and non-target-leaf shapes
// the retained differential does not write. Prints one line per row and a summary of base -> head kinds.
const [base, head] = [await import(process.argv[2]), await import(process.argv[3])];
const T = './dist/index.js';
const BS = String.fromCharCode(92);
const ENTRIES = {
  'key a/../b': { 'a/../b': T },
  'key /../': { '/../': T },
  'key ..': { '..': T, default: T },
  'key a/.. then /b': { 'a/..': { '/b': T }, default: T },
  'nested key': { node: { 'x/../import': T }, default: T },
  'key in array object': [{ 'a/../b': T }, T],
  'key after default': { default: T, 'a/../b': T },
  'key with backslashes': { [`a${BS}..${BS}b`]: T, default: T },
  'key a/..b': { 'a/..b': T, default: T },
  'key ./../x': { default: T, './../x': T },
  'leaf under unknown condition': { import: T, foo: 'x/../y', default: T },
  'leaf null': { import: T, foo: null, default: T },
  'leaf number': { import: T, foo: 1, default: T },
  'array leaf': ['x/../y', T],
  'deep key': { node: { import: { 'p/../q': T } }, default: T },
  'plain': { import: T, default: T },
};
const files = new Set(['apps/app/src/main.ts', 'packages/lib/src/index.ts']);
const ws = (dot) => ({ manifests: new Map([
  ['@syzygy/app', { name: '@syzygy/app', dir: 'apps/app', main: './dist/main.js' }],
  ['@syzygy/lib', { name: '@syzygy/lib', dir: 'packages/lib', exports: { '.': dot } }]]), isFile: (p) => files.has(p) });
const run = (kit, w) => { try { const m = kit.entryModulesIn(w); return `ok ${m['@syzygy/lib']}`; } catch (e) { return `throws ${e.message}`; } };
const kind = (s) => (s.startsWith('ok') ? 'accepts' : 'refuses');
const summary = {};
for (const [name, entry] of Object.entries(ENTRIES)) {
  const [o, n] = [run(base, ws(entry)), run(head, ws(entry))];
  const k = `${kind(o)} -> ${kind(n)}`;
  summary[k] = (summary[k] ?? 0) + 1;
  process.stdout.write(`${name}\t${k}\n  base: ${o}\n  head: ${n}\n`);
}
process.stdout.write(`rows ${Object.keys(ENTRIES).length} ${JSON.stringify(summary)}\n`);
