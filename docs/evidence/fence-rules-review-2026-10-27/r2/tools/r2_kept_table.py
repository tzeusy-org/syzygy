#!/usr/bin/env python3
"""Hash every kept file under rev-533b/ (the raw and its draft excepted) and put the table in place of KEPT_TABLE in the draft.
Usage: r2_kept_table.py <rev-533b dir> <draft>
Refuses a file over 300 KB. This script is itself listed, so it is hashed before it writes nothing but the draft."""
import hashlib
import os
import sys

root, draft = sys.argv[1:3]
rows = []
for d, _, fs in os.walk(root):
    for f in fs:
        p = os.path.join(d, f)
        rel = os.path.relpath(p, root)
        if rel.startswith('R-GP-IMPL-FENCE-RULES-2-RAW.md'):
            continue
        size = os.path.getsize(p)
        assert size <= 300 * 1024, (rel, size)
        rows.append((rel, hashlib.sha256(open(p, 'rb').read()).hexdigest(), size))
rows.sort()
table = '| file | sha256 |\n|---|---|\n' + ''.join(f'| `{r}` | `{h}` |\n' for r, h, _ in rows)
table += f'\n{len(rows)} files; the largest is {max(s for _, _, s in rows):,} bytes.'
text = open(draft, encoding='utf8').read()
assert text.count('KEPT_TABLE') == 1
open(draft, 'w', encoding='utf8').write(text.replace('KEPT_TABLE', table))
print(table)
