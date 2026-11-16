#!/usr/bin/env python3
"""Which of the tests PR 544 adds fail under at least one mutant, and which under none.
Usage: kill-matrix.py <base-seven.json> <head-seven.json> <base-prod-head-tests.json> <mutant out.json>... """
import json, sys
def ids(p, root):
    out = set()
    for r in json.load(open(p))['testResults']:
        rel = r['name'].split('/' + root + '/')[-1]
        for a in r['assertionResults']:
            out.add(rel.rsplit('/', 1)[-1] + ' :: ' + a['fullName'][:140])
    return out
base, head = ids(sys.argv[1], 'code'), ids(sys.argv[2], 'clone')
added = sorted(head - base)
killers = {t: [] for t in added}
bp = json.load(open(sys.argv[3]))
for r in bp['testResults']:
    rel = r['name'].split('/clone/')[-1].rsplit('/', 1)[-1]
    for a in r['assertionResults']:
        k = rel + ' :: ' + a['fullName'][:140]
        if a['status'] != 'passed' and k in killers:
            killers[k].append('BASE')
for p in sys.argv[4:]:
    for row in json.load(open(p))['rows']:
        if row['id'] == 'CONTROL':
            continue
        for t in row.get('failedTests', []):
            if t in killers:
                killers[t].append(row['id'].split('-')[0])
never = [t for t, k in killers.items() if not k]
print('added', len(added), 'failing under at least one mutant or the base', len(added) - len(never), 'under none', len(never))
for t in never:
    print('  NONE', t)
