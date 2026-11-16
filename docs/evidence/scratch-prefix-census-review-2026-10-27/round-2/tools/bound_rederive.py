#!/usr/bin/env python3
"""Re-derive the clean run's exposure bounds for the five never-left prefixes, independently of assemble_census.py.

Usage: bound_rederive.py <evidence-dir>

Reads runs/c0-clean.samples.json, runs/c0-clean.trace.jsonl.gz and runs/c0-clean.json only. Classes are taken from the trace's
mkdtemp prefix (owner-pid digits normalised); a name is in a class when a mkdtemp trace row of that prefix made it.

Methods:
  A(g)  the record's method: sampled name = last - first + 2g, never-sampled name = g; sum / run seconds.
  D     no gap assumption: a sampled name lived at most from the latest known sample instant before its first sighting to the
        earliest known sample instant after its last (known instants = every first/last sighting, plus 0.0, the sampler's first
        listing); a never-sampled name lived at most the longest gap between consecutive known instants.
  E     trace-aligned: the sampler clock's offset O against the trace's epoch is bracketed by the sampled names (created at or before
        the trace time t, after the previous sample, at or before the first sighting); a never-sampled name created at or before
        t - O was gone by the next known instant after its creation. Assumes the trace time is within DELTA of the creation (the
        tracer logs after the call returns).
"""
import bisect
import gzip
import json
import pathlib
import re
import sys

EV = pathlib.Path(sys.argv[1])
CLASSES = ('syzygy-public-screen-', 'syzygy-trigger-', 'syzygy-dossier-src-', 'syzygy-trigger-repo-', 'syzygy-poc-surface-state-')
samples = json.loads((EV / 'runs/c0-clean.samples.json').read_text())
trace = [json.loads(l) for l in gzip.decompress((EV / 'runs/c0-clean.trace.jsonl.gz').read_bytes()).decode().splitlines()]
run = json.loads((EV / 'runs/c0-clean.json').read_text())
duration = run['seconds']
entries = samples['entries']

instants = sorted({v[k] for v in entries.values() for k in ('first', 'last')})
known = sorted(set(instants) | {0.0})
gaps = [round(b - a, 2) for a, b in zip(instants, instants[1:])]
known_gaps = [round(b - a, 2) for a, b in zip(known, known[1:])]
under = [g for g in gaps if g < 1.0]
over = sorted(g for g in gaps if g >= 1.0)

made = {}
for row in trace:
    if row['kind'] == 'mkdtemp':
        name = row['path'].rsplit('/', 1)[1]
        made.setdefault(name, (re.sub(r'-p\d+-n\d+-', '-p<pid>-n<ns>-', row['prefix']), row['t'] / 1000.0))


def before(t):
    i = bisect.bisect_left(known, t)
    return known[i - 1] if i > 0 else None


def after(t):
    i = bisect.bisect_right(known, t)
    return known[i] if i < len(known) else None


# Offset window from every sampled mkdtemp name: t - first <= O (created by the first sighting, logged at or after creation:
# creation <= t, so only O >= t_creation - first holds; with t >= creation we get O >= t - first - DELTA), and
# O < t - prev (created after the previous sample, and creation <= t).
lo, hi = float('-inf'), float('inf')
for name, (prefix, t) in made.items():
    if name in entries:
        first = entries[name]['first']
        p = before(first)
        lo = max(lo, t - first)
        if p is not None:
            hi = min(hi, t - p)
DELTA = 0.05


def sup_life_never(t):
    """Sup over offsets in [lo - DELTA, hi] and creations in [t - O - DELTA, t - O] of (next known instant after creation - creation)."""
    a, b = t - hi - DELTA, t - (lo - DELTA)
    cands = [a] + [s for s in known if a <= s <= b]
    best = 0.0
    for c in cands:
        n = after(c)
        if n is None:
            n = known[-1]
        best = max(best, n - c)
    return best


out = {'run': 'c0-clean', 'duration': duration, 'interval': samples['intervalSeconds'], 'sightingInstants': len(instants), 'gaps': len(gaps),
       'gapsUnder1s': len(under), 'maxGapUnder1s': max(under), 'gapsOf1sOrMore': over, 'maxGap': max(gaps),
       'knownInstantsWithZero': len(known), 'maxKnownGap': max(known_gaps), 'offsetWindowSeconds': round(hi - lo, 3), 'perClass': {}}
for cls in CLASSES:
    names = [n for n, (p, _) in made.items() if p == cls]
    sampled = [n for n in names if n in entries]
    never = [n for n in names if n not in entries]
    row = {'names': len(names), 'sampled': len(sampled), 'never': len(never)}
    span = sum(entries[n]['last'] - entries[n]['first'] for n in sampled)
    row['lower'] = round(span / duration, 3)
    for label, g in (('A_0.50', 0.5), ('A_0.61', max(under)), ('A_maxGap', max(gaps))):
        row[label] = round((span + 2 * g * len(sampled) + g * len(never)) / duration, 3)
    d = sum(after(entries[n]['last']) - before(entries[n]['first']) for n in sampled) + max(known_gaps) * len(never)
    row['D_noGapAssumption'] = round(d / duration, 3)
    e_sampled = sum(after(entries[n]['last']) - before(entries[n]['first']) for n in sampled)
    e_never = sum(sup_life_never(made[n][1]) for n in never)
    row['E_traceAligned'] = round((e_sampled + e_never) / duration, 3)
    # Which gaps the sampled names' edges touch: the before-gap and after-gap of each sampled name.
    edge_gaps = sorted(round(entries[n]['first'] - before(entries[n]['first']), 2) for n in sampled) + sorted(round(after(entries[n]['last']) - entries[n]['last'], 2) for n in sampled)
    row['sampledEdgeGapsMax'] = max(edge_gaps) if edge_gaps else None
    row['sampledEdgesOnALongGap'] = sum(1 for g in edge_gaps if g >= 1.0)
    out['perClass'][cls] = row
out['maxOverFive'] = {k: max(v[k] for v in out['perClass'].values()) for k in ('A_0.50', 'A_0.61', 'A_maxGap', 'D_noGapAssumption', 'E_traceAligned')}
print(json.dumps(out, indent=1))
