// rev-531: classify dependency version forms with npm's own npm-package-arg, beside the PR's LOCAL_VERSION pattern.
const path = require('node:path');
const npa = require(path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'node_modules', 'npm-package-arg'));
const LOCAL_VERSION = /^(?:file:|link:|workspace:|npm:|\.\.?(?:\/|$)|\/|~\/)|\.(?:tgz|tar|tar\.gz)$/iu;
const forms = ['file:../x', 'FILE:../x', 'link:../x', 'workspace:*', 'npm:@syzygy/lib@*', 'npm:typescript@5.9.2',
  '../x', './x', '.', '..', '/x', '~/x', 'x.tgz', 'x.tar', 'x.tar.gz', 'X.TGZ',
  'https://example.com/x.tgz', 'http://example.com/x.tar.gz', 'git+https://example.com/x.git', 'github:someone/dossier',
  'someone/dossier', 'git+file:///srv/x', '.hidden', '.hidden/x', 'C:/x', 'c:\\x', 'a/b/c', '2.9.0', '^1.0.0', 'latest', '*', '', '~1.2.3'];
const rows = forms.map((spec) => {
  let type;
  try { type = npa.resolve('dossier', spec, '/srv/ws/apps/app').type; } catch (error) { type = `throws ${error.code ?? error.message}`; }
  return { spec, npa: type, prLocal: LOCAL_VERSION.test(spec) };
});
console.log(JSON.stringify({ node: process.version, npaVersion: require(path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'node_modules', 'npm-package-arg', 'package.json')).version, rows }, null, 1));
