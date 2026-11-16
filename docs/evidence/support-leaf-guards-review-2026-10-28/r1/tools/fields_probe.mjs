// Does a package.json `main`, `module`, `browser` or `imports` field beside a pinned `exports` change what Node or esbuild loads?
// Usage: node fields_probe.mjs <clone with esbuild> <empty scratch dir>
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const [clone, dir] = process.argv.slice(2);
const esbuild = createRequire(join(clone, 'package.json'))('esbuild');
const pkg = join(dir, 'node_modules', 'pkg');
mkdirSync(pkg, { recursive: true });
writeFileSync(join(pkg, 'package.json'), JSON.stringify({
  name: 'pkg', type: 'module',
  exports: { '.': { types: './a.d.ts', import: './a.js', default: './a.js' } },
  main: './b.js', module: './c.js', browser: { './a.js': './d.js' }, imports: { '#x': './e.js' },
}));
for (const name of ['a', 'b', 'c', 'd', 'e']) writeFileSync(join(pkg, `${name}.js`), `export const which = '${name}';\n`);
writeFileSync(join(dir, 'entry.mjs'), "import { which } from 'pkg';\nconsole.log(which);\n");

const node = execFileSync(process.execPath, [join(dir, 'entry.mjs')], { encoding: 'utf8' }).trim();
const bundled = {};
for (const platform of ['node', 'neutral', 'browser']) {
  const out = await esbuild.build({ entryPoints: [join(dir, 'entry.mjs')], bundle: true, write: false, format: 'esm', platform, logLevel: 'silent' });
  bundled[platform] = /which = "([a-e])"/.exec(out.outputFiles[0].text)?.[1];
}
console.log(JSON.stringify({ node: process.version, esbuild: esbuild.version, nodeLoads: node, esbuildBundles: bundled }));
