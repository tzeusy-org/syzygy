// R-GP-IMPL-LAUNCH-FORM-CTIME-1: a proxy for a kernel without multigrain timestamps, on this host's multigrain kernel.
// Arm "unqueried": two files are planted back to back (write, chmod 0) with no stat between them, then both are lstat'ed. A change no
// one has queried is stamped from the coarse clock floor, so equal ctimeNs here is the tick a pre-multigrain kernel stamps every change with.
// Arm "queried": the same, but the first file is lstat'ed before the second is planted (the snapshot's order), then the first file is
// changed (chmod 0600) and lstat'ed again: an equal ctimeNs here would be a surviving R-chmod-cycle-rewrite.
// Usage: node coarse_proxy.mjs <empty-dir> <rounds> <out.json>
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const [dir, roundsText, outFile] = process.argv.slice(2);
const rounds = Number(roundsText);
if (fs.readdirSync(dir).length !== 0) throw new Error('dir must be empty');
const plant = (f) => { fs.writeFileSync(f, '{"format": "polaris-dossier-launched/1"}'); fs.chmodSync(f, 0o000); };
const ct = (f) => fs.lstatSync(f, { bigint: true }).ctimeNs;
let sameUnqueried = 0, sameQueried = 0;
const gapsNs = [], stepsNs = [];
for (let i = 0; i < rounds; i++) {
  const a = path.join(dir, `u-${i}-a`), b = path.join(dir, `u-${i}-b`);
  const t0 = process.hrtime.bigint(); plant(a); plant(b); const t1 = process.hrtime.bigint();
  const ca = ct(a), cb = ct(b);
  if (ca === cb) sameUnqueried++; else stepsNs.push(cb - ca);
  gapsNs.push(t1 - t0);
  const q = path.join(dir, `q-${i}`);
  plant(q); const before = ct(q); fs.chmodSync(q, 0o600); if (ct(q) === before) sameQueried++;
}
const med = (xs) => { const s = xs.slice().sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)); return s.length ? String(s[Math.floor(s.length / 2)]) : null; };
for (const n of fs.readdirSync(dir)) fs.chmodSync(path.join(dir, n), 0o600);
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
const out = { kernel: os.release(), dir, rounds,
  unqueried: { pairsWithEqualCtime: sameUnqueried, medianWallGapBetweenPlantsNs: med(gapsNs), medianNonZeroStepNs: med(stepsNs) },
  queried: { chmodAfterLstatLeftCtimeEqual: sameQueried } };
fs.writeFileSync(outFile, `${JSON.stringify(out, null, 1)}\n`);
console.log(JSON.stringify(out));
