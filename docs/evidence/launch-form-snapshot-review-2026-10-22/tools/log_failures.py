"""From a vitest default-reporter log, each FAIL block's file and the first error line after it."""
import collections
import re
import sys

text = re.sub(r'\x1b\[[0-9;]*m', '', open(sys.argv[1], errors='replace').read())
lines = text.splitlines()
kinds = collections.Counter()
per_file = collections.Counter()
for i, line in enumerate(lines):
    m = re.match(r'\s*FAIL\s+@syzygy/polaris-dossier\s+packages/polaris-dossier/src/(\S+)\s+>', line)
    if not m:
        continue
    j = i + 1
    while j < len(lines) and (not lines[j].strip() or lines[j].strip().startswith('FAIL')):
        j += 1
    err = lines[j].strip()[:90] if j < len(lines) else ''
    kinds[(m.group(1), err)] += 1
    per_file[m.group(1)] += 1
for (f, e), n in sorted(kinds.items()):
    print(n, f, '|', e)
print('FAIL headers per file:', dict(per_file), 'total', sum(per_file.values()))
