// syzygy-bpyt.8.30: does the change time behave as the launch-form snapshot needs, on the file system <dir> lies on?
//   - faithful: for each kind of marker the rows plant, take an lstat (as the snapshot does), then the reader's own system calls
//     (open O_RDONLY | O_NOFOLLOW | O_NONBLOCK, fstat, a bounded read, close) and the snapshot's (stat, read, readlink), and lstat again:
//     a change of ctimeNs here would fail an unmutated row;
//   - rewrite: R-chmod-cycle-rewrite's own steps on a mode-000 file right after an lstat (chmod 0600, rewrite at the same size, chmod
//     0000): an unchanged ctimeNs here is a run in which that mutant would survive the strengthened row;
//   - the change times seen, so their granularity can be read off.
// Nothing here reads a repository. Usage: node ctime_probe.mjs <empty-dir> <rounds> <out.json>
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const [dir, roundsText, outFile] = process.argv.slice(2);
const rounds = Number(roundsText);
if (fs.readdirSync(dir).length !== 0) throw new Error(`${dir} must be empty`);
const MAX = 4096;
const ctime = (file) => fs.lstatSync(file, { bigint: true }).ctimeNs;

function readerCalls(file) {
  let fd;
  try { fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK); } catch { return; }
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > MAX) return;
    const bytes = Buffer.alloc(MAX + 1);
    let length = 0;
    while (length < bytes.length) { const read = fs.readSync(fd, bytes, length, bytes.length - length, null); if (read === 0) break; length += read; }
  } catch { /* as the reader */ } finally { fs.closeSync(fd); }
}
function snapshotCalls(file) {
  const stat = fs.lstatSync(file);
  if (fs.statSync(file, { throwIfNoEntry: false })?.isFile()) { try { fs.readFileSync(file); } catch { /* unreadable */ } }
  if (stat.isSymbolicLink()) fs.readlinkSync(file);
}

const KINDS = {
  'a readable file': (file) => fs.writeFileSync(file, '{"format": 1}'),
  'an empty file': (file) => fs.writeFileSync(file, ''),
  'a mode-000 file': (file) => { fs.writeFileSync(file, '{"format": "polaris-dossier-launched/1"}'); fs.chmodSync(file, 0o000); },
  'a directory': (file) => fs.mkdirSync(file),
  'a dangling link': (file) => fs.symlinkSync(`${file}.nowhere`, file),
  'a link to a readable file': (file) => { fs.writeFileSync(`${file}.target`, 'x'.repeat(231)); fs.symlinkSync(`${file}.target`, file); },
  'a link to a character device': (file) => fs.symlinkSync('/dev/zero', file),
  'a FIFO': (file) => execFileSync('mkfifo', [file]),
};

const faithful = {};
const keep = [];
for (const [kind, plant] of Object.entries(KINDS)) {
  let moved = 0;
  for (let round = 0; round < rounds; round++) {
    const file = path.join(dir, `f-${Object.keys(faithful).length}-${round}`);
    plant(file);
    const before = ctime(file);
    snapshotCalls(file); readerCalls(file); snapshotCalls(file); readerCalls(file);
    if (ctime(file) !== before) moved++;
  }
  faithful[kind] = { asks: rounds * 2, roundsWithAMove: moved };
}
// A FIFO holding the marker's bytes, kept open by a reader of the probe's own, as fifoHoldingTheMarker plants it.
{
  let moved = 0;
  for (let round = 0; round < rounds; round++) {
    const file = path.join(dir, `held-${round}`);
    execFileSync('mkfifo', [file]);
    const reader = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
    keep.push(reader);
    const writer = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_NONBLOCK);
    fs.writeSync(writer, '{"format": "polaris-dossier-launched/1"}\n');
    fs.closeSync(writer);
    const before = ctime(file);
    snapshotCalls(file); readerCalls(file); snapshotCalls(file); readerCalls(file);
    if (ctime(file) !== before) moved++;
  }
  faithful['a FIFO holding bytes'] = { asks: rounds * 2, roundsWithAMove: moved };
}
for (const fd of keep) fs.closeSync(fd);

let unchanged = 0;
let otherFieldsMoved = 0;
const deltas = [];
const seen = [];
for (let round = 0; round < rounds; round++) {
  const file = path.join(dir, `r-${round}`);
  fs.writeFileSync(file, '{"format": "polaris-dossier-launched/1"}');
  fs.chmodSync(file, 0o000);
  const first = fs.lstatSync(file, { bigint: true });
  const before = first.ctimeNs;
  const size = Number(first.size);
  fs.chmodSync(file, 0o600); fs.writeFileSync(file, ' '.repeat(size)); fs.chmodSync(file, 0o000);
  const second = fs.lstatSync(file, { bigint: true });
  const after = second.ctimeNs;
  if (second.mode !== first.mode || second.ino !== first.ino || second.size !== first.size) otherFieldsMoved++;
  if (after === before) unchanged++;
  deltas.push(after - before);
  seen.push(before, after);
}
const sorted = deltas.slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const trailingZeros = (value) => { let zeros = 0; let v = value; while (v > 0n && v % 10n === 0n && zeros < 9) { v /= 10n; zeros++; } return zeros; };
const zeroHistogram = {};
for (const value of seen) { const z = trailingZeros(value); zeroHistogram[z] = (zeroHistogram[z] ?? 0) + 1; }
for (const name of fs.readdirSync(dir)) { const full = path.join(dir, name); try { fs.chmodSync(full, 0o600); } catch { /* a link */ } }
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir);
const out = {
  node: process.version, kernel: os.release(), dir, filesystem: execFileSync('stat', ['-f', '-c', '%T', dir], { encoding: 'utf8' }).trim(), rounds,
  faithful,
  rewrite: { rounds, ctimeUnchanged: unchanged, modeInodeOrSizeMoved: otherFieldsMoved, deltaNs: { min: String(sorted[0]), median: String(sorted[Math.floor(sorted.length / 2)]), max: String(sorted.at(-1)) } },
  ctimeTrailingDecimalZeros: zeroHistogram,
};
fs.writeFileSync(outFile, `${JSON.stringify(out, null, 1)}\n`);
console.log(JSON.stringify(out));
