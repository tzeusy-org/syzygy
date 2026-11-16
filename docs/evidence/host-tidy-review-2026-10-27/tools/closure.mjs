// R-GP-IMPL-HOST-TIDY-1 reviewer tool: the import closure of the Three-Surface POC at one clean checkout, by its own resolver.
// Usage: node closure.mjs <tree> <out.json>
// Every tracked file under apps/three-surface-poc/src is an entry. Specifiers come from TypeScript's preProcessFile (static,
// type-only, re-export and literal dynamic imports). Relative specifiers resolve to the tracked .ts/.tsx/.mts/.mjs/.json file;
// `@syzygy/<pkg>[/<sub>]` resolves through the tracked workspace manifest's `exports` (or `main`), mapping dist/*.js back to
// src/*.ts. Anything else is external and is not walked. The result names, for non-test and test entries separately, every
// workspace package reached and every chain that reaches a file under packages/cap1-daemon/.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

import { resolve as absolute } from 'node:path';
const [treeArg, out] = process.argv.slice(2);
const tree = absolute(treeArg);
const ts = createRequire(join(tree, 'package.json'))('typescript');
const tracked = new Set(execFileSync('git', ['-C', tree, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean));
const read = (p) => readFileSync(join(tree, p), 'utf8');

const manifests = new Map();
for (const p of tracked) {
  if (/^(packages|apps)\/[^/]+\/package\.json$/.test(p)) {
    const m = JSON.parse(read(p));
    manifests.set(m.name, { dir: dirname(p), m });
  }
}

function fileFor(candidate) {
  const c = normalize(candidate);
  const tries = [c, c.replace(/\.js$/, '.ts'), c.replace(/\.js$/, '.tsx'), c.replace(/\.mjs$/, '.mts'), `${c}.ts`, `${c}/index.ts`];
  return tries.find((t) => tracked.has(t));
}

function target(exp) {
  if (typeof exp === 'string') return exp;
  if (exp && typeof exp === 'object') return exp.import ?? exp.default ?? exp.types;
  return undefined;
}

function resolveSpec(from, spec) {
  if (spec.startsWith('.')) return { kind: 'file', file: fileFor(join(dirname(from), spec)) ?? null };
  const m = /^(@syzygy\/[^/]+)(?:\/(.+))?$/.exec(spec);
  if (!m) return { kind: 'external' };
  const pkg = manifests.get(m[1]);
  if (!pkg) return { kind: 'workspace-missing', pkg: m[1] };
  const key = m[2] === undefined ? '.' : `./${m[2]}`;
  const exps = pkg.m.exports;
  let t = exps === undefined ? (key === '.' ? pkg.m.main : undefined) : (typeof exps === 'string' && key === '.' ? exps : target(exps[key]));
  if (t === undefined) return { kind: 'unexported', pkg: m[1], key };
  t = t.replace(/^\.\//, '').replace(/^dist\//, 'src/').replace(/\.d\.ts$/, '.ts');
  return { kind: 'file', file: fileFor(join(pkg.dir, t)) ?? null, pkg: m[1] };
}

const POC = 'apps/three-surface-poc/src/';
const entries = [...tracked].filter((p) => p.startsWith(POC) && /\.(ts|tsx|mts|mjs)$/.test(p)).sort();
const isTest = (p) => /\.test\.ts$/.test(p);

function walk(starts) {
  const seen = new Map(); // file -> parent edge
  const queue = [];
  for (const s of starts) { seen.set(s, null); queue.push(s); }
  const pkgs = new Set();
  const unresolved = [];
  while (queue.length) {
    const f = queue.shift();
    const info = ts.preProcessFile(read(f), true, true);
    for (const imp of info.importedFiles) {
      const r = resolveSpec(f, imp.fileName);
      if (r.pkg) pkgs.add(r.pkg);
      if (r.kind === 'external') continue;
      if (r.kind !== 'file' || r.file === null) { unresolved.push({ from: f, spec: imp.fileName, kind: r.kind }); continue; }
      if (!seen.has(r.file)) { seen.set(r.file, { from: f, spec: imp.fileName }); queue.push(r.file); }
    }
  }
  const chain = (f) => { const c = []; let x = f; while (x !== undefined && seen.get(x) !== null) { c.unshift(`${seen.get(x).from} -[${seen.get(x).spec}]-> ${x}`); x = seen.get(x).from; } return c; };
  const daemonFiles = [...seen.keys()].filter((f) => f.startsWith('packages/cap1-daemon/')).sort();
  return {
    entries: starts.length,
    reached: seen.size,
    packagesNamed: [...pkgs].sort(),
    packageDirsReached: [...new Set([...seen.keys()].map((f) => f.split('/').slice(0, 2).join('/')))].sort(),
    cap1DaemonFilesReached: daemonFiles.length,
    firstChainToCap1Daemon: daemonFiles.length ? chain(daemonFiles[0]) : [],
    unresolved,
  };
}

// Every literal mention of cap1-daemon in POC files, import or not (vi.mock strings, paths in gates, comments).
const mentions = entries.concat([...tracked].filter((p) => p.startsWith('apps/three-surface-poc/') && !p.startsWith(POC)))
  .flatMap((p) => read(p).split('\n').map((line, i) => [p, i + 1, line]).filter(([, , line]) => line.includes('cap1-daemon')))
  .map(([p, n, line]) => `${p}:${n}: ${line.trim()}`);

const result = {
  tree, commit: execFileSync('git', ['-C', tree, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sources: walk(entries.filter((p) => !isTest(p))),
  tests: walk(entries.filter(isTest)),
  // The daemon entry alone: what `npm run poc` (node apps/three-surface-poc/dist/main.js) loads.
  daemon: walk(['apps/three-surface-poc/src/main.ts']),
  cap1DaemonMentions: mentions,
};
writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
for (const side of ['sources', 'tests', 'daemon']) {
  const r = result[side];
  console.log(`${side}: entries=${r.entries} reached=${r.reached} cap1DaemonFilesReached=${r.cap1DaemonFilesReached} unresolved=${r.unresolved.length} packagesNamed=${r.packagesNamed.join(',')}`);
  if (r.firstChainToCap1Daemon.length) console.log('  chain:', r.firstChainToCap1Daemon.join(' | '));
}
console.log(`mentions of cap1-daemon in apps/three-surface-poc: ${mentions.length}`);
for (const m of mentions) console.log('  ', m);
