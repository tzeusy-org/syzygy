#!/usr/bin/env python3
"""Re-derive the N1 figures (round-1 repair) from the committed tap aggregates, independently of the lane's
aggregate script. Usage: python3 -I n1_rederive.py <round0 aggregate.json> <repair1 aggregate.json> <out.json>

It sums the per-caller rows (not the lane's byOriginAndEncoder totals), so a disagreement between the two
would show. For each production lenient caller: calls, same, different, the why-different split; then the
totals, the undefined/BigInt split, the percentage (computed), and the per-caller delta round 0 -> repair1."""
import json
import sys


def prod_lenient(agg):
    rows = {}
    for r in agg['callers']:
        if r['origin'] == 'production' and r['kind'] == 'lenient':
            rows[r['caller']] = r
    return rows


def totals(rows):
    t = {'calls': 0, 'same': 0, 'different': 0, 'why': {}}
    for r in rows.values():
        t['calls'] += r['calls']
        t['same'] += r['same']
        t['different'] += r['different']
        for k, v in r['whyDifferent'].items():
            t['why'][k] = t['why'].get(k, 0) + v
    return t


r0 = json.load(open(sys.argv[1]))
r1 = json.load(open(sys.argv[2]))
p0, p1 = prod_lenient(r0), prod_lenient(r1)
t0, t1 = totals(p0), totals(p1)
summary_rows = {}
for name in sorted(set(p0) | set(p1)):
    a, b = p0.get(name), p1.get(name)
    summary_rows[name] = {
        'round0': None if a is None else {k: a[k] for k in ('calls', 'same', 'different')},
        'repair1': None if b is None else {k: b[k] for k in ('calls', 'same', 'different')},
        'repair1WhyDifferent': None if b is None else b['whyDifferent'],
        'repair1OutcomesWhenDifferent': None if b is None else b['outcomesWhenDifferent'],
        'deltaCalls': (b['calls'] if b else 0) - (a['calls'] if a else 0),
        'deltaDifferent': (b['different'] if b else 0) - (a['different'] if a else 0),
    }
alike_everywhere = [n for n, r in p1.items() if r['different'] == 0]
out = {
    'method': 'sum of production/lenient caller rows of each aggregate; percentage computed here',
    'round0Totals': t0,
    'repair1Totals': t1,
    'repair1ByOriginAndEncoderProductionLenient': [x for x in r1['byOriginAndEncoder'] if x['origin'] == 'production' and x['encoder'] == 'lenient'],
    'repair1PercentDifferent': round(100 * t1['different'] / t1['calls'], 2),
    'round0PercentDifferent': round(100 * t0['different'] / t0['calls'], 2),
    'callersAlikeOnEveryCall': sorted(alike_everywhere),
    'rows': summary_rows,
    'linesRead': {'round0': r0['linesRead'], 'repair1': r1['linesRead']},
    'files': {'round0': r0['files'], 'repair1': r1['files']},
}
json.dump(out, open(sys.argv[3], 'w'), indent=1)
print(json.dumps({k: out[k] for k in ('round0Totals', 'repair1Totals', 'repair1PercentDifferent', 'round0PercentDifferent', 'callersAlikeOnEveryCall', 'linesRead', 'files')}))
for n, r in summary_rows.items():
    print(n, r['round0'], r['repair1'], 'delta', r['deltaCalls'], r['deltaDifferent'], r['repair1WhyDifferent'])
