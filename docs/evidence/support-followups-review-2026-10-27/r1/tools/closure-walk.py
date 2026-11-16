#!/usr/bin/env python3
"""Reviewer walk of the SEC-3 live-verification import closure (PR #538), independent of the closure test's own walker.

Usage: closure-walk.py <clone> <commit> [<commit> ...]
Seeds packages/three-surface-poc-core/src/test-artifact-verification.live.test.ts, reads every file from git objects at the commit,
and follows static `import ... from '<x>'`, `export ... from '<x>'`, side-effect `import '<x>'` and dynamic `import('<x>')`
specifiers that are relative, or that name @syzygy/cap1-core or @syzygy/support (followed into src/index.ts, as the test does).
Prints, per commit: closure size, whether packages/support/src/index.ts is in it, every closure file that imports @syzygy/support,
and one shortest import path from the seed to the support package.
"""
import posixpath
import re
import subprocess
import sys
from collections import deque

SEED = 'packages/three-surface-poc-core/src/test-artifact-verification.live.test.ts'
WORKSPACE = {'@syzygy/cap1-core': 'packages/cap1-core/src/index.ts', '@syzygy/support': 'packages/support/src/index.ts'}
SPEC = re.compile(r"""(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)['"]([^'"\n]+)['"]""", re.M)


def show(clone, commit, path):
    p = subprocess.run(['git', 'show', f'{commit}:{path}'], cwd=clone, capture_output=True, text=True)
    return p.stdout if p.returncode == 0 else None


def resolve(here, spec):
    if spec in WORKSPACE:
        return WORKSPACE[spec]
    if not spec.startswith('.'):
        return None
    target = posixpath.normpath(posixpath.join(posixpath.dirname(here), spec))
    return re.sub(r'\.js$', '.ts', target)


def walk(clone, commit):
    parent = {SEED: None}
    queue = deque([SEED])
    importers = []
    missing = []
    while queue:
        here = queue.popleft()
        text = show(clone, commit, here)
        if text is None:
            missing.append(here)
            continue
        for spec in SPEC.findall(text):
            if spec == '@syzygy/support':
                importers.append(here)
            target = resolve(here, spec)
            if target and target not in parent:
                parent[target] = here
                queue.append(target)
    goal = WORKSPACE['@syzygy/support']
    path = []
    node = goal if goal in parent else None
    while node:
        path.append(node)
        node = parent[node]
    return {'files': len(parent), 'missing': missing, 'supportInClosure': goal in parent,
            'supportImporters': sorted(set(importers)), 'shortestPathToSupport': list(reversed(path))}


def main():
    clone, *commits = sys.argv[1:]
    for commit in commits:
        r = walk(clone, commit)
        print(f"== {commit}: closure files={r['files']} missing={r['missing']} supportInClosure={r['supportInClosure']}")
        print('   importers of @syzygy/support in the closure (%d):' % len(r['supportImporters']))
        for f in r['supportImporters']:
            print('     ', f)
        print('   shortest path:', ' -> '.join(r['shortestPathToSupport']))


if __name__ == '__main__':
    main()
