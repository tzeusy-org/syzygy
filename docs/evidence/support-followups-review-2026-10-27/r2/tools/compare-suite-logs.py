#!/usr/bin/env python3
"""Compare two vitest default-reporter logs file by file.

Usage: compare-suite-logs.py <log-a> <log-b>
A file row is a line ` <mark> |<project>| <path> (<n> tests[ | <k> skipped])`.
Prints the summary lines of each, the row counts, every path whose test count
or mark differs, and the skipped rows. Exit 1 if any path differs.
"""
import re
import sys

ROW = re.compile(r'^ ([✓×❯↓]) \|([^|]+)\| (\S+) \((\d+) tests?(?: \| (\d+) (?:skipped|failed))?\)')


def rows(path):
    out, summary = {}, []
    for line in open(path, encoding='utf-8', errors='replace'):
        m = ROW.match(line)
        if m:
            out[m.group(3)] = (m.group(1), int(m.group(4)), m.group(5))
        if re.match(r'^ +(Test Files|Tests) ', line):
            summary.append(line.strip())
    return out, summary


a, sa = rows(sys.argv[1])
b, sb = rows(sys.argv[2])
print('A summary:', sa)
print('B summary:', sb)
print(f'A rows={len(a)} tests={sum(v[1] for v in a.values())}; B rows={len(b)} tests={sum(v[1] for v in b.values())}')
diff = sorted(p for p in set(a) | set(b) if a.get(p) != b.get(p))
for p in diff:
    print('differs', p, a.get(p), b.get(p))
for p, v in sorted(a.items()):
    if v[0] == '↓' or v[2]:
        print('A skipped/partial', p, v)
print(f'paths differing={len(diff)}')
sys.exit(1 if diff else 0)
