// Four sweeps at once over the same dead-pid directories: does any throw, and is anything left?
// Usage: node race_probe.mjs <private-dir under /tmp/r509-> <built helper path> <rounds>
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, helperPath, roundsArg] = process.argv.slice(2);
if (!dir?.startsWith('/tmp/r509-')) throw new Error(`refusing ${dir}`);
const rounds = Number(roundsArg);
const P = 'syzygy-poc-surface-fixture-';
const child = spawn(process.execPath, ['-e', '']);
await once(child, 'exit');
const dead = child.pid;
const sweeper = `const m = await import(${JSON.stringify(helperPath)}); m.removeFixturesOfDeadProcesses(${JSON.stringify(dir)});`;
const outcomes = [];
for (let round = 0; round < rounds; round += 1) {
  for (let i = 0; i < 150; i += 1) {
    const root = join(dir, `${P}${i % 2 ? 'template-' : ''}p${dead}-R${round}x${i}`);
    for (let j = 0; j < 4; j += 1) {
      mkdirSync(join(root, `d${j}`, 'e'), { recursive: true });
      writeFileSync(join(root, `d${j}`, 'e', 'f.txt'), 'x');
    }
  }
  const live = join(dir, `${P}p${process.pid}-LIVE${round}`);
  mkdirSync(live);
  const runs = Array.from({ length: 4 }, () => spawn(process.execPath, ['--input-type=module', '-e', sweeper], { stdio: ['ignore', 'ignore', 'pipe'] }));
  const codes = await Promise.all(runs.map(async (run) => {
    let stderr = '';
    run.stderr.on('data', (chunk) => { stderr += chunk; });
    const [code] = await once(run, 'exit');
    return { code, stderr: stderr.slice(0, 200) };
  }));
  const left = readdirSync(dir);
  outcomes.push({ round, exitCodes: codes.map((c) => c.code), stderr: codes.map((c) => c.stderr).filter(Boolean), left });
}
console.log(JSON.stringify({ deadPid: dead, outcomes }, null, 1));
