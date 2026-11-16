#!/usr/bin/env python3
"""For every mkdtemp class of the clean run: the record's upperBound against an independent recomputation at the carried gap, and
against the trace-aligned bound E (see bound_rederive.py) at several trace-latency allowances; and which names sit on a long gap.

Usage: bound_all_classes.py <evidence-dir>
"""
import bisect
import gzip
import json
import pathlib
import re
import sys

EV = pathlib.Path(sys.argv[1])
samples = json.loads((EV / 'runs/c0-clean.samples.json').read_text())
trace = [json.loads(l) for l in gzip.decompress((EV / 'runs/c0-clean.trace.jsonl.gz').read_bytes()).decode().splitlines()]
run = json.loads((EV / 'runs/c0-clean.json').read_text())
census = json.loads((EV / 'census-2026-10-24.json').read_text())
duration, entries = run['seconds'], samples['entries']
known = sorted({v[k] for v in entries.values() for k in ('first', 'last')} | {0.0})
gaps = [(a, b) for a, b in zip(known, known[1:])]
long_gaps = [(a, b) for a, b in gaps if round(b - a, 2) >= 1.0]
G = max(round(b - a, 2) for a, b in gaps if round(b - a, 2) < 1.0)

made = {}
for row in trace:
    if row['kind'] == 'mkdtemp':
        name = row['path'].rsplit('/', 1)[1]
        made.setdefault(name, (re.sub(r'-p\d+-n\d+-', '-p<pid>-n<ns>-', row['prefix']), row['t'] / 1000.0))


def before(t):
    i = bisect.bisect_left(known, t)
    return known[i - 1]


def after(t):
    i = bisect.bisect_right(known, t)
    return known[i] if i < len(known) else known[-1]


lo, hi = float('-inf'), float('inf')
for name, (_, t) in made.items():
    if name in entries:
        lo, hi = max(lo, t - entries[name]['first']), min(hi, t - before(entries[name]['first']))


def sup_never(t, delta):
    a, b = t - hi - delta, t - (lo - delta)
    best = 0.0
    for c in [a] + [s for s in known if a <= s <= b]:
        best = max(best, after(c) - c)
    return best


table_upper = {}
for r in census['leftBySIGKILL']:
    if r.get('exposureInTheCleanRun'):
        table_upper[r['class']] = r['exposureInTheCleanRun']['expectedNamesPresentAtARandomMoment']['upperBound']
for r in census['exposureRanking']['top']:
    table_upper.setdefault(r['class'], r['upperBound'])
for k, v in census['namedInTheBeadObservation'].items():
    if v.get('exposureInTheCleanRun'):
        table_upper.setdefault(k, v['exposureInTheCleanRun']['expectedNamesPresentAtARandomMoment']['upperBound'])

by_class = {}
for name, (cls, t) in made.items():
    by_class.setdefault(cls, []).append((name, t))
out = {'carriedGap': G, 'longGaps': [[a, b, round(b - a, 2)] for a, b in long_gaps], 'offsetWindow': round(hi - lo, 3), 'classes': len(by_class), 'perDelta': {}}
mine_at_G = {}
for cls, names in by_class.items():
    s = sum(entries[n]['last'] - entries[n]['first'] + 2 * G for n, _ in names if n in entries) + G * sum(1 for n, _ in names if n not in entries)
    mine_at_G[cls] = round(s / duration, 3)
compared = {c: (mine_at_G[c], table_upper[c]) for c in by_class if c in table_upper}
out['recordUpperComparedWithMine'] = {'compared': len(compared), 'equal': sum(1 for a, b in compared.values() if a == b), 'differ': {c: v for c, v in compared.items() if v[0] != v[1]}}
edges_on_long = []
for cls, names in by_class.items():
    for n, _ in names:
        if n in entries:
            f, l = entries[n]['first'], entries[n]['last']
            if round(f - before(f), 2) >= 1.0 or round(after(l) - l, 2) >= 1.0:
                edges_on_long.append((cls, n[-6:], round(f - before(f), 2), round(after(l) - l, 2)))
out['sampledNamesWithAnEdgeOnALongGap'] = {'count': len(edges_on_long), 'ofSampledNames': sum(1 for n in made if n in entries), 'classes': sorted({e[0] for e in edges_on_long})}
for delta in (0.05, 0.25, 0.5, 1.0):
    worse = {}
    never_in_long = 0
    for cls, names in by_class.items():
        e = sum(after(entries[n]['last']) - before(entries[n]['first']) for n, _ in names if n in entries)
        for n, t in names:
            if n not in entries:
                life = sup_never(t, delta)
                e += life
                never_in_long += life >= 1.0
        e = round(e / duration, 3)
        if e > mine_at_G[cls]:
            worse[cls] = {'E': e, 'atCarriedGap': mine_at_G[cls]}
    out['perDelta'][str(delta)] = {'classesWhereEExceedsTheCarriedGapBound': len(worse), 'neverSampledNamesWhoseWindowTouchesALongGap': never_in_long, 'worse': worse}
print(json.dumps(out, indent=1))
