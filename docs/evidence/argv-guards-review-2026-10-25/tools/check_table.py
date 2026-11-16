"""rev-524: check section 8's kept-file table against the bytes on disk (sha256 and size), and list any kept file the table omits.

Usage: python3 -I check_table.py <rev-524 dir>
"""
import hashlib, os, re, sys

root = sys.argv[1]
raw = open(os.path.join(root, 'R-GP-IMPL-ARGV-GUARDS-1-RAW.md'), encoding='utf-8').read()
rows = re.findall(r'^\| `([^`]+)` \| `([0-9a-f]{64})` \| (\d+) \|$', raw, re.M)
bad = 0
for name, digest, size in rows:
    data = open(os.path.join(root, name), 'rb').read()
    ok = hashlib.sha256(data).hexdigest() == digest and len(data) == int(size)
    bad += not ok
    if not ok:
        print('MISMATCH', name, hashlib.sha256(data).hexdigest(), len(data))
listed = {name for name, _, _ in rows}
on_disk = set()
for sub in ('', 'tools'):
    for entry in os.listdir(os.path.join(root, sub) if sub else root):
        path = os.path.join(sub, entry) if sub else entry
        if os.path.isfile(os.path.join(root, path)) and path != 'R-GP-IMPL-ARGV-GUARDS-1-RAW.md':
            on_disk.add(path)
print('rows', len(rows), 'mismatched', bad, 'unlisted', sorted(on_disk - listed), 'listed-missing', sorted(listed - on_disk))
