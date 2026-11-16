// Reviewer's independent gate differential for PR #556, round 2 (R-GP-IMPL-OBSERVER-GATE-2); round 1's tool with the round-2
// lane probe (docs/<dir>/a.ts) and more mid-path, backslash and trailing forms added.
// Usage: node gate_diff_rev.mjs <checkout> <base> <head> <population commit> <out dir>
// Unlike the lane's tool, it transpiles the WHOLE git-observation.ts at each commit (the @syzygy/support import replaced by a
// stub), writes it as a module and imports the real export, so a slicing error cannot hide a second definition or helper.
// Population: every path in `git ls-tree -r -z` at the population commit, the lane's 61 probes for every directory under
// apps/ and packages/ that holds a package.json there, and extra probes of the reviewer's own (dist outputs, a bare directory
// name with no slash, case variants, ./-prefixed and absolute forms, a nested package.json, root-file near-misses).
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [checkout, base, head, popCommit, outDir] = process.argv.slice(2);
const ts = createRequire(join(checkout, 'package.json'))('typescript');
const git = (args) => execFileSync('git', ['-C', checkout, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
mkdirSync(outDir, { recursive: true });

async function gate(commit) {
  const text = git(['show', `${commit}:apps/three-surface-poc/src/git-observation.ts`]);
  const stubbed = text.replace("import { sha256 } from '@syzygy/support';", 'const sha256 = (x) => { throw new Error("stub"); };');
  if (stubbed === text) throw new Error(`${commit}: support import not found`);
  const js = ts.transpileModule(stubbed, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const file = join(outDir, `gate-${commit.slice(0, 12)}.mjs`);
  writeFileSync(file, js);
  return (await import(pathToFileURL(file).href)).pocObserverInputsAreClean;
}

const tracked = git(['ls-tree', '-r', '-z', '--name-only', popCommit]).split('\0').filter(Boolean);
const workspaces = [...new Set(tracked.filter((p) => /^(?:apps|packages)\/[^/]+\/package\.json$/u.test(p)).map((p) => p.slice(0, -13)))].sort();
const laneProbes = [...workspaces.flatMap((d) => [`${d}/package.json`, `${d}/tsconfig.json`, `${d}/src/__untracked__.ts`, `${d}x/a.ts`, `docs/${d}/a.ts`]), 'scripts/clean_build.mjs.bak'];
const extra = [
  ...workspaces.flatMap((d) => [`${d}/dist/index.js`, `${d}/dist/.tsbuildinfo`, d, `./${d}/src/a.ts`, `${d.toUpperCase()}/src/a.ts`, `${d}/escape.json`, `${d}/node_modules/x/index.js`]),
  'apps/package.json', 'packages/tsconfig.json', 'docs/package.json', 'scripts/clean_build.js', 'Package.json', 'tsconfig.json',
  'tsconfig.base.json.orig', 'package-lock.json~', 'scripts/clean_build.mjs/', 'node_modules/@syzygy/support/index.js',
  ...workspaces.flatMap((d) => [`x/${d}/a.ts`, d.replace('/', '\\') + '\\src\\a.ts', `${d}/`, `${d}//a.ts`, `node_modules/${d}/a.ts`]),
  'docs/package.json', 'apps/three-surface-poc/package.json/x', 'scripts/scripts/clean_build.mjs',
];
const population = [...new Set([...tracked, ...laneProbes, ...extra])].sort();
const b = await gate(base), h = await gate(head);
const refusedB = population.filter((p) => !b({ changedPaths: [p] }));
const refusedH = population.filter((p) => !h({ changedPaths: [p] }));
const setB = new Set(refusedB), setH = new Set(refusedH);
const newlyRefused = refusedH.filter((p) => !setB.has(p));
const newlyAccepted = refusedB.filter((p) => !setH.has(p));
const outside = newlyRefused.filter((p) => !p.startsWith('packages/polaris-generation-core/') && !p.startsWith('packages/polaris-generation-consent/'));
// Multi-path observations: a refused path beside accepted ones must still refuse.
const mixedB = !b({ changedPaths: ['docs/x.md', 'packages/support/src/a.ts'] }), mixedH = !h({ changedPaths: ['docs/x.md', 'packages/polaris-generation-core/src/a.ts', 'README.md'] });
const empty = [b({ changedPaths: [] }), h({ changedPaths: [] })];
const trackedSet = new Set(tracked);
console.log(JSON.stringify({
  base, head, popCommit,
  population: { total: population.length, tracked: tracked.length, laneProbes: laneProbes.length, extraProbes: extra.length, workspaces: workspaces.length },
  refused: { base: refusedB.length, head: refusedH.length },
  newlyRefused: { count: newlyRefused.length, tracked: newlyRefused.filter((p) => trackedSet.has(p)).length,
    core: newlyRefused.filter((p) => p.startsWith('packages/polaris-generation-core/')).length,
    consent: newlyRefused.filter((p) => p.startsWith('packages/polaris-generation-consent/')).length,
    probesAmongThem: newlyRefused.filter((p) => !trackedSet.has(p)) },
  newlyRefusedOutsideTwoPrefixes: outside,
  newlyAccepted,
  mixedObservationRefused: { base: mixedB, head: mixedH },
  emptyObservationClean: empty,
}, null, 1));
