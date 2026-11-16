// rev-528: what Node itself resolves for four forms the review discusses. Builds throwaway packages under <dir> (which must not
// exist), resolves with import.meta.resolve from a module inside them, and prints one JSON line per probe.
// Usage: node node_probe.mjs <dir> <dossier package dir>
import { mkdirSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [dir, dossier] = process.argv.slice(2);
if (existsSync(dir)) throw new Error(`${dir} exists`);
const pkg = (name, manifest, files) => {
  const root = join(dir, name);
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify(manifest));
  for (const [file, text] of Object.entries(files)) writeFileSync(join(root, file), text);
  return root;
};
const probe = async (label, from, specifier) => {
  const probeFile = join(from, `probe-${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(probeFile, `export const r = (s) => import.meta.resolve(s);\n`);
  const { r } = await import(pathToFileURL(probeFile).href);
  try { console.log(JSON.stringify({ label, specifier, resolved: r(specifier) })); }
  catch (error) { console.log(JSON.stringify({ label, specifier, error: error.code ?? String(error) })); }
};
const conds = pkg('node_modules/conds', { name: 'conds', type: 'module', exports: { '.': { 'module-sync': './sync.js', import: './import.js' } } },
  { 'sync.js': '', 'import.js': '' });
const app = pkg('app', { name: 'app', type: 'module', imports: { '#up': '../outside.js', '#pat/*': './lib/*.js' } }, {});
mkdirSync(join(app, 'lib'));
writeFileSync(join(app, 'lib', 'x.js'), '');
writeFileSync(join(dir, 'outside.js'), '');
mkdirSync(join(app, 'node_modules'));
symlinkSync(dossier, join(app, 'node_modules', 'dossier'));
await probe('module-sync ahead of import', app, 'conds');
await probe('an imports target that starts with ../', app, '#up');
await probe('an imports subpath pattern', app, '#pat/x');
await probe('a dependency alias to the dossier package', app, 'dossier');
console.log(JSON.stringify({ node: process.version }));
