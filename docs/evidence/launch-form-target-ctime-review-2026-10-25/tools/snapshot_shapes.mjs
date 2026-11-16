// R-GP-IMPL-LAUNCH-FORM-TARGET-CTIME-1: the 8.33 markerSnapshot (copied verbatim from launched.test.ts:38-50 at d1742589) on link shapes
// none of the 17 rows plants: a link to a directory, a link to a FIFO holding bytes (are they still there afterwards?), a link to a link to
// a file, a link loop, and a link into a directory the process may not search. Also the base helper (without the new line), to show
// which shapes already threw before. Prints one JSON line per shape: targetCtimeNs, or the error code thrown.
// Usage: node snapshot_shapes.mjs <private dir>
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = process.argv[2];
const marker = (dir) => path.join(dir, 'launched.json');
const fixSnapshot = (dir) => {
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
  };
};
const baseSnapshot = (dir) => {
  const stat = fs.lstatSync(marker(dir), { bigint: true, throwIfNoEntry: false });
  if (stat === undefined) return null;
  let bytes = null;
  if (fs.statSync(marker(dir), { throwIfNoEntry: false })?.isFile()) {
    try { bytes = fs.readFileSync(marker(dir)).toString('base64'); } catch { bytes = null; }
  }
  return { mode: stat.mode, ino: stat.ino, size: stat.size, ctimeNs: stat.ctimeNs, link: stat.isSymbolicLink() ? fs.readlinkSync(marker(dir)) : null, bytes };
};
const shapes = {
  'link to a directory': (dir) => { fs.mkdirSync(path.join(dir, 'd')); fs.symlinkSync(path.join(dir, 'd'), marker(dir)); },
  'link to a FIFO holding 5 bytes': (dir) => {
    execFileSync('mkfifo', [path.join(dir, 'f')]);
    keeps.push(fs.openSync(path.join(dir, 'f'), fs.constants.O_RDONLY | fs.constants.O_NONBLOCK));
    const w = fs.openSync(path.join(dir, 'f'), fs.constants.O_WRONLY | fs.constants.O_NONBLOCK); fs.writeSync(w, 'bytes'); fs.closeSync(w);
    fs.symlinkSync(path.join(dir, 'f'), marker(dir));
  },
  'link to a link to a regular file': (dir) => { fs.writeFileSync(path.join(dir, 'x'), '{}'); fs.symlinkSync(path.join(dir, 'x'), path.join(dir, 'l1')); fs.symlinkSync(path.join(dir, 'l1'), marker(dir)); },
  'link loop (to itself)': (dir) => fs.symlinkSync(marker(dir), marker(dir)),
  'link into a directory the process may not search': (dir) => { fs.mkdirSync(path.join(dir, 'locked')); fs.writeFileSync(path.join(dir, 'locked', 'x'), '{}'); fs.chmodSync(path.join(dir, 'locked'), 0o000); fs.symlinkSync(path.join(dir, 'locked', 'x'), marker(dir)); },
};
let i = 0;
const keeps = [];
for (const [name, plant] of Object.entries(shapes)) {
  const result = { shape: name };
  for (const [which, snap] of [['base', baseSnapshot], ['fix', fixSnapshot]]) {
    const dir = path.join(root, `s${i++}`);
    fs.mkdirSync(dir);
    plant(dir);
    try { const s = snap(dir); result[which] = s === null ? null : { targetCtimeNs: s.targetCtimeNs === undefined ? 'absent' : String(s.targetCtimeNs), bytes: s.bytes }; }
    catch (error) { result[which] = { threw: error.code }; }
    if (name.startsWith('link to a FIFO')) {
      const keep = fs.openSync(path.join(dir, 'f'), fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
      const buf = Buffer.alloc(16); let n = 0; try { n = fs.readSync(keep, buf, 0, 16, null); } catch { n = 0; }
      result[`${which}FifoBytesLeftAfterSnapshot`] = buf.toString('utf8', 0, n);
      fs.closeSync(keep);
      for (const fd of keeps.splice(0)) fs.closeSync(fd);
    }
    try { fs.chmodSync(path.join(dir, 'locked'), 0o700); } catch { /* no such directory */ }
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log(JSON.stringify(result));
}
