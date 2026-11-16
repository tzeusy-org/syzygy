#!/usr/bin/env python3
"""Round-3 re-derivation of the long-gap counts from the stored clean run, written without long_gap_trace.

Usage: long_gaps_r3.py <evidence-directory> <census.json> <out.json>

Independent of the assembler: reads the gzipped trace and the sampler record directly, takes each traced name's creation time as the
smallest trace time of any row naming it, finds the clock window by an explicit scan, assigns names to gaps with a two-pointer sweep,
and reads the published classes from every upperBound the census record carries. Then it recounts under offsets across and beyond the
window, with and without the run start as an instant, to show which counts move.
"""
import gzip
import json
import os
import pathlib
import re
import sys

EV, CENSUS, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
LABEL = 'c0-clean'
census = json.loads(CENSUS.read_text())
samples = json.loads((EV / 'runs' / f'{LABEL}.samples.json').read_text())
rows = [json.loads(line) for line in gzip.decompress((EV / 'runs' / f'{LABEL}.trace.jsonl.gz').read_bytes()).decode().splitlines()]
interval = samples['intervalSeconds']
seen = samples['entries']

# Traced names: creation time is the smallest t over the rows that name the path's basename; the class of a mkdtemp name is its prefix
# with owner-pid digits replaced.
made_at, first_in_file, kind_of, prefix_of = {}, {}, {}, {}
for row in rows:
    name = os.path.basename(row['path'])
    t = row['t'] / 1000.0
    if name not in first_in_file:
        first_in_file[name] = t
    made_at[name] = min(made_at.get(name, t), t)
    if row['kind'] == 'mkdtemp':
        kind_of[name] = 'mkdtemp'
        prefix_of[name] = re.sub(r'-p\d+-n\d+-', '-p<pid>-n<ns>-', row['prefix'])
    else:
        kind_of.setdefault(name, row['kind'])
order_differs = sum(1 for n in made_at if made_at[n] != first_in_file[n])


def class_of(name):
    if kind_of.get(name) == 'mkdtemp':
        return prefix_of[name]
    if name in kind_of:
        for other, p in prefix_of.items():
            if name.startswith(other) and name != other:
                return p + '<random>' + name[len(other):]
        return name
    if re.match(r'^\.?(?:com\.google\.Chrome|org\.chromium\.Chromium)\.[A-Za-z0-9]+$', name):
        return 'chrome-singleton-directory'
    if re.match(r'^[A-Za-z0-9_-]{21}$', name) and not re.match(r'^[A-Za-z]{3,}(?:[-_][A-Za-z]{3,})*-[A-Za-z0-9]{6}$', name):
        return 'nanoid-21'
    if name == 'node-compile-cache':
        return name
    return re.sub(r'(?<![A-Za-z0-9])\d+(?![A-Za-z0-9])', '<n>', name)


# Published classes: every object in the record that carries an upperBound, and the class it belongs to.
published, bound_sites = set(), []


def walk(value, path, cls=None):
    if isinstance(value, dict):
        here = value.get('class', cls)
        if 'upperBound' in value:
            bound_sites.append(path)
            published.add(here)
        for k, v in value.items():
            walk(v, f'{path}/{k}', k if path.endswith('namedInTheBeadObservation') else here)
    elif isinstance(value, list):
        for i, v in enumerate(value):
            walk(v, f'{path}[{i}]', cls)


walk(census, '')
bound_roots = sorted({re.sub(r'\[\d+\].*|/(?=[^/]*$).*', '', p.split('/expectedNamesPresentAtARandomMoment')[0]) for p in bound_sites})


def instants(with_start):
    pts = sorted({v for s in seen.values() for v in (s['first'], s['last'])} | ({0.0} if with_start else set()))
    return pts


def window(pts):
    lo, hi = -float('inf'), float('inf')
    for name, t in made_at.items():
        if name not in seen:
            continue
        first = seen[name]['first']
        prev = None
        for p in pts:
            if p < first:
                prev = p
            else:
                break
        lo = max(lo, t - first)
        if prev is not None:
            hi = min(hi, t - prev)
    return lo, hi


