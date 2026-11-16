// Concurrent-sweep probe over the built module: per round, 150 dead-pid directories (10 reaped
// pids x 15, nested three levels) and 3 live ones made with the module's own naming functions
// by this (live) process, then 4 sweeper processes started together. Records exits, stderr and
// what is left. Usage: node race_probe.mjs <module> <private-dir> <out.json>
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, readdirSync, readlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [modulePath, dir, out] = process.argv.slice(2);
const { FIXTURE_PREFIX, ownedCopyPrefix, ownedTemplatePrefix } = await import(modulePath);
const ns = /\[(\d+)\]$/.exec(readlinkSync('/proc/self/ns/pid'))[1];
const rounds = [];
for (let round = 0; round < 3; round += 1) {
  const dead = [];
  for (let i = 0; i < 10; i += 1) dead.push(spawnSync(process.execPath, ['-e', '']).pid);
  for (const pid of dead) {
    for (let j = 0; j < 15; j += 1) {
      const name = `${FIXTURE_PREFIX}${j % 3 === 0 ? 'template-' : ''}p${pid}-n${ns}-R${round}x${String(j).padStart(3, '0')}`;
      mkdirSync(join(dir, name, 'a', 'b'), { recursive: true });
      writeFileSync(join(dir, name, 'a', 'b', 'f.txt'), 'x');
    }
  }
  const live = [mkdtempSync(join(dir, ownedCopyPrefix())), mkdtempSync(join(dir, ownedCopyPrefix())), mkdtempSync(join(dir, ownedTemplatePrefix()))]
    .map((path) => path.slice(dir.length + 1));
  const code = `import(${JSON.stringify(modulePath)}).then((m) => m.removeFixturesOfDeadProcesses(${JSON.stringify(dir)}))`;
  const children = Array.from({ length: 4 }, () => spawn(process.execPath, ['-e', code], { stdio: ['ignore', 'ignore', 'pipe'] }));
  const stderr = children.map(() => '');
  children.forEach((child, i) => child.stderr.on('data', (chunk) => { stderr[i] += chunk; }));
  const exits = await Promise.all(children.map(async (child) => (await once(child, 'exit'))[0]));
  const left = readdirSync(dir);
  rounds.push({ round, deadMade: dead.length * 15, liveMade: live, exits, stderr, deadLeft: left.filter((n) => !live.includes(n)).length, liveKept: live.every((n) => left.includes(n)) });
  for (const name of live) spawnSync('rm', ['-r', join(dir, name)]);
}
writeFileSync(out, JSON.stringify({ probe: 'race_probe.mjs', namespace: ns, pid: process.pid, rounds }, null, 1));
console.log(JSON.stringify(rounds.map((r) => ({ round: r.round, exits: r.exits, stderr: r.stderr.join('').length, deadLeft: r.deadLeft, liveKept: r.liveKept }))));
