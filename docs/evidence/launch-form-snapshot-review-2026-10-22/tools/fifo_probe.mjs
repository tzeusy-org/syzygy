// Reviewer probe for PR 516: does the snapshot's lstat/stat pair drain, block on, or alter a FIFO, and which stat fields does a
// faithful read, a drain, or a chmod-cycle rewrite move? A JS transcription of markerSnapshot's calls; it imports no repository code.
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const TYPED = '{\n  "format": "polaris-dossier-launched/1",\n  "runId": "run-x",\n  "startedAt": "2026-10-21T00:00:00.000Z",\n  "command": "syzygy polaris",\n  "executionPermitted": false,\n  "direction": "POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14"\n}\n';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'r516-probe-'));
const out = {};
try {
  // 1. A FIFO holding the marker's bytes, planted as fifoHoldingTheMarker does.
  const fifo = path.join(root, 'launched.json');
  execFileSync('mkfifo', [fifo]);
  const keep = fs.openSync(fifo, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
  const writer = fs.openSync(fifo, fs.constants.O_WRONLY | fs.constants.O_NONBLOCK);
  fs.writeSync(writer, TYPED);
  fs.closeSync(writer);
  const t0 = process.hrtime.bigint();
  const ls = fs.lstatSync(fifo, { throwIfNoEntry: false });
  const st = fs.statSync(fifo, { throwIfNoEntry: false });
  const ls2 = fs.lstatSync(fifo, { throwIfNoEntry: false });
  const elapsedUs = Number(process.hrtime.bigint() - t0) / 1000;
  const buf = Buffer.alloc(8192);
  let drained = 0;
  try { drained = fs.readSync(keep, buf, 0, buf.length, null); } catch (e) { drained = `error ${e.code}`; }
  out.fifo = {
    typedBytes: Buffer.byteLength(TYPED), bytesStillInPipeAfterSnapshotCalls: drained, snapshotCallsMicroseconds: Math.round(elapsedUs),
    statIsFile: st.isFile(), lstatSize: ls.size, lstatUnchangedByTheCalls: ls.ino === ls2.ino && ls.mode === ls2.mode && ls.size === ls2.size,
  };
  // 2. After a drain, which lstat fields moved?
  const w2 = fs.openSync(fifo, fs.constants.O_WRONLY | fs.constants.O_NONBLOCK);
  fs.writeSync(w2, TYPED);
  fs.closeSync(w2);
  const beforeDrain = fs.lstatSync(fifo);
  const r = fs.openSync(fifo, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
  const n = fs.readSync(r, buf, 0, buf.length, null);
  fs.closeSync(r);
  const afterDrain = fs.lstatSync(fifo);
  out.fifoDrain = {
    drainedBytes: n, mode: beforeDrain.mode === afterDrain.mode, ino: beforeDrain.ino === afterDrain.ino, size: beforeDrain.size === afterDrain.size,
    ctimeUnchanged: beforeDrain.ctimeMs === afterDrain.ctimeMs, mtimeUnchanged: beforeDrain.mtimeMs === afterDrain.mtimeMs,
  };
  fs.closeSync(keep);
  // 3. A readable regular file: does a faithful read (O_RDONLY|O_NOFOLLOW|O_NONBLOCK, then read) move ctime or mtime?
  const file = path.join(root, 'plain.json');
  fs.writeFileSync(file, '{"format": "polaris-dossier-launched/2"}');
  const b1 = fs.lstatSync(file);
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  fs.readSync(fd, buf, 0, buf.length, null);
  fs.closeSync(fd);
  fs.readFileSync(file);
  const b2 = fs.lstatSync(file);
  out.faithfulRead = { ctimeUnchanged: b1.ctimeMs === b2.ctimeMs, mtimeUnchanged: b1.mtimeMs === b2.mtimeMs, ino: b1.ino === b2.ino };
  // 4. The file its reader may not read: a chmod-cycle same-size rewrite leaves mode, ino and size equal; does ctime move?
  const locked = path.join(root, 'locked.json');
  fs.writeFileSync(locked, '{"format": "polaris-dossier-launched/1"}');
  fs.chmodSync(locked, 0o000);
  const c1 = fs.lstatSync(locked);
  fs.chmodSync(locked, 0o600);
  fs.writeFileSync(locked, ' '.repeat(c1.size));
  fs.chmodSync(locked, 0o000);
  const c2 = fs.lstatSync(locked);
  out.chmodCycle = {
    modeEqual: c1.mode === c2.mode, inoEqual: c1.ino === c2.ino, sizeEqual: c1.size === c2.size,
    ctimeChanged: c1.ctimeMs !== c2.ctimeMs, mtimeChanged: c1.mtimeMs !== c2.mtimeMs,
    readableByTest: (() => { try { fs.readFileSync(locked); return true; } catch (e) { return e.code; } })(),
  };
  // 5. Inode reuse on this filesystem after unlink and recreate.
  const reuse = path.join(root, 'reuse.json');
  fs.writeFileSync(reuse, 'x');
  const i1 = fs.lstatSync(reuse).ino;
  fs.unlinkSync(reuse);
  fs.writeFileSync(reuse, 'x');
  const i2 = fs.lstatSync(reuse).ino;
  out.inodeReuse = { reused: i1 === i2 };
} finally {
  try { fs.chmodSync(path.join(root, 'locked.json'), 0o600); } catch { /* absent */ }
  fs.rmSync(root, { recursive: true, force: true });
  out.probeDirRemoved = !fs.existsSync(root);
}
console.log(JSON.stringify(out, null, 1));
