// rev-541c: what each reading of the `npm:` clause predicts for every recorded npm case, against what npm did.
// Readings:
//  - r2-literal: round 2's six lines (testkit:64-69 at 00b7dcf7) read as written: a declaration under a workspace's name links
//    when the root's manifest declares the same alias (name and spec), or when its range is `*`, absent or satisfied;
//  - r2-per-declaration: the same lines read as if "the root's manifest declares it" meant "the declaration is the root's";
//  - r3: the replacement this review proposes (f1-r3-replacement.txt): each root declaration under a workspace's name is skipped
//    and the workspace linked; every other declaration links only when under a workspace's name with `*`, absent or a satisfied range.
// A case's prediction is registry when any of its declarations predicts registry, else link. npa and semver are npm's own copies.
// Usage: node clause_predict_r3.cjs <npm dir> <lane.json> <r2 main.json> <r2 root.json> <r2 fix.json> <r3.json>
const path = require('node:path');
const fs = require('node:fs');
const [npmDir, lane, r2a, r2b, r2c, r3] = process.argv.slice(2);
const npa = require(path.join(npmDir, 'node_modules', 'npm-package-arg'));
const semver = require(path.join(npmDir, 'node_modules', 'semver'));
const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const cases = [];
const laneD = load(lane);
for (const r of laneD.results) {
  const [[name, spec]] = Object.entries(r.declared);
  cases.push({ source: 'lane', id: r.shows, ws: { wlib: '1.0.0', '@syzygy/slib': '1.0.0' }, decls: [[r.declaredIn, name, spec]], r });
}
for (const f of [r2a, r2b, r2c]) {
  const d = load(f);
  const ws = Object.fromEntries(Object.values(d.workspaces));
  for (const r of d.results) {
    if (!r.declared || !Object.keys(r.declared).length) continue;
    const [[name, spec]] = Object.entries(r.declared);
    const where = r.declaredIn.startsWith('root') ? 'root' : r.declaredIn;
    cases.push({ source: 'r2', id: r.id, ws, decls: [[where, name, spec]], r });
  }
}
const r3D = load(r3);
for (const r of r3D.results) {
  const decls = [];
  for (const [dir, fields] of Object.entries(r.declarations)) {
    for (const deps of Object.values(fields)) for (const [name, spec] of Object.entries(deps)) decls.push([dir === '' ? 'root' : dir, name, spec]);
  }
  cases.push({ source: 'r3', id: r.id, ws: Object.fromEntries(Object.values(r3D.workspaces)), decls, r });
}
function rangeLinks(spec, version) {
  let p;
  try { p = npa.resolve('x', spec); } catch { return false; }
  const sub = p.type === 'alias' ? p.subSpec : p;
  if (sub.type === 'range' && sub.fetchSpec === '*') return true;
  if (sub.type === 'range' || sub.type === 'version') return semver.satisfies(version, sub.fetchSpec, true);
  return false;
}
function predict(c, reading) {
  const rootDecls = c.decls.filter(([w]) => w === 'root');
  const each = c.decls.map(([where, name, spec]) => {
    const version = c.ws[name];
    if (version === undefined) return 'registry';
    if (where === 'root') return 'link';
    if (reading === 'r2-literal' && rootDecls.some(([, n, s]) => n === name && s === spec)) return 'link';
    return rangeLinks(spec, version) ? 'link' : 'registry';
  });
  return each.includes('registry') ? 'registry' : 'link';
}
const observed = (r) => r.lockExit === 0 ? 'link' : (r.errorCode === 'ENOTCACHED' ? 'registry' : `other:${r.errorCode}`);
const rows = cases.map((c) => ({ source: c.source, id: c.id, decls: c.decls, observed: observed(c.r),
  'r2-literal': predict(c, 'r2-literal'), 'r2-per-declaration': predict(c, 'r2-per-declaration'), r3: predict(c, 'r3') }));
const tally = Object.fromEntries(['r2-literal', 'r2-per-declaration', 'r3'].map((k) => [k, {
  agree: rows.filter((x) => x[k] === x.observed).length, disagree: rows.filter((x) => x[k] !== x.observed).map((x) => `${x.source} ${x.id}`) }]));
console.log(JSON.stringify({ cases: rows.length, bySource: Object.fromEntries(['lane', 'r2', 'r3'].map((s) => [s, rows.filter((x) => x.source === s).length])),
  tally, rows }, null, 1));
