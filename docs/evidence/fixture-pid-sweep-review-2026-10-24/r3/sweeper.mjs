// Round-3 reviewer probe (rev-509c). Runs the module's sweep once over <dir> and reports what it saw and did.
// Before sweeping it makes a positive control: a directory named with a pid it has just reaped and the namespace
// segment it would itself write (its readable inode, or 0 without /proc). It counts every readdirSync of <dir>
// the module makes, through a patched node:fs synced into the ESM named exports before the module is imported.
// Usage: node sweeper.mjs <module.mjs> <dir> <out.json> <probe-pids comma-separated>
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';

const [modulePath, dir, out, probe] = process.argv.slice(2);
const listings = [];
const realReaddir = fs.readdirSync;
fs.readdirSync = (path, ...rest) => {
  listings.push(String(path));
  return realReaddir(path, ...rest);
};
syncBuiltinESMExports();
const { FIXTURE_PREFIX, removeFixturesOfDeadProcesses } = await import(modulePath);
let nsReading;
try { nsReading = fs.readlinkSync('/proc/self/ns/pid'); } catch (error) { nsReading = `unreadable:${error.code}`; }
const ns = /\[(\d+)\]$/.exec(nsReading)?.[1] ?? '0';
const child = spawnSync(process.execPath, ['-e', '']);
const reaped = child.pid;
let reapedAnswer;
try { process.kill(reaped, 0); reapedAnswer = 'alive'; } catch (error) { reapedAnswer = error.code; }
const control = `${FIXTURE_PREFIX}p${reaped}-n${ns}-CTRL01`;
fs.mkdirSync(join(dir, control, 'repo'), { recursive: true });
const signal0 = {};
for (const pid of (probe ?? '').split(',').filter(Boolean)) {
  try { process.kill(Number(pid), 0); signal0[pid] = 'alive'; } catch (error) { signal0[pid] = error.code; }
}
const before = realReaddir(dir).sort();
listings.length = 0;
removeFixturesOfDeadProcesses(dir);
const moduleListings = [...listings];
const after = realReaddir(dir).sort();
fs.writeFileSync(out, JSON.stringify({ pid: process.pid, nsReading, control, reapedAnswer, signal0, moduleListings, before, after, removed: before.filter((name) => !after.includes(name)) }, null, 1));
