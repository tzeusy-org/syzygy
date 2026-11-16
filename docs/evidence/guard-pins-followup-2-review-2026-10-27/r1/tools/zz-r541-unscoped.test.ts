// rev-541 scratch: what the resolver answers for the bare name of a workspace whose name is not @syzygy-scoped.
import { expect, it } from 'vitest';
import { resolveIn, type Manifest } from './workspace-reach.testkit.js';

it('reads an unscoped workspace name', () => {
  const manifests: Manifest[] = [
    { name: '@syzygy/app', dir: 'apps/app', main: './dist/main.js' },
    { name: 'plainlib', dir: 'packages/plainlib', exports: { '.': './dist/index.js' } },
  ];
  const files = new Set(['apps/app/src/main.ts', 'packages/plainlib/src/index.ts']);
  const answer = resolveIn({ manifests: new Map(manifests.map((m) => [m.name, m])), isFile: (p) => files.has(p) }, 'apps/app/src/main.ts', 'plainlib');
  console.log('R541-ANSWER', JSON.stringify(answer));
  expect(answer).toBeNull();
});
