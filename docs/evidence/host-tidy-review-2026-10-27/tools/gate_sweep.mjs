// R-GP-IMPL-HOST-TIDY-1 reviewer tool: the POC observer-input gate's accept/refuse set, from each tree's own build, over the
// union of every path tracked at each named commit plus synthetic probes, singly and in pairs.
// Usage: node gate_sweep.mjs <out.json> <repo> <commit>,<commit>... <label>=<built tree> <label>=<built tree>...
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const [out, repo, commits, ...builds] = process.argv.slice(2);
const tracked = new Set();
for (const c of commits.split(',')) {
  for (const p of execFileSync('git', ['-C', repo, 'ls-tree', '-r', '-z', '--name-only', c], { encoding: 'utf8' }).split('\0')) if (p) tracked.add(p);
}
const dirs = [...new Set([...tracked].map((p) => p.split('/').slice(0, 2).join('/')).filter((d) => /^(apps|packages)\/[^/]+$/.test(d)))];
const probes = new Set();
for (const d of dirs) for (const p of [d, `${d}/`, `${d}/x.ts`, `${d}-other/x.ts`, `${d.toUpperCase()}/x.ts`, `./${d}/x.ts`, `${d}/dist/index.js`, `${d}/node_modules/x/index.js`]) probes.add(p);
for (const p of ['package.json', './package.json', 'package-lock.json', 'tsconfig.base.json', 'tsconfig.json', 'PACKAGE.JSON', 'apps/package.json', '', ' ', 'packages/', 'apps/', '/packages/cap1-daemon/x.ts', 'packages//cap1-daemon/x.ts', 'packages/cap1-daemon\\x.ts']) probes.add(p);
const population = [...new Set([...tracked, ...probes])].sort();
const results = {};
for (const b of builds) {
  const [label, tree] = b.split('=');
  const file = join(resolve(tree), 'apps/three-surface-poc/dist/git-observation.js');
  const { pocObserverInputsAreClean } = await import(`${pathToFileURL(file).href}?${label}`);
  const single = Object.fromEntries(population.map((p) => [p, pocObserverInputsAreClean({ changedPaths: [p] })]));
  const pairs = {
    empty: pocObserverInputsAreClean({ changedPaths: [] }),
    cleanClean: pocObserverInputsAreClean({ changedPaths: ['README.md', 'docs/x.md'] }),
    cleanDirty: pocObserverInputsAreClean({ changedPaths: ['README.md', 'packages/cap1-daemon/src/server.ts'] }),
    dirtyClean: pocObserverInputsAreClean({ changedPaths: ['packages/cap1-daemon/src/server.ts', 'README.md'] }),
  };
  results[label] = {
    distSha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
    refused: population.filter((p) => !single[p]),
    pairs,
    single,
  };
}
const labels = Object.keys(results);
const differing = population.filter((p) => new Set(labels.map((l) => results[l].single[p])).size > 1);
const record = {
  commits: commits.split(','), population: population.length, tracked: tracked.size, probes: probes.size,
  builds: Object.fromEntries(labels.map((l) => [l, { distSha256: results[l].distSha256, refused: results[l].refused.length, pairs: results[l].pairs }])),
  refusedEqual: labels.every((l) => JSON.stringify(results[l].refused) === JSON.stringify(results[labels[0]].refused)),
  differing,
  refusedByPrefix: Object.fromEntries(['apps/three-surface-poc/', 'packages/three-surface-poc-core/', 'packages/cap1-daemon/', 'packages/http-host/', 'packages/cap1-core/', '(exact)', '(other)']
    .map((k) => [k, results[labels[0]].refused.filter((p) => k === '(exact)' ? !p.includes('/') : k === '(other)' ? p.includes('/') && !['apps/three-surface-poc/', 'packages/three-surface-poc-core/', 'packages/cap1-daemon/', 'packages/http-host/', 'packages/cap1-core/'].some((x) => p.startsWith(x)) : p.startsWith(k)).length])),
  refusedOther: results[labels[0]].refused.filter((p) => p.includes('/') && !['apps/three-surface-poc/', 'packages/three-surface-poc-core/', 'packages/cap1-daemon/', 'packages/http-host/', 'packages/cap1-core/'].some((x) => p.startsWith(x))),
  refusedExact: results[labels[0]].refused.filter((p) => !p.includes('/')),
};
writeFileSync(out, `${JSON.stringify(record, null, 1)}\n`);
console.log(JSON.stringify({ ...record, refusedOther: record.refusedOther.length }, null, 1));
