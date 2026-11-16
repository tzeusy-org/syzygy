// Round-3 reviewer probe (rev-509c). A stand-in for a live test worker: makes one fixture copy with the
// module's own ownedCopyPrefix(), records its pid, namespace reading and name, then stays alive, checking every
// 100 ms whether the copy still exists, until <stop-file> appears or 90 s pass.
// Usage: node holder.mjs <module.mjs> <dir> <out.json> <stop-file>
import { existsSync, mkdtempSync, readlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [modulePath, dir, out, stop] = process.argv.slice(2);
const { ownedCopyPrefix } = await import(modulePath);
const root = mkdtempSync(join(dir, ownedCopyPrefix()));
writeFileSync(join(root, 'README.md'), '# live holder\n');
let nsReading;
try { nsReading = readlinkSync('/proc/self/ns/pid'); } catch (error) { nsReading = `unreadable:${error.code}`; }
const record = { pid: process.pid, nsReading, name: root.slice(dir.length + 1), goneWhileAlive: false };
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
    record.existsAtStop = existsSync(root);
    writeFileSync(out, JSON.stringify(record));
  }
}, 100);
