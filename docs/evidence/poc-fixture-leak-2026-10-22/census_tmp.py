#!/usr/bin/env python3
"""Census of the syzygy-poc-surface-fixture-* directories directly under a directory, by
modification time, grouped into bursts.

Usage: census_tmp.py <directory> <out.json> [--gap-seconds N]

A burst is a run of directories whose successive modification times are at most N seconds
apart (default 120). Read-only: nothing is removed. The record holds the totals (copies and
templates, owners), the burst-size histogram and each burst's first and last time and size.
"""
import datetime
import json
import os
import pathlib
import sys

root, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
gap = int(sys.argv[sys.argv.index('--gap-seconds') + 1]) if '--gap-seconds' in sys.argv else 120
rows = sorted((os.lstat(p).st_mtime, p.name, os.lstat(p).st_uid) for p in root.glob('syzygy-poc-surface-fixture-*'))
bursts, current = [], []
for row in rows:
    if current and row[0] - current[-1][0] > gap:
        bursts.append(current)
        current = []
    current.append(row)
if current:
    bursts.append(current)
stamp = lambda t: datetime.datetime.fromtimestamp(t).strftime('%Y-%m-%d %H:%M:%S')
is_template = lambda name: name.startswith('syzygy-poc-surface-fixture-template-')
histogram: dict[int, int] = {}
for burst in bursts:
    histogram[len(burst)] = histogram.get(len(burst), 0) + 1
record = {
    'tool': 'census_tmp.py',
    'directory': str(root),
    'takenAt': stamp(datetime.datetime.now().timestamp()),
    'burstGapSeconds': gap,
    'total': len(rows),
    'copies': sum(1 for r in rows if not is_template(r[1])),
    'templates': sum(1 for r in rows if is_template(r[1])),
    'owners': sorted({r[2] for r in rows}),
    'bursts': len(bursts),
    'burstSizeHistogram': dict(sorted(histogram.items())),
    'largestBursts': [{'first': stamp(b[0][0]), 'last': stamp(b[-1][0]), 'size': len(b)} for b in sorted(bursts, key=len, reverse=True)[:8]],
}
out.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({k: v for k, v in record.items() if k != 'largestBursts'}))
