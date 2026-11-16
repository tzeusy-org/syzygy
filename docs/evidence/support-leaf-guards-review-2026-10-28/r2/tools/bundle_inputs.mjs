// The S10 driver bundle's input files, by esbuild's metafile, under the oracle row's literal alias map (which the test pins equal
// to the derived map), with the same entry and options as bundleDriver. Lists the workspace inputs and which of them a given
// list of changed paths names.
// Usage: node bundle_inputs.mjs <clone> <changed-paths.txt> <out.json>
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';

const [clone, changedFile, out] = process.argv.slice(2);
const root = fs.realpathSync(clone);
const require = createRequire(path.join(root, 'package.json'));
const { build } = require('esbuild');
const test = fs.readFileSync(path.join(root, 'packages/polaris-dossier/src/no-egress.test.ts'), 'utf8');
const block = test.slice(test.indexOf('expect(relative).toEqual({'), test.indexOf('});', test.indexOf('expect(relative).toEqual({')));
const alias = Object.fromEntries([...block.matchAll(/^\s*'(@syzygy\/[^']+)': '([^']+)',$/gmu)].map((m) => [m[1], path.join(root, m[2])]));
const result = await build({
  entryPoints: [path.join(root, 'packages/polaris-dossier/test-support/no-egress-driver.ts')],
  bundle: true, platform: 'node', format: 'esm', target: 'node22', write: false, outfile: path.join(root, 'driver.mjs'), logLevel: 'silent',
  banner: { js: 'import { createRequire as __createRequire } from \'node:module\'; const require = __createRequire(import.meta.url);' },
  alias, metafile: true, absWorkingDir: root,
});
const inputs = Object.keys(result.metafile.inputs).sort();
const workspace = inputs.filter((p) => /^(?:packages|apps)\//u.test(p));
const changed = fs.readFileSync(changedFile, 'utf8').split('\n').filter(Boolean);
const hit = workspace.filter((p) => changed.includes(p));
fs.writeFileSync(out, JSON.stringify({ aliasEntries: Object.keys(alias).length, inputs: inputs.length, workspaceInputs: workspace.length,
  nodeModulesInputs: inputs.filter((p) => p.startsWith('node_modules/')).length, changedPaths: changed.length, changedWorkspaceInputs: hit, workspace }, null, 1));
console.log(JSON.stringify({ aliasEntries: Object.keys(alias).length, inputs: inputs.length, workspaceInputs: workspace.length, changedWorkspaceInputs: hit }));
