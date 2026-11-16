#!/usr/bin/env python3
"""Compare two census records key by key; print every differing JSON path (at most 60), ignoring nothing.

Usage: compare_records.py <committed.json> <rerun.json>
"""
import json
import sys

a, b = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
diffs = []


def walk(x, y, path):
    if type(x) is not type(y):
        diffs.append((path, 'type', repr(x)[:120], repr(y)[:120]))
        return
    if isinstance(x, dict):
        for k in sorted(set(x) | set(y)):
            if k not in x or k not in y:
                diffs.append((path + '/' + k, 'missing in ' + ('rerun' if k in x else 'committed'), repr(x.get(k))[:120], repr(y.get(k))[:120]))
            else:
                walk(x[k], y[k], path + '/' + k)
    elif isinstance(x, list):
        if len(x) != len(y):
            diffs.append((path, 'length', len(x), len(y)))
        for i, (p, q) in enumerate(zip(x, y)):
            walk(p, q, f'{path}[{i}]')
    elif x != y:
        diffs.append((path, 'value', repr(x)[:120], repr(y)[:120]))


walk(a, b, '')
print('differing paths:', len(diffs))
for d in diffs[:60]:
    print(d)
