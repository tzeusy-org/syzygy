#!/usr/bin/env python3
"""The base test files whose bytes name a credential, origin, ceiling, bearer or
authorization (case-folded), and whether each is the same blob at head.

Usage: testset.py <repo> <base> <head> <out-list>
Test file: a tracked path ending in .test.ts or .test.mjs or .test.js (any directory).
"""
import re
import subprocess
import sys

repo, base, head, out = sys.argv[1:5]
PAT = re.compile(r'credential|origin|ceiling|bearer|authorization', re.I)


def git(*a):
    return subprocess.run(['git', '-C', repo, *a], capture_output=True, check=True).stdout


def tree(commit):
    rows = {}
    for rec in git('ls-tree', '-r', '-z', commit).split(b'\0'):
        if not rec:
            continue
        meta, path = rec.split(b'\t', 1)
        rows[path.decode()] = meta.split()[2].decode()
    return rows


bt, ht = tree(base), tree(head)
is_test = lambda p: re.search(r'\.test\.(ts|mts|mjs|js)$', p) is not None
tests = sorted(p for p in bt if is_test(p))
hits = []
for p in tests:
    body = git('cat-file', 'blob', bt[p]).decode('utf-8', 'replace')
    if PAT.search(body):
        hits.append(p)
same, renamed, changed = [], [], []
headblobs = {}
for p, b in ht.items():
    headblobs.setdefault(b, []).append(p)
for p in hits:
    if ht.get(p) == bt[p]:
        same.append(p)
    elif bt[p] in headblobs:
        renamed.append((p, headblobs[bt[p]]))
    else:
        changed.append(p)
print(f'base test files: {len(tests)}; matching: {len(hits)}; same path+blob: {len(same)}; '
      f'same blob elsewhere: {len(renamed)} {renamed}; changed/missing: {len(changed)} {changed}')
# head test files that changed vs base (any test file)
htests = sorted(p for p in ht if is_test(p))
newt = [p for p in htests if p not in bt and ht[p] not in {bt.get(q) for q in bt}]
chg = [p for p in htests if p in bt and bt[p] != ht[p]]
print(f'head test files: {len(htests)}; new (blob not at base): {newt}; changed in place: {chg}')
with open(out, 'w') as fh:
    for p in hits:
        fh.write((renamed_map := dict(renamed)).get(p, [p])[0] + '\n')
