// Import each dist module a named reader takes, from a built checkout given as argv[2]; print one line per module.
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const root = process.argv[2];
const rels = ['packages/polaris-dossier/dist/full-run.testkit.js', 'packages/polaris-dossier/dist/cli.js', 'packages/polaris-dossier/dist/git-object-reader.js',
  'packages/polaris-dossier/dist/clone-shape.js', 'packages/polaris-dossier/dist/init.js', 'apps/three-surface-poc/dist/polaris-generation/dossier-site.js',
  'packages/polaris-generation-core/dist/workspace-reach.testkit.js', 'packages/support/dist/purity.testkit.js'];
for (const rel of rels) {
  try { const m = await import(pathToFileURL(join(root, rel)).href); console.log('OK', rel, Object.keys(m).length); }
  catch (e) { console.log('FAIL', rel, e.code ?? e.name); }
}
const req = createRequire(join(root, 'packages/polaris-dossier/package.json'));
try { const m = await import(pathToFileURL(req.resolve('@syzygy/polaris-generation-consent/testing')).href); console.log('OK consent ./testing', req.resolve('@syzygy/polaris-generation-consent/testing').slice(root.length), Object.keys(m).sort().join(',')); }
catch (e) { console.log('FAIL consent ./testing', e.code ?? e.message); }
