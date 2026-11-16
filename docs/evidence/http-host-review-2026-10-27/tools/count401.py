#!/usr/bin/env python3
"""rev-529: 401 answers in the committed host-base record, by method, path and auth form.

Usage: python3 -I count401.py <repo> <commit>
Reads docs/evidence/syzygy-bpyt-7-3/diff/host-base.json from git objects (no checkout).
"""
import json
import subprocess
import sys
from collections import Counter

repo, commit = sys.argv[1:3]
rec = json.loads(subprocess.run(['git', '-C', repo, 'show', f'{commit}:docs/evidence/syzygy-bpyt-7-3/diff/host-base.json'],
                                capture_output=True, text=True, check=True).stdout)
print('keys', sorted(rec))
answers = rec['answers']
status = lambda a: a.get('status') if isinstance(a, dict) else a[0]
rows = [(m, p, auth, status(answers[i])) for m, p, auth, i in rec['requests']]
print('requests', len(rows))
r401 = [(m, p, auth) for m, p, auth, s in rows if s == 401]
print('401 total', len(r401))
print('by method', Counter(m for m, _, _ in r401))
print('by auth', sorted(Counter(a for _, _, a in r401).items()))
print('paths', sorted(Counter(p for _, p, _ in r401).items()))
