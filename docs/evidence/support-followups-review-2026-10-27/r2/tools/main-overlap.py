#!/usr/bin/env python3
"""Paths main changed since eb8fb6cb, intersected with the PR's paths over eb8fb6cb.

Usage: main-overlap.py <clone> <main-ref>. Two methods: a set intersection over
`git diff --name-only -z`, and a per-path blob comparison over every PR path.
"""
import subprocess
import sys

clone, main_ref = sys.argv[1], sys.argv[2]


def git(*args):
    return subprocess.run(['git', '-C', clone, *args], check=True, capture_output=True).stdout.decode()


def names(a, b):
    return {n for n in git('diff', '--name-only', '-z', a, b).split('\0') if n}


main_sha = git('rev-parse', main_ref).strip()
print('main', main_sha)
print('merge-base(7d408fd9, main)', git('merge-base', '7d408fd9', main_ref).strip())
for line in git('log', '--first-parent', '--format=%h %s', f'eb8fb6cb..{main_ref}').splitlines():
    print('  main first-parent:', line)
pr = names('eb8fb6cb', '7d408fd9')
mn = names('eb8fb6cb', main_ref)
top = {}
for n in mn:
    top[n.split('/')[0]] = top.get(n.split('/')[0], 0) + 1
print(f'pr paths={len(pr)} main paths={len(mn)} main by top dir={dict(sorted(top.items()))}')
inter = sorted(pr & mn)
print(f'method 1 (set intersection): {len(inter)}')
for n in inter:
    print('   ', n)
# Method 2: for every PR path, compare its blob at eb8fb6cb and at main.
def blob(rev, p):
    r = subprocess.run(['git', '-C', clone, 'rev-parse', f'{rev}:{p}'], capture_output=True)
    return r.stdout.decode().strip() if r.returncode == 0 else None
moved = sorted(p for p in pr if blob('eb8fb6cb', p) != blob(main_ref, p))
print(f'method 2 (PR paths whose blob main changed): {len(moved)} of {len(pr)}')
for n in moved:
    print('   ', n)
mt = subprocess.run(['git', '-C', clone, 'merge-tree', '--write-tree', '7d408fd9', main_ref], capture_output=True)
print(f'merge-tree 7d408fd9 {main_ref[:12]}: exit={mt.returncode} tree={mt.stdout.decode().splitlines()[0] if mt.stdout else ""}')
