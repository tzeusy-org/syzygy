"""rev-536: this reviewer's own mutants against the 8.38 rows and the testkit comment's claims, in mut.py's spec format.

Usage: python3 -I rev_specs.py <tree> <out.json>. Each `old` is checked to occur exactly once in its file in <tree>.
"""
import json, os, sys

tree, out = sys.argv[1:3]
KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
ARGV = 'packages/polaris-dossier/src/argv.test.ts'
GUARDS = {'projects': ['@syzygy/polaris-generation-core', '@syzygy/polaris-dossier'],
          'files': ['packages/polaris-generation-core/src/workspace-reach.test.ts', 'packages/polaris-generation-core/src/island-boundary.test.ts',
                    'packages/polaris-dossier/src/subpath-imports.test.ts', ARGV]}
LOCAL = "const LOCAL_VERSION = /^(?:file:|link:|workspace:|npm:|\\.\\.?(?:\\/|$)|\\/|~\\/)|\\.(?:tgz|tar|tar\\.gz)$/iu;"
TARBALL = '|\\.(?:tgz|tar|tar\\.gz)$'
assert LOCAL.count(TARBALL) == 1


def spec(id, what, file, old, new):
    return {'id': id, 'what': what, **GUARDS, 'edits': [{'file': file, 'old': old, 'new': new}]}


def local(id, what, old, new):
    assert LOCAL.count(old) == 1, id
    return spec(id, what, KIT, LOCAL, LOCAL.replace(old, new))


MUTANTS = [
    local('RV536-M1-https-url-reads-outside', 'the tarball arm skips an https: URL, so an https tarball URL reads as outside',
          TARBALL, '|^(?!https:).*\\.(?:tgz|tar|tar\\.gz)$'),
    local('RV536-M2-http-url-reads-outside', 'the tarball arm skips an http: URL only; https: URLs stay refused',
          TARBALL, '|^(?!http:).*\\.(?:tgz|tar|tar\\.gz)$'),
    local('RV536-M3-tarball-needs-dot-slash', 'the tarball arm matches only a name with a leading ./',
          TARBALL, '|^\\.\\/.*\\.(?:tgz|tar|tar\\.gz)$'),
    spec('RV536-M4-census-takes-ts-md', 'the census extension test also takes a .ts.md name', ARGV,
         'files.filter((module) => /\\.[cm]?tsx?$/u.test(module)', 'files.filter((module) => /\\.[cm]?tsx?(?:\\.md)?$/u.test(module)'),
    spec('RV536-M5-tree-depth-two', 'treeFiles() keeps only paths at most two segments under src', ARGV,
         "fs.readdirSync(path.join(ROOT, dir), { recursive: true, encoding: 'utf8' }).map(",
         "fs.readdirSync(path.join(ROOT, dir), { recursive: true, encoding: 'utf8' }).filter((file) => file.split('/').length <= 2).map("),
    spec('RV536-M6-root-keeps-only-dependencies', "the root entry keeps its name and dependencies only", KIT,
         "manifests.set(root.name, { dir: '.', ...root });", "manifests.set(root.name, { dir: '.', name: root.name, dependencies: root.dependencies });"),
    local('RV536-M7-npm-alias-workspace-scope-only', 'the npm: arm refuses an alias of an @syzygy/ package only, so a registry alias reads as outside',
          'npm:|', 'npm:@syzygy\\/|'),
    spec('RV536-M8-root-declarations-unread', "localNames skips the workspace root's manifest", KIT,
         '  for (const manifest of workspace.manifests.values()) {',
         "  for (const manifest of [...workspace.manifests.values()].filter((manifest) => manifest.dir !== '.')) {"),
    local('RV536-M9-dotdot-alone-outside', '`..` alone reads as outside; `.`, `./x` and `../x` stay local',
          '\\.\\.?(?:\\/|$)', '\\.(?:\\/|$)|\\.\\.\\/'),
    spec('RV536-M10-test-exclusion-end-anchor-dropped', "the census test exclusion's $ dropped", ARGV,
         '!/\\.test\\.[cm]?tsx?$/u.test(module)', '!/\\.test\\.[cm]?tsx?/u.test(module)'),
    local('RV536-M11-residual-widened', 'the N3 residual refused: any slashed version with no colon, or any leading dot',
          '|\\/|~\\/)', '|\\/|~\\/|\\.|[^:]*\\/)'),
]

for m in MUTANTS:
    for e in m['edits']:
        text = open(os.path.join(tree, e['file'])).read()
        assert text.count(e['old']) == 1, (m['id'], e['file'], text.count(e['old']))
        assert e['old'] != e['new'], m['id']
assert len({m['id'] for m in MUTANTS}) == len(MUTANTS)
json.dump({'what': 'rev-536 own mutants', 'mutants': MUTANTS}, open(out, 'w'), indent=1)
print(len(MUTANTS), 'mutants')
for m in MUTANTS:
    print(m['id'], '|', m['edits'][0]['new'][:150])
