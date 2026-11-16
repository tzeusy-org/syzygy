#!/usr/bin/env python3
"""Summarise check_evidence_currency.py --json outputs and diff their population-B rows.

Usage: ec-compare.py <ec-A.json> <ec-B.json> [<ec-C.json> ...]
Prints the population-B summary counts of each, then the records whose row differs between the first and each later file,
and the records present in only one of them.
"""
import json
import sys

files = sys.argv[1:]
data = [json.load(open(f)) for f in files]


def pop_b(d):
    return d['populationB_evidenceRecords']


def summary(b):
    return {k: v for k, v in b.items() if not isinstance(v, (list, dict))}


def rows(b):
    for k, v in b.items():
        if isinstance(v, list) and v and isinstance(v[0], dict) and ('file' in v[0] or 'path' in v[0] or 'record' in v[0]):
            return {r.get('file') or r.get('path') or r.get('record'): r for r in v}
    return {}


for f, d in zip(files, data):
    b = pop_b(d)
    print(f, 'measuredOn', d.get('measuredOn'), summary(b))
base = rows(pop_b(data[0]))
for f, d in zip(files[1:], data[1:]):
    other = rows(pop_b(d))
    changed = sorted(p for p in set(base) & set(other) if base[p] != other[p])
    only_a = sorted(set(base) - set(other))
    only_b = sorted(set(other) - set(base))
    print(f'{files[0]} -> {f}: rows {len(base)} -> {len(other)}; changed {len(changed)}; only in first {len(only_a)}; only in second {len(only_b)}')
    for p in changed:
        print('   changed', p)
    for p in only_b:
        print('   only in second', p)
    for p in only_a:
        print('   only in first', p)
