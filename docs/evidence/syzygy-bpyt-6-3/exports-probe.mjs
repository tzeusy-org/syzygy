// Public-interface probe for syzygy-bpyt.6.3: the exported names of every workspace package entry point.
// Usage: node exports-probe.mjs <built clone> <out.json>   (the clone is built with `npm run build`)
// Reads each packages/*/package.json `exports` map (a string or a map of import conditions), imports every
// `import` target from the clone's own dist, and records the sorted export names and their typeof. Run at the
// base and the head and compare: a changed entry means a package's public interface moved.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [root, out] = process.argv.slice(2);
const entries = [];
for (const dir of readdirSync(join(root, 'packages')).sort()) {
  const manifestPath = join(root, 'packages', dir, 'package.json');
  if (!existsSync(manifestPath)) continue;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const map = typeof manifest.exports === 'string' ? { '.': manifest.exports } : manifest.exports ?? {};
  for (const [subpath, target] of Object.entries(map)) {
    const file = typeof target === 'string' ? target : target.import ?? target.default;
    if (typeof file === 'string') entries.push({ name: manifest.name, subpath, file: join('packages', dir, file) });
  }
}
const result = [];
for (const entry of entries) {
  try {
    const mod = await import(pathToFileURL(join(root, entry.file)).href);
    result.push({ package: entry.name, subpath: entry.subpath, names: Object.keys(mod).sort().map((k) => `${k}:${typeof mod[k]}`) });
  } catch (error) {
    result.push({ package: entry.name, subpath: entry.subpath, error: String(error.message).slice(0, 200) });
  }
}
writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
console.log(`entries ${result.length} names ${result.reduce((n, e) => n + (e.names?.length ?? 0), 0)} errors ${result.filter((e) => e.error).length}`);
