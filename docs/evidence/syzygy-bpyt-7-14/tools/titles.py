#!/usr/bin/env python3
"""Every Vitest test title at two commits, for syzygy-bpyt.7.14.

Usage: python3 -I titles.py <base-tree> <head-tree> <out.json> <tmpdir>
Runs `npx vitest list --json=<file>` in each clean clone and keys each title by its
repository-relative file and full name. Writes counts, the titles added and removed
(as multisets), the titles listed more than once, and each raw list's sha256.
"""
import collections
import hashlib
import json
import os
import shutil
import subprocess
import sys

base_tree, head_tree, out, tmpdir = sys.argv[1:5]


def listing(tree):
    assert subprocess.run(['git', '-C', tree, 'status', '--porcelain'], capture_output=True, text=True).stdout == ''
    commit = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
    os.makedirs(tmpdir, exist_ok=True)
    raw = os.path.join(tmpdir, 'list.json')
    run = subprocess.run(['npx', 'vitest', 'list', f'--json={raw}'], cwd=tree, capture_output=True, text=True,
                         env={**os.environ, 'TMPDIR': tmpdir}, timeout=1800)
    assert run.returncode == 0, run.stderr[-800:]
    data = open(raw, 'rb').read()
    shutil.rmtree(tmpdir, ignore_errors=True)
    rows = [(os.path.relpath(r['file'], tree), r['name']) for r in json.loads(data)]
    return commit, collections.Counter(rows), hashlib.sha256(data).hexdigest()


base, base_rows, base_sha = listing(base_tree)
head, head_rows, head_sha = listing(head_tree)
added = sorted((head_rows - base_rows).elements())
removed = sorted((base_rows - head_rows).elements())
json.dump({
    'what': 'every test title Vitest lists at each commit (npx vitest list --json in a clean clone), keyed by file and full name',
    'base': base, 'head': head,
    'titles': {'base': sum(base_rows.values()), 'head': sum(head_rows.values())},
    'added': [list(r) for r in added], 'removed': [list(r) for r in removed],
    'addedPerFile': dict(collections.Counter(f for f, _ in added)),
    'duplicates': {'base': sorted([f, n, c] for (f, n), c in base_rows.items() if c > 1),
                   'head': sorted([f, n, c] for (f, n), c in head_rows.items() if c > 1)},
    'listSha256': {'base': base_sha, 'head': head_sha},
}, open(out, 'w'), indent=1, ensure_ascii=False)
print('titles', sum(base_rows.values()), '->', sum(head_rows.values()), 'added', len(added), 'removed', len(removed))
