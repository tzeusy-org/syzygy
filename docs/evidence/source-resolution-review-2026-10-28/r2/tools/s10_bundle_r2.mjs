// S10 driver bundle as no-egress.test.ts at a607bb62 and a1b9bde2 builds it (#545's bundleDriver): the alias map derived by that
// tree's own workspace-reach.testkit resolver from every manifest's exports, plus the workspace-sources-only check. The testkit is
// transpiled by esbuild with import.meta.url pinned to its real path, so ROOT is the tree. Prints the alias map (relative) and
// the bundle's sha256, bytes, and workspace regions.  Usage: node s10_bundle_r2.mjs <root> <scratch dir>
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [rootArg, scratch] = process.argv.slice(2);
const root = realpathSync(rootArg);
const { build } = createRequire(path.join(root, 'package.json'))('esbuild');
const kitPath = path.join(root, 'packages/polaris-generation-core/src/workspace-reach.testkit.ts');
const kitOut = path.join(scratch, `kit-${createHash('sha256').update(root).digest('hex').slice(0, 8)}.mjs`);
await build({ entryPoints: [kitPath], bundle: true, packages: 'external', platform: 'node', format: 'esm', outfile: kitOut, logLevel: 'silent',
  define: { 'import.meta.url': JSON.stringify(pathToFileURL(kitPath).href) }, absWorkingDir: root, nodePaths: [path.join(root, 'node_modules')] });
const { WORKSPACE, resolve } = await import(pathToFileURL(kitOut).href);
const aliases = {};
for (const manifest of WORKSPACE.manifests.values()) {
  if (manifest.dir === '.') continue;
  const subpaths = manifest.exports !== undefined ? Object.keys(manifest.exports) : manifest.main !== undefined ? ['.'] : [];
  for (const subpath of subpaths) {
    const specifier = subpath === '.' ? manifest.name : `${manifest.name}${subpath.slice(1)}`;
    const module = resolve(`${manifest.dir}/package.json`, specifier);
    if (typeof module !== 'string') throw new Error(`${specifier}: unreadable entry`);
    aliases[specifier] = path.join(root, module);
  }
}
const sourcesOnly = { name: 'workspace-sources-only', setup(b) { b.onResolve({ filter: /^@syzygy\// }, async (args) => {
  if (args.pluginData === 'S') return undefined;
  const r = await b.resolve(args.path, { kind: args.kind, importer: args.importer, resolveDir: args.resolveDir, pluginData: 'S' });
  if (r.errors.length > 0) return { errors: r.errors };
  const rel = path.relative(root, r.path).split(path.sep).join('/');
  if (r.external || !/^(?:packages|apps)\/[^/]+\/src\//u.test(rel)) return { errors: [{ text: `${args.path} outside src: ${rel}` }] };
  return { path: r.path, namespace: r.namespace, sideEffects: r.sideEffects }; }); } };
const outfile = path.join(scratch, `driver-${createHash('sha256').update(root).digest('hex').slice(0, 8)}.mjs`);
await build({ entryPoints: [path.join(root, 'packages/polaris-dossier/test-support/no-egress-driver.ts')], bundle: true, platform: 'node', format: 'esm',
  target: 'node22', outfile, logLevel: 'silent', absWorkingDir: root,
  banner: { js: 'import { createRequire as __createRequire } from \'node:module\'; const require = __createRequire(import.meta.url);' },
  alias: aliases, plugins: [sourcesOnly] });
const bytes = readFileSync(outfile);
const regions = [...bytes.toString('utf8').matchAll(/^\/\/ ((?:packages|apps|node_modules)\/\S+)$/gmu)].map((m) => m[1]);
console.log(JSON.stringify({ root: path.basename(root), aliases: Object.fromEntries(Object.entries(aliases).sort().map(([k, v]) => [k, path.relative(root, v)])),
  sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, regions: regions.length,
  workspaceDist: regions.filter((r) => !r.startsWith('node_modules/') && r.includes('/dist/')).length }));
