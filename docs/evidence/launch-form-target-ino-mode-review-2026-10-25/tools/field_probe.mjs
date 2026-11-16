// rev-526 (review of syzygy-bpyt.8.35): which snapshot field witnesses which change to a symbolic link's target? For the one plant whose
// target fields are not null (a symbolic link to the marker Syzygy writes), each round plants afresh, takes the fix's snapshot (the helper
// copied from launched.test.ts at 74dc0eb9 without its type annotations), asks the unmutated reader for one form, applies one write arm to
// the target (none for a faithful ask), and takes the snapshot again. Per arm it counts the rounds in which each field differed, and the
// rounds in which a field was the only one that differed (its sole witness), and the rounds in which nothing differed (a survivor).
// Usage: node field_probe.mjs <build dir> <private dir> <rounds per arm> <arm>[,<arm>...]
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';

const [buildDir, root, roundsArg, armsArg] = process.argv.slice(2);
const rounds = Number(roundsArg);
const { launchFormRefusal, launchedMarkerState, writeLaunchedMarker } = createRequire(import.meta.url)(path.resolve(buildDir, 'launched.js'));
const marker = (dir) => path.join(dir, 'launched.json');
const markerSnapshot = (dir) => {
  const stat = fs.lstatSync(marker(dir), { bigint: true, throwIfNoEntry: false });
  if (stat === undefined) return null;
  let bytes = null;
  if (fs.statSync(marker(dir), { throwIfNoEntry: false })?.isFile()) {
    try { bytes = fs.readFileSync(marker(dir)).toString('base64'); } catch { bytes = null; }
  }
  const followed = stat.isSymbolicLink() ? fs.statSync(marker(dir), { bigint: true, throwIfNoEntry: false }) : undefined;
  return {
    mode: stat.mode, ino: stat.ino, size: stat.size, ctimeNs: stat.ctimeNs, link: stat.isSymbolicLink() ? fs.readlinkSync(marker(dir)) : null, bytes,
    targetCtimeNs: followed?.isFile() ? followed.ctimeNs : null,
    targetIno: followed?.isFile() ? followed.ino : null,
    targetMode: followed?.isFile() ? followed.mode : null,
  };
};
const plant = (dir) => { fs.mkdirSync(path.join(dir, 'elsewhere')); writeLaunchedMarker(path.join(dir, 'elsewhere'), 'run-x', Date.UTC(2026, 9, 21)); fs.symlinkSync(path.join(dir, 'elsewhere', 'launched.json'), marker(dir)); };
// Each arm is the reader-side write of the mutant of the same name, applied with the target's path read from the link (no realpath).
const ARMS = {
  'none': () => {},
  'X3c-rename-over-same-mode': (real) => { const m = fs.statSync(real).mode & 0o777; fs.writeFileSync(`${real}.tmp`, fs.readFileSync(real), { mode: m }); fs.renameSync(`${real}.tmp`, real); },
  'X3d-rename-over-0644': (real) => { fs.writeFileSync(`${real}.tmp`, fs.readFileSync(real)); fs.renameSync(`${real}.tmp`, real); },
  'X5-unlink-rewrite-same-mode': (real) => { const m = fs.statSync(real).mode & 0o777; const b = fs.readFileSync(real); fs.unlinkSync(real); fs.writeFileSync(real, b, { mode: m }); },
  'Y1-copyfile-rename-over': (real) => { fs.copyFileSync(real, `${real}.tmp`); fs.renameSync(`${real}.tmp`, real); },
  'Y2-chmod-current-mode': (real) => { fs.chmodSync(real, fs.statSync(real).mode & 0o7777); },
  'Y3-unlink-rewrite-0644': (real) => { const b = fs.readFileSync(real); fs.unlinkSync(real); fs.writeFileSync(real, b, { mode: 0o644 }); },
  'Y4-hard-link-left': (real) => { fs.linkSync(real, `${real}.hard`); },
  'Y5-link-rename-unlink': (real) => { fs.linkSync(real, `${real}.tmp`); fs.renameSync(`${real}.tmp`, real); fs.rmSync(`${real}.tmp`, { force: true }); },
  'N3-zero-byte-write': (real) => { const fd = fs.openSync(real, 'r+'); fs.writeSync(fd, Buffer.alloc(0)); fs.closeSync(fd); },
  'N3-self-rename': (real) => { fs.renameSync(real, real); },
};
const FORMS = [{ value: 'terminal', declaredBy: 'operator', label: 'Inferred' }, { value: 'bang', declaredBy: 'operator', label: 'Inferred' },
  { value: 'syzygy-launched', declaredBy: 'syzygy', label: 'Observed' }];
const out = { root, roundsPerArm: rounds, arms: {} };
let n = 0;
for (const arm of armsArg.split(',')) {
  const write = ARMS[arm];
  const differ = {}; const sole = {}; let survived = 0; let notUnreadable = 0; let errors = 0;
  for (let i = 0; i < rounds; i += 1) {
    const dir = path.join(root, `p${n++}`);
    fs.mkdirSync(dir);
    plant(dir);
    const before = markerSnapshot(dir);
    launchFormRefusal(dir, FORMS[i % 3]);
    try { write(fs.readlinkSync(marker(dir))); } catch { errors += 1; }
    const after = markerSnapshot(dir);
    const moved = Object.keys(before).filter((k) => before[k] !== after[k]);
    for (const k of moved) differ[k] = (differ[k] ?? 0) + 1;
    if (moved.length === 1) sole[moved[0]] = (sole[moved[0]] ?? 0) + 1;
    if (moved.length === 0) survived += 1;
    if (launchedMarkerState(dir) !== 'unreadable') notUnreadable += 1;
    fs.rmSync(dir, { recursive: true, force: true });
  }
  out.arms[arm] = { rounds, roundsDifferingByField: differ, roundsWithASoleWitness: sole, roundsWithNothingDiffering: survived, notUnreadable, writeErrors: errors };
}
console.log(JSON.stringify(out, null, 1));
