"""syzygy-bpyt.8.38: one mutant per predicate a row of this bead pins that the PR 531 reviewer's specs leave unsplit or unrun.

Usage: python3 -I own_specs.py <tree> <out.json>. Each `old` is checked to occur exactly once in its file in <tree>.
Run with the PR 524 reviewer's mut.py (docs/evidence/argv-guards-review-2026-10-25/tools/mut.py).
"""
import json, os, sys

tree, out = sys.argv[1:3]
KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
GUARDS = {'projects': ['@syzygy/polaris-generation-core', '@syzygy/polaris-dossier'],
          'files': ['packages/polaris-generation-core/src/workspace-reach.test.ts', 'packages/polaris-generation-core/src/island-boundary.test.ts',
                    'packages/polaris-dossier/src/subpath-imports.test.ts']}
LOCAL = "/^(?:file:|link:|workspace:|npm:|\\.\\.?(?:\\/|$)|\\/|~\\/)|\\.(?:tgz|tar|tar\\.gz)$/iu"
TARBALL = '|\\.(?:tgz|tar|tar\\.gz)$'
ROOT = "manifests.set(root.name, { dir: '.', ...root });\n"


def kit(id, what, old, new):
    return {'id': id, 'what': what, **GUARDS, 'edits': [{'file': KIT, 'old': old, 'new': new}]}


assert LOCAL.count(TARBALL) == 1
MUTANTS = [
    kit('O1-tarball-url-reads-outside', 'the tarball arm matches only a version with no colon, so a tarball URL reads as outside again', LOCAL,
        LOCAL.replace(TARBALL, '|^[^:]*\\.(?:tgz|tar|tar\\.gz)$')),
    kit('O2-tar-unread', 'a .tar name is not local; .tgz and .tar.gz still are', LOCAL, LOCAL.replace('tgz|tar|tar\\.gz', 'tgz|tar\\.gz')),
    kit('O3-tar-gz-unread', 'a .tar.gz name is not local; .tgz and .tar still are', LOCAL, LOCAL.replace('tgz|tar|tar\\.gz', 'tgz|tar')),
    kit('O4-root-dev-dependencies-dropped', "the workspace root's entry keeps every field but its devDependencies", ROOT,
        "manifests.set(root.name, { dir: '.', ...root, devDependencies: {} });\n"),
]

for m in MUTANTS:
    for e in m['edits']:
        text = open(os.path.join(tree, e['file'])).read()
        assert text.count(e['old']) == 1, (m['id'], e['file'], text.count(e['old']))
        assert e['old'] != e['new'], m['id']
ids = [m['id'] for m in MUTANTS]
assert len(ids) == len(set(ids))
json.dump({'what': 'syzygy-bpyt.8.38 own mutants: the URL refusal row, the .tar and .tar.gz rows apart, and the root row beyond its dependencies',
           'mutants': MUTANTS}, open(out, 'w'), indent=1)
print(len(MUTANTS), 'mutants')
for m in MUTANTS:
    print(m['id'], '|', m['edits'][0]['new'][:140].strip())
