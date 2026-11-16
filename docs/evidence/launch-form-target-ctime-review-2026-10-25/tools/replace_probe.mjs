// R-GP-IMPL-LAUNCH-FORM-TARGET-CTIME-1: can a link's target be replaced at its own path by a byte-identical copy (a new inode) and keep the
// change time the 8.33 snapshot compares? Each round plants the link row's shape (a directory `elsewhere` holding a 0600 marker, and a link
// to it), takes the snapshot's own calls (lstat, stat, readFile, bigint stat, readlink), replaces the target as X3c does (write a
// temporary copy beside it, rename it over the target), and takes the snapshot again. Two forms: `asTest` with every snapshot call between
// the plant and the replacement; `tight` with only the bigint stat between them. Prints how many rounds kept targetCtimeNs equal.
// Usage: node replace_probe.mjs <private dir> [rounds]
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = process.argv[2];
const rounds = Number(process.argv[3] ?? 2000);
const marker = '{\n  "format": "polaris-dossier-launched/1"\n}\n';
const snapshot = (m) => {
  const stat = fs.lstatSync(m, { bigint: true, throwIfNoEntry: false });
  let bytes = null;
  if (fs.statSync(m, { throwIfNoEntry: false })?.isFile()) bytes = fs.readFileSync(m).toString('base64');
  const followed = stat.isSymbolicLink() ? fs.statSync(m, { bigint: true, throwIfNoEntry: false }) : undefined;
  return { ino: stat.ino, ctimeNs: stat.ctimeNs, link: fs.readlinkSync(m), bytes, targetCtimeNs: followed?.isFile() ? followed.ctimeNs : null,
    targetIno: followed?.ino ?? null, targetMode: followed?.mode ?? null };
};
const result = {};
for (const form of ['asTest', 'tight']) {
  let equalCtime = 0; let inoChanged = 0; const gaps = [];
  for (let i = 0; i < rounds; i += 1) {
    const dir = path.join(root, `${form}-${i}`);
    fs.mkdirSync(path.join(dir, 'elsewhere'), { recursive: true });
    const target = path.join(dir, 'elsewhere', 'launched.json');
    const m = path.join(dir, 'launched.json');
    const t0 = process.hrtime.bigint();
    fs.writeFileSync(target, marker, { mode: 0o600, flag: 'wx' });
    fs.symlinkSync(target, m);
    let before;
    if (form === 'asTest') before = snapshot(m);
    else { const f = fs.statSync(m, { bigint: true }); before = { targetCtimeNs: f.ctimeNs, targetIno: f.ino }; }
    // the replacement, as X3c makes it
    const t = fs.statSync(m);
    const real = fs.readlinkSync(m);
    const b = fs.readFileSync(m);
    fs.writeFileSync(`${real}.tmp`, b, { mode: t.mode & 0o777 });
    fs.renameSync(`${real}.tmp`, real);
    gaps.push(Number(process.hrtime.bigint() - t0));
    const f = fs.statSync(m, { bigint: true });
    if (f.ctimeNs === before.targetCtimeNs) equalCtime += 1;
    if (f.ino !== before.targetIno) inoChanged += 1;
    fs.rmSync(dir, { recursive: true, force: true });
  }
  gaps.sort((a, b) => a - b);
  result[form] = { rounds, equalTargetCtime: equalCtime, targetInoChanged: inoChanged, plantToReplacedNsMedian: gaps[gaps.length >> 1] };
}
console.log(JSON.stringify({ kernel: process.platform, root, ...result }));
