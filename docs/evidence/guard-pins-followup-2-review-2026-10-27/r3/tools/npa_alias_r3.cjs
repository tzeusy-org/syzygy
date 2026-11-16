// rev-541c: npm-package-arg's reading of further `npm:` forms (is only a registry spec accepted after `npm:`?).
// Usage: node npa_alias_r3.cjs <npm dir>
const npa = require(require('node:path').join(process.argv[2], 'node_modules', 'npm-package-arg'));
const forms = ['npm:typescript@latest', 'npm:@scope/x@1.2.3', 'npm:typescript@', 'npm:typescript@x', 'npm:github:someone/x', 'npm:https://example.com/x.tgz',
  'npm:git+https://example.com/x.git', 'npm:./w', 'npm:x.tgz', 'npm:workspace:*', 'npm:link:../w', 'npm:npm:typescript@1'];
const out = forms.map((f) => { try { const r = npa.resolve('wlib', f); return [f, r.type, r.subSpec && r.subSpec.type, r.subSpec && r.subSpec.fetchSpec]; }
  catch (e) { return [f, 'throws', e.code || null, e.message.split('\n')[0]]; } });
console.log(JSON.stringify({ npa: require(require('node:path').join(process.argv[2], 'node_modules', 'npm-package-arg', 'package.json')).version, out }, null, 1));
