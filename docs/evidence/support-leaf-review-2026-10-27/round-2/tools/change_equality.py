#!/usr/bin/env python3
"""Is the subject's change, re-based on the new main, the same change round 1 reviewed? Per path outside docs/, compare the
removed and added lines (-U0, hunk headers dropped, order kept) of `git diff <b1> <h1>` and `git diff <b2> <h2>`.
Usage: change_equality.py <repo> <b1> <h1> <b2> <h2>"""
import json
import subprocess
import sys

repo, b1, h1, b2, h2 = sys.argv[1:6]


def changes(b, h):
    out = subprocess.run(['git', '-C', repo, 'diff', '-U0', '--no-color', b, h, '--', '.', ':(exclude)docs/**'], capture_output=True, text=True, check=True).stdout
    per, cur = {}, None
    for line in out.split('\n'):
        if line.startswith('diff --git '):
            cur = line.split(' b/', 1)[1]
            per[cur] = []
        elif line.startswith(('---', '+++', '@@', 'index ', 'new file', 'deleted file', 'similarity', 'rename')):
            continue
        elif cur and line[:1] in '+-':
            per[cur].append(line)
    return per


a, b = changes(b1, h1), changes(b2, h2)
rows = []
for p in sorted(set(a) | set(b)):
    if a.get(p) != b.get(p):
        rows.append({'path': p, 'inFirst': p in a, 'inSecond': p in b,
                     'onlyFirst': [x for x in a.get(p, []) if x not in b.get(p, [])][:12], 'onlySecond': [x for x in b.get(p, []) if x not in a.get(p, [])][:12]})
print(json.dumps({'first': [b1, h1], 'second': [b2, h2], 'pathsFirst': len(a), 'pathsSecond': len(b), 'pathsWhoseChangeDiffers': len(rows), 'rows': rows}, indent=1))
