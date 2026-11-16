#!/usr/bin/env python3
"""Fill the raw's cleanup table: sha256 of every file kept under rev-530b/, the raw and its staging copy excluded.

Usage: fill_kept.py <rev-530b dir> <staging raw>
Refuses when the placeholder is not present exactly once, or when any kept file is over 300 KB.
"""
import hashlib
import os
import re
import sys

LIMIT = 300 * 1024


def main():
    root, staging = sys.argv[1], sys.argv[2]
    skip = {os.path.basename(staging), 'R-GP-IMPL-SUPPORT-LEAF-2-RAW.md'}
    rows, sizes = [], []
    for d, dirs, files in os.walk(root):
        dirs.sort()
        for f in sorted(files):
            rel = os.path.relpath(os.path.join(d, f), root)
            if rel in skip:
                continue
            p = os.path.join(d, f)
            size = os.path.getsize(p)
            if size > LIMIT:
                raise SystemExit(f'over 300 KB: {rel} {size}')
            sizes.append((size, rel))
            rows.append(f'| `{rel}` | `{hashlib.sha256(open(p, "rb").read()).hexdigest()}` |')
    text = open(staging, encoding='utf-8').read()
    if text.count('KEPT_TABLE_PLACEHOLDER') != 1:
        raise SystemExit('placeholder not present exactly once')
    text = text.replace('KEPT_TABLE_PLACEHOLDER', '\n'.join(rows))
    new, n = re.subn(r'\*\*Kept:\*\* \d+ files plus this raw', f'**Kept:** {len(rows)} files plus this raw', text)
    if n != 1:
        raise SystemExit('kept-count sentence not present exactly once')
    open(staging, 'w', encoding='utf-8').write(new)
    sizes.sort(reverse=True)
    print('kept', len(rows), 'largest', sizes[:3])


if __name__ == '__main__':
    main()
