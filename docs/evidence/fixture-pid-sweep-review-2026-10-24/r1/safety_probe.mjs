// Deletion-safety probes of removeFixturesOfDeadProcesses at the reviewed commit.
// Usage: node safety_probe.mjs <private-dir under /tmp/r509-> <built helper path>
// Every entry is made inside <private-dir>; the sweep is only ever given that directory.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, helperPath] = process.argv.slice(2);
if (!dir?.startsWith('/tmp/r509-')) throw new Error(`refusing a directory outside /tmp/r509-: ${dir}`);
const { removeFixturesOfDeadProcesses } = await import(helperPath);
const P = 'syzygy-poc-surface-fixture-';

async function deadPid() {
  const child = spawn(process.execPath, ['-e', '']);
  await once(child, 'exit');
  try { process.kill(child.pid, 0); } catch (error) { if (error.code === 'ESRCH') return child.pid; }
  throw new Error('reaped child pid still answers');
}
function fresh(name) {
  const root = join(dir, name);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  return root;
}
const kind = (path) => {
  try {
    const st = lstatSync(path);
    return st.isSymbolicLink() ? 'symlink' : st.isDirectory() ? 'dir' : 'file';
  } catch { return 'absent'; }
};
const results = {};

// P1: a symlink at a matching dead-pid name, pointing at a directory holding a canary.
{
  const root = fresh('p1');
  const dead = await deadPid();
  const target = join(root, 'outside-target');
  mkdirSync(join(target, 'sub'), { recursive: true });
  writeFileSync(join(target, 'canary.txt'), 'keep\n');
  writeFileSync(join(target, 'sub', 'canary2.txt'), 'keep\n');
  const sweepDir = join(root, 'tmp');
  mkdirSync(sweepDir);
  const link = join(sweepDir, `${P}p${dead}-LINK01`);
  symlinkSync(target, link);
  removeFixturesOfDeadProcesses(sweepDir);
  results.P1_symlinkToDirectory = { link: kind(link), targetCanary: existsSync(join(target, 'canary.txt')), targetNestedCanary: existsSync(join(target, 'sub', 'canary2.txt')) };
}
// P2: a regular file at a matching dead-pid name.
{
  const root = fresh('p2');
  const dead = await deadPid();
  const file = join(root, `${P}p${dead}-FILE01`);
  writeFileSync(file, 'not a fixture directory\n');
  removeFixturesOfDeadProcesses(root);
  results.P2_regularFile = { entry: kind(file) };
}
// P3: a matching dead-pid directory holding a symlink to an outside directory.
{
  const root = fresh('p3');
  const dead = await deadPid();
  const target = join(root, 'outside-target');
  mkdirSync(target);
  writeFileSync(join(target, 'canary.txt'), 'keep\n');
  const sweepDir = join(root, 'tmp');
  const fixture = join(sweepDir, `${P}p${dead}-NEST01`);
  mkdirSync(fixture, { recursive: true });
  symlinkSync(target, join(fixture, 'link-to-outside'));
  removeFixturesOfDeadProcesses(sweepDir);
  results.P3_nestedSymlink = { fixture: kind(fixture), targetCanary: existsSync(join(target, 'canary.txt')) };
}
// P4: pid forms: init (EPERM), 0, leading zeros, past pid_max, past 2^31.
{
  const root = fresh('p4');
  const names = {
    pid1_init: `${P}p1-INIT01`,
    pid0: `${P}p0-ZERO01`,
    leadingZeros_pid1: `${P}template-p0001-LEAD01`,
    pastPidMax_4194305: `${P}p4194305-PMAX01`,
    past2pow31: `${P}p2147483648-BIG001`,
    hugeDigits: `${P}p99999999999999999999-HUGE01`,
  };
  for (const name of Object.values(names)) mkdirSync(join(root, name));
  const errors = {};
  for (const [label, pid] of [['pid1', 1], ['pid4194305', 4194305], ['pid2147483648', 2147483648], ['pid1e20', Number('99999999999999999999')]]) {
    try { process.kill(pid, 0); errors[label] = 'no error'; } catch (error) { errors[label] = error.code; }
  }
  removeFixturesOfDeadProcesses(root);
  results.P4_pidForms = { killErrors: errors, after: Object.fromEntries(Object.entries(names).map(([k, n]) => [k, kind(join(root, n))])) };
}
// P5: an unreadable TMPDIR (write and search only): does the sweep fail the caller?
{
  const root = fresh('p5');
  const { chmodSync } = await import('node:fs');
  chmodSync(root, 0o333);
  try {
    removeFixturesOfDeadProcesses(root);
    results.P5_unreadableDirectory = 'returned';
  } catch (error) {
    results.P5_unreadableDirectory = `threw ${error.code}`;
  } finally {
    chmodSync(root, 0o755);
  }
}
for (const name of ['p1', 'p2', 'p3', 'p4', 'p5']) rmSync(join(dir, name), { recursive: true, force: true });
console.log(JSON.stringify({ node: process.version, results }, null, 1));
console.log('left in private dir:', JSON.stringify(readdirSync(dir)));
