// Round-2 reviewer tool: base (argv[2]) versus code-commit (argv[3]) entryModulesIn for an entry whose only conditions Node does
// not read by default, with a segment-faulted target.
const [base, head] = [await import(process.argv[2]), await import(process.argv[3])];
const files = new Set(['apps/app/src/main.ts', 'packages/lib/src/index.ts']);
const ws = (dot) => ({ manifests: new Map([
  ['@syzygy/app', { name: '@syzygy/app', dir: 'apps/app', main: './dist/main.js' }],
  ['@syzygy/lib', { name: '@syzygy/lib', dir: 'packages/lib', exports: { '.': dot } }]]), isFile: (p) => files.has(p) });
const run = (kit, w) => { try { return `ok ${kit.entryModulesIn(w)['@syzygy/lib']}`; } catch (e) { return `throws ${e.message}`; } };
for (const entry of [{ browser: './dist/./index.js' }, { browser: './dist/./index.js', types: './dist/index.d.ts' }, { worker: './dist/node_modules/index.js' }]) {
  process.stdout.write(`${JSON.stringify(entry)}\n  base: ${run(base, ws(entry))}\n  head: ${run(head, ws(entry))}\n`);
}
