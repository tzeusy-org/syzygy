// syzygy-bpyt.8.39: classify every version form the testkit comment and the resolver rows name with npm's own npm-package-arg, beside
// the tree's LOCAL_VERSION pattern, read from the tree's testkit rather than copied. syzygy-bpyt.8.38's npa_probe.cjs, with the forms
// this bead's comment and rows add, and for an `npm:` alias the type of the spec after `npm:` (N4: npm accepts only a registry spec).
// The rows include the two the review of 8.39 added (N1). What npm installs for an alias is npm_alias_probe.py's, not this probe's.
// Usage: node npa_probe.cjs <tree>
const fs = require('node:fs');
const path = require('node:path');
const tree = process.argv[2];
const npaDir = path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'node_modules', 'npm-package-arg');
const npa = require(npaDir);
const kit = fs.readFileSync(path.join(tree, 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'), 'utf8');
const line = kit.split('\n').filter((text) => text.startsWith('const LOCAL_VERSION = '));
if (line.length !== 1) throw new Error(`LOCAL_VERSION lines: ${line.length}`);
const literal = /^const LOCAL_VERSION = \/(.*)\/([a-z]*);$/u.exec(line[0]);
const LOCAL_VERSION = new RegExp(literal[1], literal[2]);
const forms = {
  comment: ['file:../x', '.', '..', './x', '../x', '/x', '~/x', 'x.tgz', 'x.tar', 'x.tar.gz', 'link:../x', 'workspace:*', 'npm:@syzygy/lib@*',
    'https://example.com/x.tgz', 'packages/polaris-dossier/', '.hidden-lib', 'a/b/c',
    'npm:typescript@^5.5.0', 'npm:./lib', 'npm:file:../lib', 'github:someone/dossier#v1.tar', 'git+https://example.com/lib.tgz', 'http://example.com/x.tgz'],
  rows: ['file:../../packages/lib', 'FILE:../../packages/lib', 'link:../../packages/lib', 'workspace:*', 'npm:@syzygy/lib@*', '../../packages/lib',
    '~/lib', '/srv/lib', 'lib-0.0.0.tgz', './lib', '.', 'lib-0.0.0.tar', 'lib-0.0.0.tar.gz', 'https://example.com/lib-1.0.0.tgz', 'file:../../apps/app',
    '2.9.0', '^1.0.0', 'github:someone/dossier', '~1.2.3', 'git+https://example.com/lib.tgz.git',
    'http://example.com/lib-1.0.0.tar.gz', 'npm:typescript@^5.5.0', '..', 'github:someone/dossier#v1.tar', 'npm:typescript'],
};
const classify = (spec) => {
  let type;
  let aliasOf;
  try {
    const parsed = npa.resolve('dossier', spec, '/srv/ws/apps/app');
    type = parsed.type;
    if (parsed.type === 'alias') aliasOf = parsed.subSpec.type;
  } catch (error) { type = `throws ${error.code ?? error.message}`; }
  return { spec, npa: type, ...(aliasOf === undefined ? {} : { aliasOf }), local: LOCAL_VERSION.test(spec) };
};
console.log(JSON.stringify({
  node: process.version,
  npaVersion: JSON.parse(fs.readFileSync(path.join(npaDir, 'package.json'), 'utf8')).version,
  pattern: line[0],
  comment: forms.comment.map(classify),
  rows: forms.rows.map(classify),
}, null, 1));
