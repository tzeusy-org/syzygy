// Independent reachability: node reach.mjs <tree> <entry> [--edges]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const tree = path.resolve(process.argv[2]);
const require = createRequire(path.join(tree, 'package.json'));
const ts = require('typescript');
const pkgs = {};
for (const dir of ['packages', 'apps']) for (const d of fs.readdirSync(path.join(tree, dir))) {
  const p = path.join(tree, dir, d, 'package.json');
  if (fs.existsSync(p)) { const j = JSON.parse(fs.readFileSync(p, 'utf8')); pkgs[j.name] = { dir: `${dir}/${d}`, exports: j.exports }; }
}
function resolve(from, spec) {
  if (spec.startsWith('.')) {
    let t = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
    for (const c of [t.replace(/\.js$/, '.ts'), t.replace(/\.mjs$/, '.mts'), t, `${t}.ts`, `${t}/index.ts`]) if (fs.existsSync(path.join(tree, c)) && fs.statSync(path.join(tree, c)).isFile()) return c;
    return { unresolved: spec };
  }
  const m = spec.match(/^(@syzygy\/[^/]+)(\/.*)?$/);
  if (!m) return null; // external
  const pk = pkgs[m[1]];
  if (!pk) return { unresolved: spec };
  const sub = m[2] ? `.${m[2]}` : '.';
  const e = pk.exports?.[sub];
  if (!e) return { unresolved: spec };
  const src = typeof e === 'string' ? e : e.source ?? e.import ?? e.default;
  return path.posix.join(pk.dir, src);
}
const entries = process.argv.slice(3).filter(a => !a.startsWith('--'));
const seen = new Set(); const edges = []; const unresolved = [];
const stack = [...entries];
while (stack.length) {
  const f = stack.pop(); if (seen.has(f)) continue; seen.add(f);
  const text = fs.readFileSync(path.join(tree, f), 'utf8');
  const imps = ts.preProcessFile(text, true, true).importedFiles.map(i => i.fileName);
  // also catch computed or createRequire forms by regex, report separately
  for (const s of imps) {
    const r = resolve(f, s);
    if (r === null) continue;
    if (typeof r === 'object') { unresolved.push(`${f} -> ${s}`); continue; }
    edges.push([f, r]); stack.push(r);
  }
}
const out = { reachable: [...seen].sort(), unresolved };
if (process.argv.includes('--edges')) out.edges = edges;
console.log(JSON.stringify(out, null, 1));
