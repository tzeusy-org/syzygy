// rev-541: forms of my own against the new N3 and N4 sentences, under npm's bundled npm-package-arg, beside the pattern read
// from the given testkit (the literal on its one `const LOCAL_VERSION = ` line, compiled with its own flags).
// Usage: node npa_probe3.cjs <testkit.ts>
const fs = require('node:fs');
const path = require('node:path');
const npaDir = path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'node_modules', 'npm-package-arg');
const npa = require(npaDir);
const lines = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter((line) => line.startsWith('const LOCAL_VERSION = '));
if (lines.length !== 1) throw new Error(`LOCAL_VERSION lines: ${lines.length}`);
const [, source, flags] = /^const LOCAL_VERSION = \/(.*)\/([a-z]*);$/u.exec(lines[0]);
const pattern = new RegExp(source, flags);
const groups = {
  // N3: "a git spec whose text ends in a tarball extension (`github:someone/dossier#v1.tar`), which npm types as `git`"
  n3: ['github:someone/dossier#v1.tgz', 'github:someone/dossier#v1.tar.gz', 'gitlab:someone/dossier#release.tar',
    'bitbucket:someone/dossier.tgz', 'git://example.com/lib.tar.gz', 'git+ssh://git@example.com/lib.git#v1.tgz',
    'https://github.com/someone/dossier.git#v1.tgz', 'someone/dossier#V1.TAR', 'git+file:../../packages/lib.tgz'],
  // the other tarball-arm sentence: "a tarball URL (`https://…/x.tgz`), which npm types as `remote`"
  remote: ['https://example.com/lib.TGZ', 'http://example.com/a/b/lib-1.0.0.tar', 'HTTPS://example.com/lib.tgz'],
  // N4: "npm installs it from the registry (npm-package-arg 12.0.2 accepts only a registry spec after `npm:`)"
  n4: ['npm:@scope/lib@^1.0.0', 'npm:@syzygy/polaris-dossier', 'npm:lodash', 'npm:lodash@1.2.3', 'npm:lodash@next',
    'npm:github:someone/dossier', 'npm:git+https://example.com/lib.git', 'npm:https://example.com/lib.tgz', 'npm:/srv/lib',
    'npm:lib@workspace:*', 'npm:lib@file:../x', 'npm:npm:lodash@1', 'NPM:lodash@1', 'npm:lib.tgz'],
};
const classify = (spec) => {
  const row = { spec, local: pattern.test(spec) };
  try {
    const parsed = npa.resolve('dossier', spec, '/srv/ws/apps/app');
    row.npa = parsed.type;
    row.name = parsed.name;
    if (parsed.type === 'alias') Object.assign(row, { subType: parsed.subSpec.type, subName: parsed.subSpec.name, subRegistry: parsed.subSpec.registry });
  } catch (error) { row.npa = `throws ${error.code ?? error.message}`; }
  return row;
};
const out = { node: process.version, npaVersion: JSON.parse(fs.readFileSync(path.join(npaDir, 'package.json'), 'utf8')).version, pattern: lines[0] };
for (const [group, specs] of Object.entries(groups)) out[group] = specs.map(classify);
console.log(JSON.stringify(out, null, 1));
