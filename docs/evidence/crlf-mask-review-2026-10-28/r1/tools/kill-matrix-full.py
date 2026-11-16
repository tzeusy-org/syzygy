#!/usr/bin/env python3
"""kill-matrix.py with full test names: a test PR 544 adds is (file, full name) in the head run and not in the base run; it
counts as failing when its own name, cut to 140 characters, is among the failing names of the base-production run or of a
mutant run, and no other test shares that 140-character key (keys shared by several tests are reported apart).
Usage: kill-matrix-full.py <base-seven.json> <head-seven.json> <base-prod-head-tests.json> <mutant out.json>..."""
import json, sys
def full(p):
    out = set()
    for r in json.load(open(p))['testResults']:
        for a in r['assertionResults']:
            out.add((r['name'].rsplit('/', 1)[-1], a['fullName']))
    return out
def failing_keys(p):
    d = json.load(open(p))
    if 'testResults' in d:
        return {r['name'].rsplit('/', 1)[-1] + ' :: ' + a['fullName'][:140] for r in d['testResults'] for a in r['assertionResults'] if a['status'] != 'passed'}
    return {t for row in d['rows'] for t in row.get('failedTests', [])}
base, head = full(sys.argv[1]), full(sys.argv[2])
added = sorted(head - base)
fails = set()
for p in sys.argv[3:]:
    fails |= failing_keys(p)
key = lambda t: t[0] + ' :: ' + t[1][:140]
share = {}
for t in head:
    share.setdefault(key(t), []).append(t)
killed = [t for t in added if key(t) in fails]
never = [t for t in added if key(t) not in fails]
print('added', len(added), 'failing under the base or a mutant', len(killed), 'under none', len(never))
for t in never:
    print('  NONE', t[0], '::', t[1][-120:], '| key shared by', len(share[key(t)]))
print('killed tests whose key is shared:', sum(1 for t in killed if len(share[key(t)]) > 1))
