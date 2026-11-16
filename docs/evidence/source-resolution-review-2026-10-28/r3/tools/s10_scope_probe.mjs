// R-GP-IMPL-SOURCE-RESOLUTION-3: build the S10 driver bundle as no-egress.test.ts does at the checkout (alias map derived through
// workspace-reach.testkit.ts's resolve, sourcesOnly copied from the test), report its sha256, and list every bundled input outside
// packages/*/src and apps/*/src. Then a second build whose stdin entry imports a workspace dist module by a relative path, under the
// same plugin, to see whether sourcesOnly refuses it.
// node s10_scope_probe.mjs <checkout> <tmpdir>
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const [root, tmp] = process.argv.slice(2);
const req = createRequire(path.join(root, 'package.json'));
const { build } = req('esbuild');
const SOURCE_ROOT = fs.realpathSync(root);
// The kit locates the checkout from its own URL, so its bundle sits beside its source (removed at the end).
const kit = path.join(root, 'packages/polaris-generation-core/src/.r549c-kit.mjs');
await build({ entryPoints: [path.join(root, 'packages/polaris-generation-core/src/workspace-reach.testkit.ts')], bundle: true, platform: 'node', format: 'esm', outfile: kit, logLevel: 'silent', absWorkingDir: root });
process.chdir(root); // the kit reads the workspace relative to the cwd or its own path; run from the root as vitest does
const { WORKSPACE, resolve } = await import(kit);
const aliases = {};
for (const manifest of WORKSPACE.manifests.values()) {
  if (manifest.dir === '.') continue;
  const subpaths = manifest.exports !== undefined ? Object.keys(manifest.exports) : manifest.main !== undefined ? ['.'] : [];
  for (const subpath of subpaths) {
    const specifier = subpath === '.' ? manifest.name : `${manifest.name}${subpath.slice(1)}`;
    const module = resolve(`${manifest.dir}/package.json`, specifier);
    if (typeof module !== 'string') throw new Error(`${specifier}: unresolvable`);
    aliases[specifier] = path.join(SOURCE_ROOT, module);
  }
}
const SOURCES_ONLY = 'resolving within the workspace sources';
const refused = [];
function sourcesOnly(r) {
  return { name: 'workspace-sources-only', setup(bundler) {
    bundler.onResolve({ filter: /^@syzygy\// }, async (args) => {
      if (args.pluginData === SOURCES_ONLY) return undefined;
      const resolved = await bundler.resolve(args.path, { kind: args.kind, importer: args.importer, resolveDir: args.resolveDir, pluginData: SOURCES_ONLY });
      if (resolved.errors.length > 0) return { errors: resolved.errors };
      const relative = path.relative(r, resolved.path).split(path.sep).join('/');
      if (resolved.external || !/^(?:packages|apps)\/[^/]+\/src\//u.test(relative)) {
        refused.push(args.path);
        return { errors: [{ text: `${args.path} resolves outside packages/*/src and apps/*/src: ${relative}` }] };
      }
      return { path: resolved.path, namespace: resolved.namespace, sideEffects: resolved.sideEffects };
    });
  } };
}
const outfile = path.join(tmp, 'driver.mjs');
const result = await build({
  entryPoints: [path.join(root, 'packages/polaris-dossier/test-support/no-egress-driver.ts')],
  bundle: true, platform: 'node', format: 'esm', target: 'node22', outfile, logLevel: 'silent', metafile: true, absWorkingDir: SOURCE_ROOT,
  banner: { js: 'import { createRequire as __createRequire } from \'node:module\'; const require = __createRequire(import.meta.url);' },
  alias: aliases, plugins: [sourcesOnly(SOURCE_ROOT)],
});
const bytes = fs.readFileSync(outfile);
console.log('aliases', Object.keys(aliases).length);
console.log('bundle sha256', createHash('sha256').update(bytes).digest('hex'), 'bytes', bytes.length);
const inputs = Object.keys(result.metafile.inputs);
const outside = inputs.filter((p) => !/^(?:packages|apps)\/[^/]+\/src\//u.test(p.split(path.sep).join('/')));
console.log('inputs', inputs.length, 'outside packages/*/src and apps/*/src', outside.length);
for (const p of outside) console.log('  outside:', p);
console.log('node_modules inputs', inputs.filter((p) => p.includes('node_modules/')).length);
// Probe 2: a relative import of a dist module (written to a scratch file inside a workspace dist dir so it exists).
const distDir = path.join(root, 'packages/support/dist');
const madeDist = !fs.existsSync(distDir);
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'probe-r549c.js'), 'export const probe = 1;\n');
try {
  const r2 = await build({ stdin: { contents: "import { probe } from './packages/support/dist/probe-r549c.js'; console.log(probe);", resolveDir: SOURCE_ROOT, loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent', absWorkingDir: SOURCE_ROOT, alias: aliases, plugins: [sourcesOnly(SOURCE_ROOT)], metafile: true });
  console.log('relative dist import: build succeeded, errors', r2.errors.length, 'inputs', Object.keys(r2.metafile.inputs).join(', '));
} catch (e) { console.log('relative dist import: refused', String(e.message).split('\n')[0]); }
finally { fs.rmSync(path.join(distDir, 'probe-r549c.js')); if (madeDist) fs.rmSync(distDir, { recursive: true }); }
console.log('sourcesOnly refusals recorded', refused.length);
fs.rmSync(kit);
