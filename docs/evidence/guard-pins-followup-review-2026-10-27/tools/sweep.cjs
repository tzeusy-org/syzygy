// rev-536: the faithful-tree sweep. Every manifest the testkit reads (the root, and apps/*/package.json and packages/*/package.json
// on disk), each dependency field, each version: the tree's LOCAL_VERSION, and npm-package-arg's type (directory and file are the
// local types). Also counts every tracked package.json anywhere, as a wider population.
// Usage: node sweep.cjs <tree>
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const tree = process.argv[2];
const npa = require(path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'node_modules', 'npm-package-arg'));
const kit = fs.readFileSync(path.join(tree, 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'), 'utf8');
const lines = kit.split('\n').filter((text) => /^const LOCAL_VERSION =/u.test(text));
const LOCAL_VERSION = new Function(`return ${lines[0].replace(/^const LOCAL_VERSION =/u, '').replace(/;$/u, '')}`)();
const manifests = ['package.json'];
for (const parent of ['apps', 'packages']) {
  for (const name of fs.readdirSync(path.join(tree, parent))) {
    if (fs.existsSync(path.join(tree, parent, name, 'package.json'))) manifests.push(`${parent}/${name}/package.json`);
  }
}
const FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const versions = [];
for (const manifest of manifests) {
  const json = JSON.parse(fs.readFileSync(path.join(tree, manifest), 'utf8'));
  for (const field of FIELDS) {
    for (const [name, version] of Object.entries(json[field] ?? {})) {
      let type;
      try { type = npa.resolve(name, version, path.join(tree, path.dirname(manifest))).type; } catch (error) { type = `throws ${error.code}`; }
      versions.push({ manifest, field, name, version, npa: type, local: LOCAL_VERSION.test(version) });
    }
  }
}
const tracked = execFileSync('git', ['-C', tree, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter((p) => p === 'package.json' || p.endsWith('/package.json'));
const byField = Object.fromEntries(FIELDS.map((field) => [field, versions.filter((v) => v.field === field).length]));
const byType = {};
for (const v of versions) byType[v.npa] = (byType[v.npa] ?? 0) + 1;
console.log(JSON.stringify({
  head: execFileSync('git', ['-C', tree, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  pattern: String(LOCAL_VERSION), manifests: manifests.length, manifestList: manifests, trackedPackageJson: tracked.length,
  trackedOutsideTestkitPopulation: tracked.filter((p) => !manifests.includes(p)),
  versions: versions.length, byField, byNpaType: byType,
  matchLocalPattern: versions.filter((v) => v.local), npaDirectoryOrFile: versions.filter((v) => v.npa === 'directory' || v.npa === 'file'),
  disagreements: versions.filter((v) => v.local !== (v.npa === 'directory' || v.npa === 'file')),
  versionList: versions.map((v) => `${v.manifest} ${v.field} ${v.name}@${v.version} ${v.npa}`),
}, null, 1));
