// For every tracked non-test .ts/.mts/.mjs module under packages/, apps/, scripts/, list those outside the island
// whose transitive closure reaches an island module. node island-importers.mjs <tree>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const tree = path.resolve(process.argv[2]);
const require = createRequire(path.join(tree, 'package.json'));
const ts = require('typescript');
const boundary = fs.readFileSync(path.join(tree, 'packages/polaris-generation-core/src/island-boundary.test.ts'), 'utf8');
const ISLAND = new Set([...boundary.matchAll(/^ {2}'((?:apps|packages)\/[^']+\.ts)',$/gmu)].map(m => m[1]));
const pkgs = {};
for (const dir of ['packages', 'apps']) for (const d of fs.readdirSync(path.join(tree, dir))) {
  const p = path.join(tree, dir, d, 'package.json');
  if (fs.existsSync(p)) { const j = JSON.parse(fs.readFileSync(p, 'utf8')); pkgs[j.name] = { dir: `${dir}/${d}`, exports: j.exports }; }
}
const distToSrc = (p) => p.replace('/dist/', '/src/').replace(/\.js$/, '.ts');
function resolve(from, spec) {
  if (spec.startsWith('.')) {
    const t = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
    for (const c of [t.replace(/\.js$/, '.ts'), distToSrc(t), t, `${t}.ts`, `${t}/index.ts`]) if (fs.existsSync(path.join(tree, c)) && fs.statSync(path.join(tree, c)).isFile()) return c;
    return null;
  }
  const m = spec.match(/^(@syzygy\/[^/]+)(\/.*)?$/);
  if (!m) return null;
  const pk = pkgs[m[1]]; if (!pk) return null;
  const e = pk.exports?.[m[2] ? `.${m[2]}` : '.']; if (!e) return null;
  return path.posix.join(pk.dir, typeof e === 'string' ? e : e.source ?? e.default);
}
const cache = new Map();
function deps(f) {
  if (cache.has(f)) return cache.get(f);
  let out = [];
  try { out = ts.preProcessFile(fs.readFileSync(path.join(tree, f), 'utf8'), true, true).importedFiles.map(i => resolve(f, i.fileName)).filter(Boolean); } catch {}
  cache.set(f, out); return out;
}
function reachesIsland(f) {
  const seen = new Set(); const st = [f];
  while (st.length) { const x = st.pop(); if (seen.has(x)) continue; seen.add(x); if (x !== f && ISLAND.has(x)) return x; st.push(...deps(x)); }
  return null;
}
const files = execFileSync('git', ['-C', tree, 'ls-files', 'packages', 'apps', 'scripts'], { encoding: 'utf8' }).split('\n')
  .filter(f => /\.(m?ts|mjs)$/.test(f) && !/\.test\.|testkit|\.d\.ts$/.test(f) && !ISLAND.has(f));
const rows = [];
for (const f of files) { const hit = reachesIsland(f); if (hit) rows.push({ file: f, firstIslandReached: hit, direct: deps(f).filter(d => ISLAND.has(d) || /polaris-generation-(core|consent)\/src\/index\.ts$/.test(d)) }); }
console.log(JSON.stringify({ islandListed: ISLAND.size, population: files.length, reachingIsland: rows.length, rows }, null, 1));
