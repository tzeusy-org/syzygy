"""Blob comparison of two commits' full trees: every path in the union, and which differ."""
import subprocess
import sys

clone, a, b = sys.argv[1:4]


def tree(commit):
    out = subprocess.run(['git', '-C', clone, 'ls-tree', '-r', '-z', '--full-tree', commit], check=True, capture_output=True).stdout
    entries = {}
    for item in out.split(b'\0'):
        if not item:
            continue
        meta, path = item.split(b'\t', 1)
        mode, _kind, oid = meta.split(b' ')
        entries[path.decode()] = (mode.decode(), oid.decode())
    return entries


ta, tb = tree(a), tree(b)
union = sorted(set(ta) | set(tb))
differ = [p for p in union if ta.get(p) != tb.get(p)]
print(f'paths in union: {len(union)}; in {a[:8]}: {len(ta)}; in {b[:8]}: {len(tb)}; differing: {len(differ)}')
for p in differ:
    print(' ', p, ta.get(p), '->', tb.get(p))
