// syzygy-bpyt.8.35: the PR 523 reviewer's faithful-ask probe (docs/evidence/launch-form-target-ctime-review-2026-10-25/tools/
// faithful_probe.mjs), with the snapshot helper as it stands at this bead's fix: targetIno and targetMode beside targetCtimeNs, copied
// verbatim from launched.test.ts without its type annotations (record.py checks the copy line for line). Nothing else differs, except
// that each plant also counts the rounds whose targetIno and targetMode are null.
// The reviewer's header: can a faithful ask move any field the 8.33 snapshot compares? For each of the 17 plants of
// PRESENT_BUT_NOT_THE_MARKER (copied from launched.test.ts at d1742589, the FIFO-holding plant without its keep-open cleanup list), each
// round plants afresh, takes the snapshot (the helper's code copied verbatim from :38-50), asks the unmutated reader (launched.ts at
// d1742589, compiled to a scratch build) for one form, and takes the snapshot again. Prints, per plant, the rounds and how many rounds
// differed in each field.
// Usage: node faithful_probe.mjs <build dir> <private dir> [rounds per plant] [--selftest]
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';

const [buildDir, root, roundsArg] = process.argv.slice(2);
const rounds = Number(roundsArg ?? 300);
const { launchFormRefusal, launchedMarkerState, writeLaunchedMarker } = createRequire(import.meta.url)(path.resolve(buildDir, 'launched.js'));
const marker = (dir) => path.join(dir, 'launched.json');
const TYPED = '{\n  "format": "polaris-dossier-launched/1",\n  "runId": "run-x",\n  "startedAt": "2026-10-21T00:00:00.000Z",\n  "command": "syzygy polaris",\n  "executionPermitted": false,\n  "direction": "POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14"\n}\n';
const PREFIX = '{"format": "polaris-dossier-launched/1", "pad": "';
const padded = (bytes) => `${PREFIX}${'x'.repeat(bytes - PREFIX.length - 3)}"}\n`;
const keeps = [];
const fifoHoldingTheMarker = (dir) => {
  execFileSync('mkfifo', [marker(dir)]);
  keeps.push(fs.openSync(marker(dir), fs.constants.O_RDONLY | fs.constants.O_NONBLOCK));
  const writer = fs.openSync(marker(dir), fs.constants.O_WRONLY | fs.constants.O_NONBLOCK);
  fs.writeSync(writer, TYPED);
  fs.closeSync(writer);
};
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
const PLANTS = [
  ['an empty file', (dir) => fs.writeFileSync(marker(dir), '')],
  ['invalid JSON', (dir) => fs.writeFileSync(marker(dir), '{"format": "polaris-dossier-launched/1"')],
  ['JSON null', (dir) => fs.writeFileSync(marker(dir), 'null')],
  ['a JSON array', (dir) => fs.writeFileSync(marker(dir), '[]')],
  ['a JSON string', (dir) => fs.writeFileSync(marker(dir), '"polaris-dossier-launched/1"')],
  ['another format', (dir) => fs.writeFileSync(marker(dir), '{"format": "polaris-dossier-launched/2"}')],
  ['no format', (dir) => fs.writeFileSync(marker(dir), '{"runId": "run-x"}')],
  ['a format that is not a string', (dir) => fs.writeFileSync(marker(dir), '{"format": 1}')],
  ['a byte-order mark before the marker', (dir) => fs.writeFileSync(marker(dir), '﻿{"format": "polaris-dossier-launched/1"}')],
  ['a directory', (dir) => fs.mkdirSync(marker(dir))],
  ['a dangling symbolic link', (dir) => fs.symlinkSync(path.join(dir, 'nowhere.json'), marker(dir))],
  ['a symbolic link to the marker Syzygy writes', (dir) => { fs.mkdirSync(path.join(dir, 'elsewhere')); writeLaunchedMarker(path.join(dir, 'elsewhere'), 'run-x', Date.UTC(2026, 9, 21)); fs.symlinkSync(path.join(dir, 'elsewhere', 'launched.json'), marker(dir)); }],
  ['a symbolic link to a character device', (dir) => fs.symlinkSync('/dev/zero', marker(dir))],
  ['a FIFO', (dir) => execFileSync('mkfifo', [marker(dir)])],
  ['a FIFO holding the marker\'s bytes', fifoHoldingTheMarker],
  ['a marker of 4097 bytes, one past the bound', (dir) => fs.writeFileSync(marker(dir), padded(4097))],
  ['a file its reader may not read', (dir) => { fs.writeFileSync(marker(dir), '{"format": "polaris-dossier-launched/1"}'); fs.chmodSync(marker(dir), 0o000); }],
];
const FORMS = [{ value: 'terminal', declaredBy: 'operator', label: 'Inferred' }, { value: 'bang', declaredBy: 'operator', label: 'Inferred' },
  { value: 'syzygy-launched', declaredBy: 'syzygy', label: 'Observed' }];
