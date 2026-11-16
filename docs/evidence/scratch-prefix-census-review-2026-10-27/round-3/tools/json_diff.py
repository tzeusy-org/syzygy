#!/usr/bin/env python3
"""Flatten two versions of a JSON file (by git show) to pointer paths and list the paths that were added, removed or changed.

Usage: json_diff.py <clone> <old-commit> <new-commit> <path-in-repo> [--keys]
"""
import json
import subprocess
import sys

clone, old, new, path = sys.argv[1:5]


def load(commit):
    return json.loads(subprocess.run(['git', '-C', clone, 'show', f'{commit}:{path}'], check=True, capture_output=True).stdout)


def flatten(value, prefix=''):
    if isinstance(value, dict):
        if not value:
            yield prefix, {}
        for k, v in value.items():
            yield from flatten(v, f'{prefix}/{k}')
    elif isinstance(value, list):
        if not value:
            yield prefix, []
        for i, v in enumerate(value):
            yield from flatten(v, f'{prefix}[{i}]')
    else:
        yield prefix, value


a, b = load(old), load(new)
if '--keys' in sys.argv:
    print(json.dumps({'old': list(a) if isinstance(a, dict) else type(a).__name__, 'new': list(b) if isinstance(b, dict) else type(b).__name__}))
fa, fb = dict(flatten(a)), dict(flatten(b))
added = sorted(set(fb) - set(fa))
removed = sorted(set(fa) - set(fb))
changed = sorted(p for p in set(fa) & set(fb) if fa[p] != fb[p])


def top(paths, depth=2):
    out = {}
    for p in paths:
        parts = p.replace('[', '/[').split('/')[1:depth + 1]
        key = '/' + '/'.join(parts)
        out[key] = out.get(key, 0) + 1
    return out


print(json.dumps({'leafPathsOld': len(fa), 'leafPathsNew': len(fb), 'added': len(added), 'removed': len(removed), 'changed': len(changed),
                  'addedByTop': top(added), 'removedByTop': top(removed), 'changedPaths': changed,
                  'removedPaths': removed}, indent=1))
