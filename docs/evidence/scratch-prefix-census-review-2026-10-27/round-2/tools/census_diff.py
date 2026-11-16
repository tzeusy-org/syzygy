#!/usr/bin/env python3
"""Compare the round-1 census with the regenerated one.

Usage: census_diff.py <census-r1.json> <census-r2.json>

1. Per class (leftBySIGKILL plus neverLeftInTheseKills, keyed by class): the class set, and for each class every field of the row
   compared by value; prints the fields that differ, per field name, with the count of classes.
2. A full recursive diff of the two records: every differing JSON path, grouped by its path with list indexes and class keys elided.
"""
import collections
import json
import re
import sys

a, b = (json.load(open(p)) for p in sys.argv[1:3])


def rows(rec):
    out = {}
    for section in ('leftBySIGKILL', 'neverLeftInTheseKills'):
        for r in rec[section]:
            assert r['class'] not in out, r['class']
            out[r['class']] = (section, r)
    return out


ra, rb = rows(a), rows(b)
print('classes r1', len(ra), 'r2', len(rb), 'onlyR1', sorted(set(ra) - set(rb)), 'onlyR2', sorted(set(rb) - set(ra)))
print('section moved', sorted(c for c in ra if c in rb and ra[c][0] != rb[c][0]))
LOAD_BEARING = ('family', 'rule', 'disposition', 'creatingFiles', 'created', 'testFiles', 'leftAfterSIGKILL', 'afterTheNextFreshRun', 'leftByTheFreshRunItself', 'leftAfterCleanRun')
field_diffs = collections.Counter()
examples = {}
for c in sorted(set(ra) & set(rb)):
    x, y = ra[c][1], rb[c][1]
    for k in sorted(set(x) | set(y)):
        if x.get(k, '<absent>') != y.get(k, '<absent>'):
            field_diffs[k] += 1
            examples.setdefault(k, (c, x.get(k, '<absent>'), y.get(k, '<absent>')))
print('load-bearing fields equal for every class:', {k: all(ra[c][1].get(k) == rb[c][1].get(k) for c in ra if c in rb) for k in LOAD_BEARING})
print('rows compared', len(set(ra) & set(rb)), 'fields differing (field: classes):', dict(field_diffs))
for k, (c, x, y) in examples.items():
    print('  example', k, c, '|', json.dumps(x)[:300], '->', json.dumps(y)[:300])


def walk(x, y, path, out):
    if isinstance(x, dict) and isinstance(y, dict):
        for k in sorted(set(x) | set(y)):
            if k not in x:
                out.append((path + '/' + k, 'added'))
            elif k not in y:
                out.append((path + '/' + k, 'removed'))
            else:
                walk(x[k], y[k], path + '/' + k, out)
    elif isinstance(x, list) and isinstance(y, list):
        if len(x) != len(y):
            out.append((path, 'list length %d -> %d' % (len(x), len(y))))
        for i, (p, q) in enumerate(zip(x, y)):
            walk(p, q, '%s[%d]' % (path, i), out)
    elif x != y:
        out.append((path, 'changed'))


diffs = []
walk(a, b, '', diffs)
groups = collections.Counter()
for path, what in diffs:
    g = re.sub(r'\[\d+\]', '[]', path)
    g = re.sub(r'^/(neverSeen|perCreatingFile)/.*', r'/\1/*', g)
    g = re.sub(r'^/staticCoverage/neverSeen/.*', '/staticCoverage/neverSeen/*', g)
    groups[(g, what)] += 1
print('differing paths', len(diffs), 'groups', len(groups))
for (g, what), n in sorted(groups.items()):
    print('  %4d  %s  %s' % (n, what, g))
