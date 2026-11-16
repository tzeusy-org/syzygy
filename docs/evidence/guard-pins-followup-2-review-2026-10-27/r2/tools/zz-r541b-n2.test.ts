// rev-541b scratch test (copied into packages/polaris-generation-core/src/, run once, deleted): the resolver's answer for an
// unscoped workspace's bare name (round-1 N2's residual sentence), and for an alias under an @syzygy/ workspace's name.
import { it } from 'vitest';
import { resolveIn, type Manifest, type Workspace } from './workspace-reach.testkit.js';

const files = new Set(['packages/plainlib/src/index.ts', 'packages/plainlib/src/x.ts', 'packages/slib/src/index.ts', 'apps/app/src/main.ts']);
function ws(app: Partial<Manifest> = {}, root: Partial<Manifest> = {}): Workspace {
  const manifests = new Map<string, Manifest>([
    ['root', { name: 'root', dir: '.', ...root }],
    ['plainlib', { name: 'plainlib', dir: 'packages/plainlib', exports: { '.': './dist/index.js', './x': './dist/x.js' } }],
    ['@syzygy/slib', { name: '@syzygy/slib', dir: 'packages/slib', exports: { '.': './dist/index.js' } }],
    ['@syzygy/app', { name: '@syzygy/app', dir: 'apps/app', ...app }],
  ]);
  return { manifests, isFile: (p) => files.has(p) };
}
const cases: [string, Workspace, string][] = [
  ['U1 unscoped workspace, nothing declared', ws(), 'plainlib'],
  ['U2 unscoped workspace, app declares it file:', ws({ dependencies: { plainlib: 'file:../../packages/plainlib' } }), 'plainlib'],
  ['U3 unscoped workspace, root declares it npm:', ws({}, { dependencies: { plainlib: 'npm:typescript@^5.5.0' } }), 'plainlib'],
  ['U4 unscoped workspace, app declares a registry version', ws({ dependencies: { plainlib: '1.0.0' } }), 'plainlib'],
  ['U5 unscoped workspace subpath, nothing declared', ws(), 'plainlib/x'],
  ['U6 @syzygy workspace name declared as an alias npm does not link', ws({ dependencies: { '@syzygy/slib': 'npm:typescript@^5.5.0' } }), '@syzygy/slib'],
  ['U7 @syzygy workspace, nothing declared (control)', ws(), '@syzygy/slib'],
];
it('rev-541b answers', () => {
  for (const [label, w, spec] of cases) console.log('R541B-ANSWER', JSON.stringify([label, spec, resolveIn(w, 'apps/app/src/main.ts', spec) ?? String(resolveIn(w, 'apps/app/src/main.ts', spec))]));
});