def count(pts, offset, long_test):
    gaps = list(zip(pts, pts[1:]))
    created = sorted((t - offset, n) for n, t in made_at.items())
    inside = {i: [] for i in range(len(gaps))}
    nowhere = 0
    j = 0
    for when, name in created:
        while j < len(gaps) and when > gaps[j][1]:
            j += 1
        if j < len(gaps) and gaps[j][0] < when <= gaps[j][1]:
            inside[j].append(name)
        else:
            nowhere += 1
    totals = {'long': [0, 0, 0, 0.0], 'short': [0, 0, 0, 0.0]}
    long_idx = set()
    for i, (a, b) in enumerate(gaps):
        k = 'long' if long_test(a, b) else 'short'
        if k == 'long':
            long_idx.add(i)
        totals[k][0] += 1
        totals[k][1] += len(inside[i])
        totals[k][2] += sum(1 for n in inside[i] if n in seen)
        totals[k][3] += b - a
    in_long = {n for i in long_idx for n in inside[i]}

    def beside(name):
        f, l = seen[name]['first'], seen[name]['last']
        before = max((p for p in pts if p < f), default=None)
        after = min((p for p in pts if p > l), default=None)
        return (before is not None and long_test(before, f)) or (after is not None and long_test(l, after))

    per_class = {}
    for name in set(seen) | set(made_at):
        c = class_of(name)
        if c not in published:
            continue
        slot = per_class.setdefault(c, {'names': 0, 'sampled': 0, 'neverSampled': 0, 'neverSampledInALongGap': 0, 'sampledBesideALongGap': 0})
        slot['names'] += 1
        if name in seen:
            slot['sampled'] += 1
            slot['sampledBesideALongGap'] += beside(name)
        else:
            slot['neverSampled'] += 1
            slot['neverSampledInALongGap'] += name in in_long
    dependent = sorted(c for c, s in per_class.items() if s['neverSampledInALongGap'] or s['sampledBesideALongGap'])
    return {'gaps': len(gaps), 'long': {'gaps': totals['long'][0], 'names': totals['long'][1], 'sampled': totals['long'][2], 'seconds': round(totals['long'][3], 2)},
            'short': {'gaps': totals['short'][0], 'names': totals['short'][1], 'sampled': totals['short'][2], 'seconds': round(totals['short'][3], 2)},
            'createdInNoGap': nowhere, 'dependent': dependent, 'perClass': per_class}


two = lambda a, b: round(b - a, 2) >= 2 * interval
pts = instants(True)
lo, hi = window(pts)
mid = (lo + hi) / 2
base = count(pts, mid, two)

# finding[4]'s five: the bead-observation classes none of the three kills left.
named = census['namedInTheBeadObservation']
five = sorted(k for k, v in named.items() if v.get('leftInAnyOfTheKills') == 'none of the three')

# Per-class cross-check against the record's own exposure counts.
record_counts = {}
for r in census['leftBySIGKILL']:
    if r.get('exposureInTheCleanRun'):
        record_counts[r['class']] = (r['exposureInTheCleanRun']['namesSampled'], r['exposureInTheCleanRun']['namesNeverSampled'])
for k, v in named.items():
    if v.get('exposureInTheCleanRun'):
        record_counts[k] = (v['exposureInTheCleanRun']['namesSampled'], v['exposureInTheCleanRun']['namesNeverSampled'])
mismatch = {c: {'mine': (s['sampled'], s['neverSampled']), 'record': record_counts[c]} for c, s in base['perClass'].items() if c in record_counts and record_counts[c] != (s['sampled'], s['neverSampled'])}

