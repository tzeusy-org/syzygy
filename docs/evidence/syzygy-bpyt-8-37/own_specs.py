"""syzygy-bpyt.8.37: one mutant per predicate this bead adds, and tree forms of N2 and N3 beside the PR 528 reviewer's RV-T18 and RV-C6.

Usage: python3 -I own_specs.py <tree> <out.json>. Each `old` is checked to occur exactly once in its file in <tree>.
Run with the PR 524 reviewer's mut.py (docs/evidence/argv-guards-review-2026-10-25/tools/mut.py).
"""
import json, os, sys

tree, out = sys.argv[1:3]
KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
ARGV = 'packages/polaris-dossier/src/argv.test.ts'
GUARDS = {'projects': ['@syzygy/polaris-generation-core', '@syzygy/polaris-dossier'],
          'files': ['packages/polaris-generation-core/src/workspace-reach.test.ts', 'packages/polaris-generation-core/src/island-boundary.test.ts',
                    'packages/polaris-dossier/src/subpath-imports.test.ts']}
CENSUS = {'projects': ['@syzygy/polaris-dossier'], 'files': [ARGV]}
DAEMON = {'projects': ['@syzygy/polaris-dossier'], 'files': ['packages/polaris-dossier/src/subpath-imports.test.ts']}
ISLAND = {'projects': ['@syzygy/polaris-generation-core'], 'files': ['packages/polaris-generation-core/src/island-boundary.test.ts']}
CHECK = "  if (named === null) return localNames(workspace).has(/^(?:@[^/]+\\/)?[^/]+/u.exec(specifier)![0]) ? undefined : null;\n"
FIELDS = '[manifest.dependencies, manifest.devDependencies, manifest.optionalDependencies, manifest.peerDependencies]'
LOCAL = "/^(?:file:|link:|workspace:|npm:|\\.\\.?(?:\\/|$)|\\/|~\\/)|\\.(?:tgz|tar|tar\\.gz)$/iu"
POPULATION = "files.filter((module) => /\\.[cm]?tsx?$/u.test(module) && !/\\.test\\.[cm]?tsx?$/u.test(module))"
MAIN_IMPORT = "import { resolvePathIntent } from '@syzygy/polaris-dossier/state-directory';\n"
READER = "import { readArgv } from './argv.js';\nexport const readDrift = (args: string[]) => readArgv(args, { valued: ['--drift'], dashValue: 'take', repeat: 'last', positionals: true });\n"


def kit(id, what, old, new):
    return {'id': id, 'what': what, **GUARDS, 'edits': [{'file': KIT, 'old': old, 'new': new}]}


def census(id, what, old, new):
    return {'id': id, 'what': what, **CENSUS, 'edits': [{'file': ARGV, 'old': old, 'new': new}]}


def alias(id, what, manifest, version, importer, specifier, scope=DAEMON, field='dependencies'):
    anchor = f'  "{field}": {{\n'
    return {'id': id, 'what': what, **scope, 'edits': [
        {'file': manifest, 'old': anchor, 'new': f'{anchor}    "{specifier.split("/")[0]}": "{version}",\n'},
        importer]}


def drop(alternative):
    assert LOCAL.count(alternative) == 1, alternative
    return LOCAL.replace(alternative, '').replace('(?:|', '(?:').replace('||', '|').replace('|)', ')')


