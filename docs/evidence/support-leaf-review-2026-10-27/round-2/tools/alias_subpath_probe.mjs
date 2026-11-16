// Does the S10 proof's esbuild alias map send a subpath of an aliased package (`@syzygy/support/x`) anywhere it can
// resolve? Usage (cwd = a built clone): node <this> <clone> <tmpdir>. Bundles a two-line entry with the same alias form.
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';
const [clone, tmp] = process.argv.slice(2);
const { build } = createRequire(path.join(clone, 'package.json'))('esbuild');
const src = (r) => path.join(clone, r);
const results = {};
for (const [label, spec] of [['root', '@syzygy/support'], ['subpath', '@syzygy/support/x']]) {
  const entry = path.join(tmp, `entry-${label}.mjs`);
  fs.writeFileSync(entry, `import * as m from '${spec}';\nconsole.log(Object.keys(m));\n`);
  try {
    await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: path.join(tmp, `out-${label}.mjs`), logLevel: 'silent', absWorkingDir: clone,
      alias: { '@syzygy/support': src('packages/support/src/index.ts') } });
    results[label] = { built: true };
  } catch (e) {
    results[label] = { built: false, error: String(e.message).split('\n').slice(0, 2).join(' | ') };
  }
}
console.log(JSON.stringify(results, null, 1));
