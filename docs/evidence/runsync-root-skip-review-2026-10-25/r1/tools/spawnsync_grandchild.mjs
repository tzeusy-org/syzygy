// rev-525: does spawnSync's timeout + SIGKILL bound a child whose own child holds the stdio pipes, and what survives?
// usage: node spawnsync_grandchild.mjs
// Case A: the child itself hangs (the daemon's shape: no children). Case B: the child spawns `sleep 12` with inherited stdio, then
// hangs. Prints elapsed time, error code and whether the grandchild is still alive afterwards; kills the grandchild by its own pid.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const opts = { encoding: 'utf8', timeout: 2000, killSignal: 'SIGKILL' };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
for (const [name, code] of [
  ['A child hangs', 'setInterval(() => {}, 1000);'],
  ['B grandchild holds pipes', "const c = require('node:child_process').spawn('sleep', ['12'], { stdio: 'inherit' }); console.log('grandchild ' + c.pid); setInterval(() => {}, 1000);"],
]) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, ['-e', code], opts);
  const elapsed = Date.now() - t0;
  const pid = Number(/grandchild (\d+)/.exec(r.stdout ?? '')?.[1]);
  const left = Number.isInteger(pid) && alive(pid);
  const cmd = left ? readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ').trim() : '';
  console.log(`${name}: elapsed ${elapsed} ms, error ${r.error?.code ?? 'none'}, signal ${r.signal}, grandchild ${Number.isInteger(pid) ? pid : '-'} alive after: ${left} ${cmd}`);
  if (left && cmd === 'sleep 12') process.kill(pid, 'SIGKILL');
}
