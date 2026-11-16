"""Test delta by (file, full name) between two vitest JSON reports of the seven files. Usage: python3 -I name-delta.py <base.json> <head.json>"""
import json, os, sys
from collections import Counter
def names(p):
    d = json.load(open(p))
    c = Counter()
    for r in d['testResults']:
        f = r['name'].split('/clone/')[-1].split('/base/')[-1]
        for a in r['assertionResults']:
            c[(f, a['fullName'])] += 1
    return d['numTotalTests'], c
bt, b = names(sys.argv[1]); ht, h = names(sys.argv[2])
added = h - b; removed = b - h
print('base tests', bt, 'head tests', ht, '| added', sum(added.values()), 'removed', sum(removed.values()), '| check', bt + sum(added.values()) - sum(removed.values()) == ht)
print('duplicate names: base', sum(v - 1 for v in b.values() if v > 1), 'head', sum(v - 1 for v in h.values() if v > 1))
for k in sorted(removed): print('  removed:', k[0].split('/')[-1], '::', k[1][:150])
