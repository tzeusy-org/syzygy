#!/usr/bin/env python3
"""Which published upperBound values rest on the 12 long sighting gaps being quiet stretches?

For each class whose upperBound the census publishes (leftBySIGKILL rows, namedInTheBeadObservation, exposureRanking.top), count
its names whose aligned trace creation time falls inside a gap of 1.0 s or more, and its sampled names with an edge on such a gap.
A class with neither has a bound that does not depend on the gap assumption.

Usage: published_dependence.py <evidence-dir>
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
census = json.loads((EV / 'census-2026-10-24.json').read_text())
entries = samples['entries']
known = sorted({v[k] for v in entries.values() for k in ('first', 'last')} | {0.0})
long_gaps = [(a, b) for a, b in zip(known, known[1:]) if round(b - a, 2) >= 1.0]
made = {}
for row in trace:
    if row['kind'] == 'mkdtemp':
        name = row['path'].rsplit('/', 1)[1]
        made.setdefault(name, (re.sub(r'-p\d+-n\d+-', '-p<pid>-n<ns>-', row['prefix']), row['t'] / 1000))
lo, hi = float('-inf'), float('inf')
for name, (_, t) in made.items():
    if name in entries:
        f = entries[name]['first']
        i = bisect.bisect_left(known, f)
        lo, hi = max(lo, t - f), min(hi, t - known[i - 1])
offset = (lo + hi) / 2
in_long = lambda x: any(a < x <= b for a, b in long_gaps)


def edge_on_long(n):
    f, l = entries[n]['first'], entries[n]['last']
    i, j = bisect.bisect_left(known, f), bisect.bisect_right(known, l)
    return round(f - known[i - 1], 2) >= 1.0 or (j < len(known) and round(known[j] - l, 2) >= 1.0)


published = {}
for r in census['leftBySIGKILL']:
    if r.get('exposureInTheCleanRun'):
        published.setdefault(r['class'], set()).add('leftBySIGKILL')
for k, v in census['namedInTheBeadObservation'].items():
    if v.get('exposureInTheCleanRun'):
        published.setdefault(k, set()).add('namedInTheBeadObservation')
for r in census['exposureRanking']['top']:
    published.setdefault(r['class'], set()).add('exposureRanking.top')
rows = {}
for cls, where in sorted(published.items()):
    names = [n for n, (p, _) in made.items() if p == cls]
    if not names:
        rows[cls] = {'where': sorted(where), 'note': 'not a mkdtemp class (classed by shape); its names have no trace time'}
        continue
    created_in_long = sum(1 for n in names if n not in entries and in_long(made[n][1] - offset))
    edges = sum(1 for n in names if n in entries and edge_on_long(n))
    rows[cls] = {'where': sorted(where), 'names': len(names), 'neverSampledCreatedInALongGap': created_in_long, 'sampledWithAnEdgeOnALongGap': edges}
dependent = {c: r for c, r in rows.items() if r.get('neverSampledCreatedInALongGap') or r.get('sampledWithAnEdgeOnALongGap')}
five = ('syzygy-public-screen-', 'syzygy-trigger-', 'syzygy-dossier-src-', 'syzygy-trigger-repo-', 'syzygy-poc-surface-state-')
print(json.dumps({'publishedClasses': len(rows), 'mkdtempPublished': sum(1 for r in rows.values() if 'names' in r),
                  'dependOnTheLongGaps': len(dependent), 'dependent': dependent, 'theFive': {c: rows[c] for c in five},
                  'shapeClasses': {c: r for c, r in rows.items() if 'note' in r}}, indent=1))
