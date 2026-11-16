#!/usr/bin/env python3
"""syzygy-bpyt.6.14: every test title of the three test files the bead changes (`vitest list --json`), in a tree at base and a
tree at head, compared by file and full name. After syzygy-bpyt-6-15/titles.py, with named files in place of a project.

Usage: python3 -I titles.py <base tree> <head tree> <tmpdir> <out.json>
"""
import collections
import json
import os
import shutil
import subprocess
import sys

FILES = ['packages/polaris-dossier/src/no-egress.test.ts', 'packages/support/src/support-purity.test.ts',
         'packages/three-surface-poc-core/src/owner-act-drafter.test.ts']


def names(tree, tmpdir):
    os.makedirs(tmpdir, exist_ok=True)
    out = os.path.join(tmpdir, 'list.json')
    subprocess.run(['npx', 'vitest', 'list', f'--json={out}', *FILES], cwd=tree, capture_output=True, text=True, check=True,
                   env={**os.environ, 'TMPDIR': tmpdir}, timeout=900)
    rows = json.load(open(out))
    shutil.rmtree(tmpdir, ignore_errors=True)
    return [(r['file'].replace(tree.rstrip('/') + '/', ''), r['name']) for r in rows]


def commit(tree):
    return subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()


def main():
    base_tree, head_tree, tmpdir, out_file = sys.argv[1:5]
    base, head = names(base_tree, tmpdir), names(head_tree, tmpdir)
    dup = lambda rows: sorted([list(k), n] for k, n in collections.Counter(rows).items() if n > 1)
    record = {
        'files': FILES, 'baseCommit': commit(base_tree), 'headCommit': commit(head_tree), 'base': len(base), 'head': len(head),
        'added': sorted(map(list, set(head) - set(base))), 'removed': sorted(map(list, set(base) - set(head))),
        'duplicatesBase': dup(base), 'duplicatesHead': dup(head),
        'perFile': {f: {'base': sum(1 for x, _ in base if x == f), 'head': sum(1 for x, _ in head if x == f)} for f in FILES},
    }
    json.dump(record, open(out_file, 'w'), indent=1)
    print('base', record['base'], 'head', record['head'], 'added', len(record['added']), 'removed', len(record['removed']),
          'dups', record['duplicatesBase'], record['duplicatesHead'])
    for row in record['removed']:
        print(' -', row)
    for row in record['added']:
        print(' +', row)


if __name__ == '__main__':
    main()
