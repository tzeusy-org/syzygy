// Preload (node --import) for the reviewer's fresh run: logs every readdirSync of exactly the
// run's TMPDIR, with the calling pid, its parent and its argv, to $R509B_SWEEP_LOG. It changes no
// behaviour: the original readdirSync is always called and its result returned.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';

const original = fs.readdirSync;
const target = (process.env.TMPDIR ?? '').replace(/\/+$/, '');
const log = process.env.R509B_SWEEP_LOG;
fs.readdirSync = function readdirSync(path, ...rest) {
  try {
    if (log && target && typeof path === 'string' && path.replace(/\/+$/, '') === target) {
      fs.appendFileSync(log, `${JSON.stringify({ pid: process.pid, ppid: process.ppid, argv: process.argv.slice(1, 4), at: new Date().toISOString() })}\n`);
    }
  } catch {
    // logging never changes the call
  }
  return original.call(this, path, ...rest);
};
syncBuiltinESMExports();
