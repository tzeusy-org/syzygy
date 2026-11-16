// Build the S10 no-egress driver bundle exactly as packages/polaris-dossier/src/no-egress.test.ts builds it, at base (its
// 10-entry alias map) or at head (`conditions: ['source']`), and print the bundle's sha256, size, the workspace modules it
// carries (esbuild's `// <path>` region comments) and whether any is a dist module or a poisoned one.
//
// Usage: node s10_bundle.mjs <checkout root> base|head|none <out file>   (none: neither, the X9 mutant)
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const [root, form, outfile] = process.argv.slice(2);
const { build } = createRequire(path.join(root, 'package.json'))('esbuild');
const src = (relative) => path.join(root, relative);
const resolution = form === 'base'
  ? { alias: {
      '@syzygy/polaris-generation-core/live': src('packages/polaris-generation-core/src/live.ts'),
      '@syzygy/polaris-generation-core': src('packages/polaris-generation-core/src/index.ts'),
      '@syzygy/polaris-generation-consent/live': src('packages/polaris-generation-consent/src/live.ts'),
      '@syzygy/polaris-generation-consent': src('packages/polaris-generation-consent/src/index.ts'),
      '@syzygy/polaris-dossier': src('packages/polaris-dossier/src/index.ts'),
      '@syzygy/cap1-core': src('packages/cap1-core/src/index.ts'),
      '@syzygy/cap1-daemon': src('packages/cap1-daemon/src/index.ts'),
      '@syzygy/http-host': src('packages/http-host/src/index.ts'),
      '@syzygy/three-surface-poc-core': src('packages/three-surface-poc-core/src/index.ts'),
      '@syzygy/support': src('packages/support/src/index.ts'),
    } }
  : form === 'none' ? {} : { conditions: ['source'] };
process.chdir(root);
await build({
  entryPoints: [path.join(root, 'packages/polaris-dossier/test-support/no-egress-driver.ts')],
  bundle: true, platform: 'node', format: 'esm', target: 'node22', outfile, logLevel: 'silent', absWorkingDir: root,
  banner: { js: 'import { createRequire as __createRequire } from \'node:module\'; const require = __createRequire(import.meta.url);' },
  ...resolution,
});
const bytes = readFileSync(outfile);
const regions = [...bytes.toString('utf8').matchAll(/^\/\/ ((?:packages|apps|node_modules)\/\S+)$/gmu)].map((m) => m[1]);
console.log(JSON.stringify({
  form, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, modules: regions.length,
  workspaceDistModules: regions.filter((r) => !r.startsWith('node_modules/') && r.includes('/dist/')), thirdPartyModules: regions.filter((r) => r.startsWith('node_modules/')).length, poisoned: bytes.includes('R549-POISONED'),
  workspaceModulesSha256: createHash('sha256').update(regions.join('\n')).digest('hex'),
}));
