#!/usr/bin/env python3
"""Surface version per pwbSurfaceVersion's formula, and its carriers.

Usage: python3 -I surface.py <repo> <out.json> <commit>... [--grep-at <commit>...]

For each commit: `polaris@` + first 12 hex of sha256 over the tree ids of
apps/three-surface-poc/src and packages/three-surface-poc-core/src, joined by one newline
(apps/three-surface-poc/src/walkthrough-inputs.ts, pwbSurfaceVersion). Then, at each
--grep-at commit, `git grep -l -F` for every distinct full value and for its 12-hex part,
over every tracked file at that commit.
"""
import hashlib
import json
import subprocess
import sys

repo, out, *rest = sys.argv[1:]
commits, grep_at = (rest[:rest.index('--grep-at')], rest[rest.index('--grep-at') + 1:]) if '--grep-at' in rest else (rest, [])
TREES = ['apps/three-surface-poc/src', 'packages/three-surface-poc-core/src']


def git(*args, check=True):
    return subprocess.run(['git', '-C', repo, *args], capture_output=True, text=True, check=check)


versions = {}
for c in commits:
    full = git('rev-parse', c).stdout.strip()
    trees = [git('rev-parse', f'{full}:{t}').stdout.strip() for t in TREES]
    versions[c] = {'commit': full, 'trees': trees,
                   'version': 'polaris@' + hashlib.sha256('\n'.join(trees).encode()).hexdigest()[:12]}
grep = {}
for g in grep_at:
    full = git('rev-parse', g).stdout.strip()
    grep[g] = {}
    for v in sorted({x['version'] for x in versions.values()}):
        for needle in (v, v.split('@')[1]):
            run = git('grep', '-l', '-F', needle, full, check=False)
            assert run.returncode in (0, 1), run.stderr
            grep[g][needle] = [line.split(':', 1)[1] for line in run.stdout.split()]
json.dump({'versions': versions, 'carriers': grep}, open(out, 'w'), indent=1)
for c, v in versions.items():
    print(c, v['version'], v['trees'])
for g, hits in grep.items():
    for needle, paths in hits.items():
        print('grep at', g, needle, len(paths), paths[:6])
