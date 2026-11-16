"""syzygy-bpyt.6.15: list every test title of the projects this bead touches (`vitest list --json`), in a tree at base and a
tree at head, and compare them by file and full name. After the PR 524 reviewer's titles.py
(docs/evidence/argv-guards-review-2026-10-25/tools/titles.py), with whole projects in place of named files.

Usage: python3 -I titles.py <base tree> <head tree> <tmpdir> <out.json>
"""
import collections, json, os, shutil, subprocess, sys

base_tree, head_tree, tmpdir, out_file = sys.argv[1:5]
PROJECTS = ['@syzygy/three-surface-poc-app']


def names(tree):
    os.makedirs(tmpdir, exist_ok=True)
    out = os.path.join(tmpdir, 'list.json')
    args = ['npx', 'vitest', 'list', f'--json={out}']
    for project in PROJECTS:
        args += ['--project', project]
    subprocess.run(args, cwd=tree, capture_output=True, text=True, check=True, env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}, timeout=900)
    rows = json.load(open(out))
    shutil.rmtree(tmpdir, ignore_errors=True)
    return [(r['file'].replace(tree.rstrip('/') + '/', ''), r['name']) for r in rows]


def commit(tree):
    return subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()


base, head = names(base_tree), names(head_tree)
dup = lambda rows: sorted([list(k), n] for k, n in collections.Counter(rows).items() if n > 1)
files = sorted({f for f, _ in base} | {f for f, _ in head})
record = {
    'projects': PROJECTS, 'baseCommit': commit(base_tree), 'headCommit': commit(head_tree),
    'base': len(base), 'head': len(head),
    'added': sorted(map(list, set(head) - set(base))), 'removed': sorted(map(list, set(base) - set(head))),
    'duplicatesBase': dup(base), 'duplicatesHead': dup(head),
    'perFile': {f: {'base': sum(1 for x, _ in base if x == f), 'head': sum(1 for x, _ in head if x == f)} for f in files},
}
json.dump(record, open(out_file, 'w'), indent=1)
print('base', record['base'], 'head', record['head'], 'added', len(record['added']), 'removed', len(record['removed']),
      'files', len(files), 'duplicate keys', len(record['duplicatesBase']), len(record['duplicatesHead']))
