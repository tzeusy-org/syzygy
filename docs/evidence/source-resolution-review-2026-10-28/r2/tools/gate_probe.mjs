// Ask each tree's built pocObserverInputsAreClean about a list of dirty paths; print a table row per path and tree.
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
const trees = process.argv.slice(2);
const paths = ['scripts/clean_build.mjs', './scripts/clean_build.mjs', 'scripts/clean_build.mjs.bak', 'scripts/Clean_build.mjs', 'scripts/other.mjs',
  'package.json', 'package-lock.json', 'tsconfig.base.json', 'tsconfig.json', 'vitest.config.ts', 'packages/support/tsconfig.json',
  'packages/polaris-generation-core/tsconfig.json', 'packages/polaris-dossier/src/cli.ts', 'apps/syzygy/src/main.ts', 'README.md', 'apps/three-surface-poc/tsconfig.json'];
const gates = {};
for (const t of trees) gates[t] = (await import(pathToFileURL(join(resolve(t), 'apps/three-surface-poc/dist/git-observation.js')).href)).pocObserverInputsAreClean;
console.log(['path', ...trees].join('\t'));
for (const p of paths) console.log([p, ...trees.map((t) => (gates[t]({ changedPaths: [p] }) ? 'ADMITTED' : 'REFUSED'))].join('\t'));
console.log(['(none)', ...trees.map((t) => (gates[t]({ changedPaths: [] }) ? 'ADMITTED' : 'REFUSED'))].join('\t'));
