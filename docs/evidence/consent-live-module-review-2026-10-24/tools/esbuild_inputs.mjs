// Bundle the screen and the gate sources with no-egress.test.ts's alias map and list the consent and core inputs.
// Usage: node esbuild_inputs.mjs <tree>
import * as path from 'node:path';
import { createRequire } from 'node:module';

const tree = path.resolve(process.argv[2]);
const { build } = createRequire(path.join(tree, 'package.json'))('esbuild');
const src = relative => path.join(tree, relative);
import * as fs from 'node:fs';
const noEgress = fs.readFileSync(src('packages/polaris-dossier/src/no-egress.test.ts'), 'utf8');
const consentLive = noEgress.includes("'@syzygy/polaris-generation-consent/live':");
// Same keys, in the same order, as the tree's own no-egress.test.ts alias map.
const alias = {
  '@syzygy/polaris-generation-core/live': src('packages/polaris-generation-core/src/live.ts'),
  '@syzygy/polaris-generation-core': src('packages/polaris-generation-core/src/index.ts'),
  ...(consentLive ? { '@syzygy/polaris-generation-consent/live': src('packages/polaris-generation-consent/src/live.ts') } : {}),
  '@syzygy/polaris-generation-consent': src('packages/polaris-generation-consent/src/index.ts'),
  '@syzygy/polaris-dossier': src('packages/polaris-dossier/src/index.ts'),
  '@syzygy/cap1-core': src('packages/cap1-core/src/index.ts'),
  '@syzygy/cap1-daemon': src('packages/cap1-daemon/src/index.ts'),
  '@syzygy/three-surface-poc-core': src('packages/three-surface-poc-core/src/index.ts'),
};
for (const entry of ['packages/polaris-dossier/src/screen.ts', 'packages/polaris-dossier/src/gate-sources.ts']) {
  const result = await build({ entryPoints: [src(entry)], bundle: true, platform: 'node', format: 'esm', target: 'node22', write: false, metafile: true, logLevel: 'silent', alias, outdir: '/nonexistent-out' });
  const inputs = Object.keys(result.metafile.inputs).map(p => path.relative(tree, path.resolve(p)).split(path.sep).join('/'))
    .filter(p => p.includes('polaris-generation-consent/') || p.includes('polaris-generation-core/')).sort();
  console.log(`${entry}: ${inputs.length} consent/core inputs`);
  for (const p of inputs) console.log(`  ${p}`);
}
