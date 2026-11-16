// A live run's fixture directory, swept by a run in another PID namespace sharing the same TMPDIR.
// Usage: node ns_probe.mjs <private-dir under /tmp/r509-> <built helper path> <inner script>
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, helperPath, inner] = process.argv.slice(2);
if (!dir?.startsWith('/tmp/r509-')) throw new Error(`refusing ${dir}`);
const live = join(dir, `syzygy-poc-surface-fixture-p${process.pid}-LIVE01`);
mkdirSync(join(live, 'repo'), { recursive: true });
writeFileSync(join(live, 'repo', 'README.md'), '# in use by a live run\n');
const before = readdirSync(dir);
// Host namespace first: the same sweep keeps a live owner.
const { removeFixturesOfDeadProcesses } = await import(helperPath);
removeFixturesOfDeadProcesses(dir);
const keptBySameNamespace = existsSync(live);
const result = spawnSync('bwrap', ['--unshare-user', '--unshare-pid', '--dev-bind', '/', '/', '--proc', '/proc', '--',
  process.execPath, inner, dir, helperPath, String(process.pid)], { encoding: 'utf8', env: { ...process.env, TMPDIR: dir } });
const outerAlive = (() => { try { process.kill(process.pid, 0); return true; } catch { return false; } })();
console.log(JSON.stringify({
  outerPid: process.pid,
  before,
  keptBySameNamespaceSweep: keptBySameNamespace,
  bwrapStatus: result.status,
  bwrapStdout: result.stdout.trim(),
  bwrapStderr: result.stderr.trim().slice(0, 400),
  ownerStillAliveAfterInnerSweep: outerAlive,
  liveDirectoryAfterInnerSweep: existsSync(live) ? 'present' : 'REMOVED',
  after: readdirSync(dir),
}, null, 1));
rmSync(live, { recursive: true, force: true });
