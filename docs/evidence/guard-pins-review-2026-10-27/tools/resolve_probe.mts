// rev-531: resolveIn answers for version forms and edge specifiers, over a two-package workspace like workspace-reach.test.ts's.
// Usage: node tools/resolve_probe.mts <path to workspace-reach.testkit.ts>
const kit = await import(process.argv[2]!);
const files = new Set(['apps/app/src/main.ts', 'packages/lib/src/index.ts']);
const ws = (deps: Record<string, string>) => ({
  manifests: new Map<string, unknown>([
    ['@syzygy/app', { name: '@syzygy/app', dir: 'apps/app', dependencies: deps }],
    ['@syzygy/lib', { name: '@syzygy/lib', dir: 'packages/lib', exports: { '.': './dist/index.js' } }],
  ]), isFile: (p: string) => files.has(p) });
const versions = ['file:../../packages/lib', '../../packages/lib', './lib', '.', '..', '/srv/lib', '~/lib', 'lib-0.0.0.tgz',
  'https://example.com/lib-1.0.0.tgz', 'http://example.com/lib.tar.gz', 'git+https://example.com/lib.git', 'github:someone/lib',
  '.hidden-lib', 'C:/lib', 'a/b/c', 'npm:typescript@^5.5.0', '~1.2.3', '2.9.0'];
const rows: unknown[] = versions.map((version) => ({ version, answer: String(kit.resolveIn(ws({ dossier: version }), 'apps/app/src/main.ts', 'dossier')) }));
for (const specifier of ['', '@scope', 'dossier/argv']) {
  let answer: string;
  try { answer = String(kit.resolveIn(ws({}), 'apps/app/src/main.ts', specifier)); } catch (error) { answer = `throws ${(error as Error).constructor.name}: ${(error as Error).message}`; }
  rows.push({ specifier, answer });
}
console.log(JSON.stringify(rows, null, 1));
