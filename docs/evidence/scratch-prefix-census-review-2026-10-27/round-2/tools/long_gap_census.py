#!/usr/bin/env python3
"""Per long sighting gap (1.0 s or more) of the clean run: how many traced names were created inside it (trace time aligned to the
sampler clock), how many of those the sampler ever saw, and the same catch rate for names created inside short gaps.

Usage: long_gap_census.py <evidence-dir>
"""
import bisect
import collections
import gzip
import json
import pathlib
import re
import sys

EV = pathlib.Path(sys.argv[1])
samples = json.loads((EV / 'runs/c0-clean.samples.json').read_text())
trace = [json.loads(l) for l in gzip.decompress((EV / 'runs/c0-clean.trace.jsonl.gz').read_bytes()).decode().splitlines()]
entries = samples['entries']
known = sorted({v[k] for v in entries.values() for k in ('first', 'last')} | {0.0})
first_row = {}
for row in trace:
    name = row['path'].rsplit('/', 1)[1]
    first_row.setdefault(name, row)
lo, hi = float('-inf'), float('inf')
for name, row in first_row.items():
    if name in entries:
        f = entries[name]['first']
        i = bisect.bisect_left(known, f)
        lo, hi = max(lo, row['t'] / 1000 - f), min(hi, row['t'] / 1000 - known[i - 1])
offset = (lo + hi) / 2
out = {'offsetWindowSeconds': round(hi - lo, 3), 'tracedNames': len(first_row), 'sampled': sum(1 for n in first_row if n in entries), 'perLongGap': [], 'shortGaps': None}
created_at = {n: r['t'] / 1000 - offset for n, r in first_row.items()}
short = collections.Counter()
for a, b in zip(known, known[1:]):
    inside = [n for n, t in created_at.items() if a < t <= b]
    caught = sum(1 for n in inside if n in entries)
    if round(b - a, 2) >= 1.0:
        classes = collections.Counter(re.sub(r'-p\d+-n\d+-', '-p<pid>-n<ns>-', first_row[n].get('prefix', '(no prefix: ' + first_row[n]['kind'] + ')')) for n in inside)
        out['perLongGap'].append({'from': a, 'to': b, 'seconds': round(b - a, 2), 'namesCreatedInside': len(inside), 'ofThemEverSampled': caught,
                                  'topClasses': classes.most_common(5)})
    else:
        short['names'] += len(inside)
        short['caught'] += caught
        short['gaps'] += 1
        short['seconds'] += b - a
out['shortGaps'] = {'gaps': short['gaps'], 'seconds': round(short['seconds'], 2), 'namesCreatedInside': short['names'], 'ofThemEverSampled': short['caught'],
                    'catchRate': round(short['caught'] / short['names'], 3) if short['names'] else None}
out['longGapTotals'] = {'gaps': len(out['perLongGap']), 'seconds': round(sum(g['seconds'] for g in out['perLongGap']), 2),
                        'namesCreatedInside': sum(g['namesCreatedInside'] for g in out['perLongGap']), 'ofThemEverSampled': sum(g['ofThemEverSampled'] for g in out['perLongGap'])}
print(json.dumps(out, indent=1))
