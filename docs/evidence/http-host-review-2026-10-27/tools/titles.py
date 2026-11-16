#!/usr/bin/env python3
"""Title arithmetic between two `vitest list --json` outputs (rev-529).

Usage: titles.py <base-list.json> <head-list.json> <base-root> <head-root>
A title key is (file relative to its root, full name). Prints counts, new, removed and
moved titles (same name, different file), and the multiset duplicates per side.
"""
import json
import sys
from collections import Counter

bl, hl, br, hr = sys.argv[1:5]


def keys(path, root):
    rows = json.load(open(path))
    out = Counter()
    for r in rows:
        f = r['file'].split(root.rstrip('/') + '/')[-1]
        out[(f, r['name'])] += 1
    return out


b, h = keys(bl, br), keys(hl, hr)
print('base titles', sum(b.values()), 'distinct', len(b), '| head titles', sum(h.values()), 'distinct', len(h))
new = sorted(set(h) - set(b))
gone = sorted(set(b) - set(h))
by_name_new = {}
for f, n in new:
    by_name_new.setdefault(n, []).append(f)
moved = [(f, n, by_name_new.get(n)) for f, n in gone if n in by_name_new]
truly_gone = [(f, n) for f, n in gone if n not in by_name_new]
moved_names = {n for _, n, _ in moved}
truly_new = [(f, n) for f, n in new if n not in moved_names]
print('keys only at head', len(new), '| only at base', len(gone), '| moved (same name)', len(moved),
      '| new', len(truly_new), '| removed', len(truly_gone))
for f, n in truly_new:
    print('  NEW', f, '>', n)
for f, n in truly_gone:
    print('  REMOVED', f, '>', n)
mv_pairs = Counter((f, tuple(t)) for f, _, t in moved)
for (f, t), c in mv_pairs.items():
    print('  MOVED', c, f, '->', list(t))
db = {k: v for k, v in b.items() if v > 1}
dh = {k: v for k, v in h.items() if v > 1}
print('duplicate keys base', len(db), 'head', len(dh), 'equal', db == dh)
changed_counts = [(k, b[k], h[k]) for k in set(b) & set(h) if b[k] != h[k]]
print('keys with changed multiplicity', changed_counts)
