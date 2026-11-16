#!/usr/bin/env python3
"""Re-derive the exposure bounds of the clean run from the stored sampler and trace, and test whether the published upper bound bounds.

Usage: exposure_check.py <evidence-dir>

A name first sighted at sample s_i and last at s_j was created after s_(i-1) and removed before s_(j+1), so its lifetime is at most
(last - first) + gap_before + gap_after; a never-sampled name lived less than one gap. The record adds one interval (0.5 s) per
sampled name. This script (1) estimates the real sample period from the distinct sighting times (each is a sample instant),
(2) recomputes the five bead-named classes' upper bounds with one and with two gaps, at the nominal 0.5 s and at the observed
median gap, and (3) prints the published figure beside them.
"""
import collections
import gzip
import json
import os
import pathlib
import re
import statistics
import sys

d = pathlib.Path(sys.argv[1])
census = json.loads((d / 'census-2026-10-24.json').read_text())
samples = json.loads((d / 'runs/c0-clean.samples.json').read_text())
run = json.loads((d / 'runs/c0-clean.json').read_text())
rows = [json.loads(l) for l in gzip.decompress((d / 'runs/c0-clean.trace.jsonl.gz').read_bytes()).decode().splitlines()]
duration, interval = run['seconds'], samples['intervalSeconds']
instants = sorted({v['first'] for v in samples['entries'].values()} | {v['last'] for v in samples['entries'].values()})
gaps = [b - a for a, b in zip(instants, instants[1:])]
small = [g for g in gaps if g < 2.0]
print('sampler seconds', samples['seconds'], 'run seconds', duration, 'distinct sighting instants', len(instants))
print('gaps between consecutive distinct instants: min', round(min(gaps), 3), 'median (<2 s)', round(statistics.median(small), 3), 'p90 (<2 s)', round(sorted(small)[int(0.9 * len(small))], 3), 'max', round(max(gaps), 2))
OWNER_PID = re.compile(r'-p\d+-n\d+-')
made = {os.path.basename(r['path']): OWNER_PID.sub('-p<pid>-n<ns>-', r['prefix']) for r in rows if r['kind'] == 'mkdtemp'}
named = ['syzygy-dossier-src-', 'syzygy-poc-surface-state-', 'syzygy-public-screen-', 'syzygy-trigger-', 'syzygy-trigger-repo-', 'syzygy-build-output-']
med = statistics.median(small)
for cls in named:
    names = [n for n, p in made.items() if p == cls]
    seen = [samples['entries'][n] for n in names if n in samples['entries']]
    unseen = len(names) - len(seen)
    span = sum(v['last'] - v['first'] for v in seen)
    pub = next(r for r in census['leftBySIGKILL'] + census['neverLeftInTheseKills'] if r['class'] == cls)
    pub_ub = census['namedInTheBeadObservation'][cls]['exposureInTheCleanRun']['expectedNamesPresentAtARandomMoment']['upperBound']
    calc = lambda per_sampled, per_unseen: round((span + per_sampled * len(seen) + per_unseen * unseen) / duration, 3)
    print(f'{cls}: names {len(names)} sampled {len(seen)} never {unseen} | published upper {pub_ub} | one 0.5 s gap {calc(interval, interval)} | two 0.5 s gaps {calc(2 * interval, interval)} | two median gaps {calc(2 * med, med)}')