const out = { root, roundsPerPlant: rounds, plants: {} };
let n = 0;
for (const [name, plant] of PLANTS) {
  const differ = {}; let notUnreadable = 0; let nullTarget = 0; let nullIno = 0; let nullMode = 0;
  for (let i = 0; i < rounds; i += 1) {
    const dir = path.join(root, `p${n++}`);
    fs.mkdirSync(dir);
    plant(dir);
    const before = markerSnapshot(dir);
    launchFormRefusal(dir, FORMS[i % 3]);
    // --selftest: a chmod-cycle of a link's regular-file target, which the comparison must catch (rule 6)
    if (process.argv[5] === '--selftest' && fs.lstatSync(marker(dir)).isSymbolicLink() && fs.statSync(marker(dir), { throwIfNoEntry: false })?.isFile()) { const m = fs.statSync(marker(dir)).mode & 0o777; fs.chmodSync(marker(dir), 0); fs.chmodSync(marker(dir), m); }
    // --selftest-rename (8.35): the link's regular-file target replaced by a same-mode copy renamed over it (X3c's write); targetIno must catch it
    if (process.argv[5] === '--selftest-rename' && fs.lstatSync(marker(dir)).isSymbolicLink() && fs.statSync(marker(dir), { throwIfNoEntry: false })?.isFile()) { const t = fs.realpathSync(marker(dir)); const m = fs.statSync(t).mode & 0o777; fs.writeFileSync(`${t}.tmp`, fs.readFileSync(t), { mode: m }); fs.renameSync(`${t}.tmp`, t); }
    // --selftest-unlink-0644 (8.35): the target unlinked, then rewritten at its path at mode 0644 (X5's write, X3d's mode); targetMode must catch it
    if (process.argv[5] === '--selftest-unlink-0644' && fs.lstatSync(marker(dir)).isSymbolicLink() && fs.statSync(marker(dir), { throwIfNoEntry: false })?.isFile()) { const t = fs.realpathSync(marker(dir)); const b = fs.readFileSync(t); fs.unlinkSync(t); fs.writeFileSync(t, b, { mode: 0o644 }); }
    const after = markerSnapshot(dir);
    for (const k of Object.keys(before)) if (before[k] !== after[k]) differ[k] = (differ[k] ?? 0) + 1;
    if (before.targetCtimeNs === null) nullTarget += 1;
    if (before.targetIno === null) nullIno += 1;
    if (before.targetMode === null) nullMode += 1;
    if (launchedMarkerState(dir) !== 'unreadable') notUnreadable += 1;
    for (const fd of keeps.splice(0)) fs.closeSync(fd);
    if (fs.lstatSync(marker(dir), { throwIfNoEntry: false })?.isFile()) fs.chmodSync(marker(dir), 0o600);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  out.plants[name] = { rounds, roundsDifferingByField: differ, targetCtimeNsNull: nullTarget, targetInoNull: nullIno, targetModeNull: nullMode, notUnreadable };
}
console.log(JSON.stringify(out, null, 1));
