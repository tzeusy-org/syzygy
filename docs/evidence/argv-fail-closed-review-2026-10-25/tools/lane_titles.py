"""syzygy-bpyt.8.36: the PR 524 reviewer's titles.py (docs/evidence/argv-guards-review-2026-10-25/tools/titles.py), unchanged but for
FILES, which also names the new workspace-reach.test.ts. The reviewer's docstring follows.

rev-524: list the test names of the three changed test files in a tree (vitest list --json), base and head, and compare.

Usage: python3 -I titles.py <base tree> <head tree> <tmpdir> <out.json>
"""
import collections, json, os, shutil, subprocess, sys

base_tree, head_tree, tmpdir, out_file = sys.argv[1:5]
FILES = ['packages/polaris-dossier/src/argv.test.ts', 'packages/polaris-dossier/src/subpath-imports.test.ts',
         'packages/polaris-generation-core/src/island-boundary.test.ts', 'packages/polaris-generation-core/src/workspace-reach.test.ts']


def names(tree):
    os.makedirs(tmpdir, exist_ok=True)
    out = os.path.join(tmpdir, 'list.json')
    subprocess.run(['npx', 'vitest', 'list', f'--json={out}', '--project', '@syzygy/polaris-dossier', '--project',
                    '@syzygy/polaris-generation-core', *FILES], cwd=tree, capture_output=True, text=True, check=True,
                   env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}, timeout=600)
    rows = json.load(open(out))
    shutil.rmtree(tmpdir, ignore_errors=True)
    return [(r['file'].replace(tree + '/', ''), r['name']) for r in rows]


b, h = names(base_tree), names(head_tree)
bc, hc = collections.Counter(b), collections.Counter(h)
removed = sorted((bc - hc).elements())
added = sorted((hc - bc).elements())
per_file = {f: {'base': sum(1 for x in b if x[0] == f), 'head': sum(1 for x in h if x[0] == f)} for f in FILES}
out = {'base': len(b), 'head': len(h), 'added': len(added), 'removed': len(removed), 'perFile': per_file,
       'duplicatesBase': [k for k, v in bc.items() if v > 1], 'duplicatesHead': [k for k, v in hc.items() if v > 1],
       'addedNames': added, 'removedNames': removed}
json.dump(out, open(out_file, 'w'), indent=1, ensure_ascii=False)
print(json.dumps({k: v for k, v in out.items() if k != 'addedNames'}, indent=1))
for a in added:
    print('  +', a[0].split('/')[-1], '|', a[1][:150])
