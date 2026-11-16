// A stand-in for a live test worker: makes one fixture copy with the reviewed naming
// function, writes its pid, namespace reading and name to a JSON file, then stays alive,
// checking every 100 ms whether its directory still exists, until a stop file appears or
// 90 s pass. Usage: node holder.mjs <module> <dir> <out.json> <stop-file>
import { existsSync, mkdtempSync, readlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [modulePath, dir, out, stop] = process.argv.slice(2);
const { ownedCopyPrefix } = await import(modulePath);
const root = mkdtempSync(join(dir, ownedCopyPrefix()));
writeFileSync(join(root, 'README.md'), '# live\n');
let ns;
try { ns = readlinkSync('/proc/self/ns/pid'); } catch (error) { ns = `unreadable:${error.code}`; }
const record = { pid: process.pid, nsReading: ns, name: root.slice(dir.length + 1), goneWhileAlive: false };
writeFileSync(out, JSON.stringify(record));
const started = Date.now();
const timer = setInterval(() => {
  if (!record.goneWhileAlive && !existsSync(root)) {
    record.goneWhileAlive = true;
    record.goneAfterMs = Date.now() - started;
    writeFileSync(out, JSON.stringify(record));
  }
  if (existsSync(stop) || Date.now() - started > 90_000) {
    clearInterval(timer);
    record.stoppedAfterMs = Date.now() - started;
    writeFileSync(out, JSON.stringify(record));
  }
}, 100);