# Sensitivity: offsets across the window and beyond it, the start instant dropped, and the gap test with a strict comparison.
probe = {}
for label, off in (('lower', lo), ('upper', hi), ('mid-0.01', mid - 0.01), ('mid+0.01', mid + 0.01), ('mid-0.05', mid - 0.05), ('mid+0.05', mid + 0.05), ('mid-0.25', mid - 0.25), ('mid+0.25', mid + 0.25)):
    r = count(pts, off, two)
    probe[label] = {'long': r['long'], 'short': r['short'], 'createdInNoGap': r['createdInNoGap'], 'dependent': len(r['dependent']), 'dependentSameAsMid': r['dependent'] == base['dependent']}
no_start = instants(False)
lo2, hi2 = window(no_start)
r = count(no_start, (lo2 + hi2) / 2, two)
probe['withoutTheStartInstant'] = {'window': [round(lo2, 3), round(hi2, 3)], 'long': r['long'], 'short': r['short'], 'createdInNoGap': r['createdInNoGap'], 'dependent': len(r['dependent'])}
r = count(pts, mid, lambda a, b: round(b - a, 2) > 2 * interval)
probe['strictGapTest'] = {'long': r['long'], 'short': r['short'], 'dependent': r['dependent']}

stored = census['exposureRanking']['longGapsInTheTrace']
result = {
    'interval': interval, 'instantsWithStart': len(pts), 'tracedNames': len(made_at), 'tracedNamesTheSamplerSaw': sum(1 for n in made_at if n in seen),
    'namesWhoseSmallestTIsNotTheirFirstRow': order_differs,
    'window': {'lower': round(lo, 4), 'upper': round(hi, 4), 'width': round(hi - lo, 4), 'mid': round(mid, 3)},
    'long': base['long'], 'short': base['short'], 'createdInNoGap': base['createdInNoGap'],
    'publishedClasses': len(published), 'upperBoundSites': len(bound_sites), 'upperBoundRoots': bound_roots,
    'dependent': base['dependent'], 'dependentDetail': {c: base['perClass'][c] for c in base['dependent']},
    'findingFourClasses': five, 'findingFourDependent': [c for c in five if c in base['dependent']],
    'perClassCountMismatchWithRecord': mismatch, 'classesCrossChecked': sum(1 for c in base['perClass'] if c in record_counts),
    'publishedWithNoNameInTheCleanRun': sorted(published - set(base['perClass'])),
    'agreesWithStored': {
        'tracedNames': stored['tracedNames'] == len(made_at),
        'long': (stored['gapsOfTwoIntervalsOrMore']['gaps'], stored['gapsOfTwoIntervalsOrMore']['namesCreatedInside'], stored['gapsOfTwoIntervalsOrMore']['ofThemEverSampled']) == (base['long']['gaps'], base['long']['names'], base['long']['sampled']),
        'short': (stored['shorterGaps']['gaps'], stored['shorterGaps']['namesCreatedInside'], stored['shorterGaps']['ofThemEverSampled']) == (base['short']['gaps'], base['short']['names'], base['short']['sampled']),
        'dependentSet': sorted(stored['publishedClassesThatDependOnThem']) == base['dependent'],
        'dependentDetail': all(stored['publishedClassesThatDependOnThem'][c] == {'names': base['perClass'][c]['names'], 'neverSampledCreatedInALongGap': base['perClass'][c]['neverSampledInALongGap'], 'sampledWithALongGapBesideItsSightings': base['perClass'][c]['sampledBesideALongGap']} for c in base['dependent']),
        'publishedCount': stored['publishedClasses'] == len(published),
        'windowWidth': stored['clockOffsetWindowSeconds'] == round(hi - lo, 3),
    },
    'sensitivity': probe,
}
OUT.write_text(json.dumps(result, indent=1) + '\n')
print(json.dumps({k: result[k] for k in ('tracedNames', 'tracedNamesTheSamplerSaw', 'window', 'long', 'short', 'createdInNoGap', 'publishedClasses', 'dependent', 'findingFourClasses', 'findingFourDependent', 'perClassCountMismatchWithRecord', 'classesCrossChecked', 'publishedWithNoNameInTheCleanRun', 'agreesWithStored', 'upperBoundRoots', 'namesWhoseSmallestTIsNotTheirFirstRow')}, indent=1))
