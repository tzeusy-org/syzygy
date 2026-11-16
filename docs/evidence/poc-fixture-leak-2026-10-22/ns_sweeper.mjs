// Runs the module's sweep once over <dir>, for ns_sandbox_probe.py, and reports what it saw. Before sweeping it
// makes a positive control: a directory named with its own namespace reading (0 where it has none) and a pid it
// has just reaped. For each pid in <probe-pids> it records what signal 0 answers in this namespace.
// Usage: node ns_sweeper.mjs <module> <dir> <out.json> <probe-pids comma-separated>
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [modulePath, dir, out, probe] = process.argv.slice(2);
const { FIXTURE_PREFIX, removeFixturesOfDeadProcesses } = await import(modulePath);
let nsReading;
try { nsReading = readlinkSync('/proc/self/ns/pid'); } catch (error) { nsReading = `unreadable:${error.code}`; }
const ns = /\[(\d+)\]$/.exec(nsReading)?.[1] ?? '0';
const child = spawnSync(process.execPath, ['-e', '']);
const reaped = child.pid;
let reapedAnswer;
try { process.kill(reaped, 0); reapedAnswer = 'alive'; } catch (error) { reapedAnswer = error.code; }
const control = `${FIXTURE_PREFIX}p${reaped}-n${ns}-CTRL01`;
mkdirSync(join(dir, control, 'repo'), { recursive: true });
const signal0 = {};
for (const pid of (probe ?? '').split(',').filter(Boolean)) {
  try { process.kill(Number(pid), 0); signal0[pid] = 'alive'; } catch (error) { signal0[pid] = error.code; }
}
const before = readdirSync(dir).sort();
removeFixturesOfDeadProcesses(dir);
const after = readdirSync(dir).sort();
writeFileSync(out, JSON.stringify({ pid: process.pid, nsReading, control, reapedAnswer, signal0, before, after, removed: before.filter((name) => !after.includes(name)) }, null, 1));