MUTANTS = [
    kit('L1-local-check-dropped', 'a bare name any manifest declares locally reads as outside again', CHECK, '  if (named === null) return null;\n'),
    kit('L2-whole-specifier-compared', 'the census compares the whole specifier, not its package name', CHECK,
        CHECK.replace('/^(?:@[^/]+\\/)?[^/]+/u.exec(specifier)![0]', 'specifier')),
    kit('L3-scope-ignored', "a scoped name's package name is taken as its scope alone", CHECK, CHECK.replace('/^(?:@[^/]+\\/)?[^/]+/u', '/^[^/]+/u')),
    kit('L4-prefix-match', 'a specifier counts when it starts with a local name', CHECK,
        "  if (named === null) return [...localNames(workspace)].some((name) => specifier.startsWith(name)) ? undefined : null;\n"),
    kit('L5-first-manifest-only', "only the first manifest's dependencies are read",
        '  for (const manifest of workspace.manifests.values()) {\n', '  for (const manifest of [...workspace.manifests.values()].slice(0, 1)) {\n'),
    kit('L6-dependencies-unread', 'dependencies are not read', FIELDS, FIELDS.replace('manifest.dependencies, ', '')),
    kit('L7-dev-dependencies-unread', 'devDependencies are not read', FIELDS, FIELDS.replace('manifest.devDependencies, ', '')),
    kit('L8-optional-dependencies-unread', 'optionalDependencies are not read', FIELDS, FIELDS.replace('manifest.optionalDependencies, ', '')),
    kit('L9-peer-dependencies-unread', 'peerDependencies are not read', FIELDS, FIELDS.replace(', manifest.peerDependencies', '')),
    kit('L10-root-manifest-unread', "the workspace root's manifest is not among the manifests", "manifests.set(root.name, { dir: '.', ...root });\n", ''),
    kit('L11-file-protocol-unread', 'file: is not local', LOCAL, drop('file:|')),
    kit('L12-link-protocol-unread', 'link: is not local', LOCAL, drop('link:|')),
    kit('L13-workspace-protocol-unread', 'workspace: is not local', LOCAL, drop('workspace:|')),
    kit('L14-npm-alias-unread', 'npm: is not local', LOCAL, drop('npm:|')),
    kit('L15-relative-path-unread', 'a ./ or ../ path is not local', LOCAL, drop('\\.\\.?(?:\\/|$)|')),
    kit('L16-absolute-path-unread', 'an absolute path is not local', LOCAL, LOCAL.replace('|\\/|~\\/)', '|~\\/)')),
    kit('L17-home-path-unread', 'a ~/ path is not local', LOCAL, drop('|~\\/')),
    kit('L18-tarball-unread', 'a tarball name is not local', LOCAL, LOCAL.replace('|\\.(?:tgz|tar|tar\\.gz)$', '')),
    kit('L19-case-sensitive', 'FILE: is not local', LOCAL, LOCAL[:-2] + 'u'),
    kit('L20-unanchored', 'a version that merely contains a local form is local', LOCAL, LOCAL.replace('/^(?:', '/(?:')),
    census('K1-given-files-ignored', 'readArgvCallers reads the tree whatever files it is given', '  const sources = files.filter(', '  const sources = treeFiles().filter('),
    census('K2-given-reader-ignored', 'readArgvCallers reads the tree whatever reader it is given', '    const text = read(module);\n', '    const text = readTree(module);\n'),
    census('K3-mts-cts-left-out', 'the population leaves .mts and .cts out', POPULATION, POPULATION.replace('/\\.[cm]?tsx?$/u', '/\\.tsx?$/u')),
    census('K4-tsx-left-out', 'the population leaves .tsx out', POPULATION, POPULATION.replace('/\\.[cm]?tsx?$/u', '/\\.[cm]?ts$/u')),
    census('K5-only-test-ts-excluded', 'only .test.ts modules are excluded', POPULATION, POPULATION.replace('!/\\.test\\.[cm]?tsx?$/u.test(module)', "!module.endsWith('.test.ts')")),
    census('K6-tests-included', 'test modules are not excluded', POPULATION, POPULATION.replace(' && !/\\.test\\.[cm]?tsx?$/u.test(module)', '')),
    census('K7-unsorted', 'the population is left in the order given', POPULATION + '.sort()', POPULATION),
    alias('T18-link', 'a link: dependency "dossier" imported by main.ts', 'apps/syzygy/package.json', 'link:../../packages/polaris-dossier',
          {'file': 'apps/syzygy/src/main.ts', 'old': MAIN_IMPORT, 'new': MAIN_IMPORT + "import 'dossier';\n"}, 'dossier'),
    alias('T18-workspace', 'a workspace: dependency "dossier" imported by main.ts', 'apps/syzygy/package.json', 'workspace:*',
          {'file': 'apps/syzygy/src/main.ts', 'old': MAIN_IMPORT, 'new': MAIN_IMPORT + "import 'dossier';\n"}, 'dossier'),
    alias('T18-npm', 'an npm: alias "dossier" of @syzygy/polaris-dossier imported by main.ts', 'apps/syzygy/package.json', 'npm:@syzygy/polaris-dossier@*',
          {'file': 'apps/syzygy/src/main.ts', 'old': MAIN_IMPORT, 'new': MAIN_IMPORT + "import 'dossier';\n"}, 'dossier'),
    alias('T18-path', 'a path dependency "dossier" imported by main.ts', 'apps/syzygy/package.json', '../../packages/polaris-dossier',
          {'file': 'apps/syzygy/src/main.ts', 'old': MAIN_IMPORT, 'new': MAIN_IMPORT + "import 'dossier';\n"}, 'dossier'),
    alias('T18-subpath', 'a file: dependency "dossier", its /argv subpath imported by main.ts', 'apps/syzygy/package.json', 'file:../../packages/polaris-dossier',
          {'file': 'apps/syzygy/src/main.ts', 'old': MAIN_IMPORT, 'new': MAIN_IMPORT + "import 'dossier/argv';\n"}, 'dossier/argv'),
    alias('T18-root', 'a file: dev dependency "dossier" of the workspace root, imported by main.ts', 'package.json', 'file:packages/polaris-dossier',
          {'file': 'apps/syzygy/src/main.ts', 'old': MAIN_IMPORT, 'new': MAIN_IMPORT + "import 'dossier';\n"}, 'dossier', field='devDependencies'),
    alias('T18-island', 'a file: dependency "consent" of the POC app, imported by a module the CLI reaches', 'apps/three-surface-poc/package.json',
          'file:../../packages/polaris-generation-consent',
          {'file': 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts', 'old': "import { assertInertSvg } from './svg-inert.js';\n",
           'new': "import { assertInertSvg } from './svg-inert.js';\nimport 'consent';\n"}, 'consent', scope=ISLAND),
    {'id': 'C6-cts', 'what': 'a new .cts module calling readArgv with its own spec', **CENSUS,
     'edits': [{'file': 'packages/polaris-dossier/src/extra-reader.cts', 'create': READER}]},
    {'id': 'C6-tsx', 'what': 'a new .tsx module calling readArgv with its own spec', **CENSUS,
     'edits': [{'file': 'packages/polaris-dossier/src/extra-reader.tsx', 'create': READER}]},
]

for m in MUTANTS:
    for e in m['edits']:
        if 'old' in e:
            text = open(os.path.join(tree, e['file'])).read()
            assert text.count(e['old']) == 1, (m['id'], e['file'], text.count(e['old']))
            assert e['old'] != e['new'], m['id']
        else:
            assert not os.path.exists(os.path.join(tree, e['file'])), m['id']
ids = [m['id'] for m in MUTANTS]
assert len(ids) == len(set(ids))
json.dump({'what': 'syzygy-bpyt.8.37 own mutants: one per predicate this bead adds, and tree forms of N2 and N3', 'mutants': MUTANTS}, open(out, 'w'), indent=1)
print(len(MUTANTS), 'mutants')
for m in MUTANTS:
    if m['edits'][0]['file'] == KIT:
        print(m['id'], '|', m['edits'][0]['new'][:140].strip())
