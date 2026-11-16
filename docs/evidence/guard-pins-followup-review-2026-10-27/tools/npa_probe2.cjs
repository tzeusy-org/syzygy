// rev-536: forms beyond the lane's probe, classified by the npm-package-arg bundled with this node's npm, beside the tree's
// LOCAL_VERSION, taken from the testkit by evaluating the literal on its `const LOCAL_VERSION =` line.
// Usage: node npa_probe2.cjs <tree>
const fs = require('node:fs');
const path = require('node:path');
const tree = process.argv[2];
const npaDir = path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'node_modules', 'npm-package-arg');
const npa = require(npaDir);
const kit = fs.readFileSync(path.join(tree, 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'), 'utf8');
const lines = kit.split('\n').filter((text) => /^const LOCAL_VERSION =/u.test(text));
if (lines.length !== 1) throw new Error(`LOCAL_VERSION lines: ${lines.length}`);
const LOCAL_VERSION = new Function(`return ${lines[0].replace(/^const LOCAL_VERSION =/u, '').replace(/;$/u, '')}`)();
const forms = ['git+https://example.com/lib.tgz', 'git+ssh://git@example.com/lib.tar', 'someone/dossier.tgz', 'github:someone/dossier#v1.tar',
  'http://example.com/lib.tar.gz', 'https://example.com/lib', 'https://github.com/someone/dossier/archive/v1.0.0.tar.gz',
  'npm:typescript@^5.5.0', 'npm:@syzygy/lib@*', 'FILE:../x', 'file:x.tgz', 'git+file:../../packages/lib', '..', 'C:/lib', '.\\lib', '~', '~lib',
  'lib.TGZ', 'lib.tarXgz', 'x.tar.bz2', 'packages/polaris-dossier', 'lib/'];
const rows = forms.map((spec) => {
  let type;
  let sub;
  try {
    const result = npa.resolve('dossier', spec, '/srv/ws/apps/app');
    type = result.type;
    if (result.subSpec) sub = `${result.subSpec.type} ${result.subSpec.name}`;
  } catch (error) { type = `throws ${error.code ?? error.message}`; }
  return { spec, npa: type, ...(sub ? { subSpec: sub } : {}), local: LOCAL_VERSION.test(spec) };
});
console.log(JSON.stringify({ node: process.version, npaVersion: JSON.parse(fs.readFileSync(path.join(npaDir, 'package.json'), 'utf8')).version,
  pattern: String(LOCAL_VERSION), rows }, null, 1));
