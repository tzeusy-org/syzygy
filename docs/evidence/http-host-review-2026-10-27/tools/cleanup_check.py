#!/usr/bin/env python3
"""rev-529: does the raw's cleanup section list every kept file with its current sha256?

Usage: python3 -I cleanup_check.py <rev529-dir> <raw.md>
Prints each kept file (raw excluded) whose `<sha256>  <path>` line is missing from the raw,
each listed path that no longer exists, and the counts.
"""
import hashlib
import os
import re
import sys

root, raw = sys.argv[1:3]
text = open(raw, encoding='utf-8').read()
kept = []
for d, _, files in os.walk(root):
    for f in files:
        p = os.path.join(d, f)
        if os.path.abspath(p) == os.path.abspath(raw):
            continue
        kept.append(os.path.relpath(p, root))
kept.sort()
missing = []
for rel in kept:
    digest = hashlib.sha256(open(os.path.join(root, rel), 'rb').read()).hexdigest()
    if f'{digest}  {rel}' not in text:
        missing.append((rel, digest))
listed = re.findall(r'`([0-9a-f]{64})  ([^`]+)`', text)
gone = [p for _, p in listed if not os.path.exists(os.path.join(root, p))]
print('kept', len(kept), 'listed', len(listed), 'missing-or-stale', len(missing), 'listed-but-absent', len(gone))
for rel, digest in missing:
    print(f'  `{digest}  {rel}`')
for p in gone:
    print('  absent', p)
