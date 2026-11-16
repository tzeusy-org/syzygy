#!/usr/bin/env python3
"""Compare the reviewer's re-run of pins-mutants.py with the lane's record, row by row: same id set, fragments, commits,
exits, totals, failed counts and failed-test names. Usage: compare-pins.py <lane.json> <rerun.json>; exit 1 on any difference."""
import json, sys
a = json.load(open(sys.argv[1])); b = json.load(open(sys.argv[2]))
ra = {r['id']: r for r in a['rows']}; rb = {r['id']: r for r in b['rows']}
diff = []
if set(ra) != set(rb): diff.append(('id sets', sorted(set(ra) ^ set(rb))))
for i in sorted(set(ra) & set(rb)):
    x, y = ra[i], rb[i]
    for k in ('file', 'old', 'new', 'expect', 'beforeExpected', 'ok'):
        if x[k] != y[k]: diff.append((i, k))
    for side in ('before', 'after'):
        if (x[side] is None) != (y[side] is None): diff.append((i, side, 'presence')); continue
        if x[side] is None: continue
        for k in ('commit', 'exit', 'total', 'failed', 'failedTestCount', 'filesFailedToLoad'):
            if x[side][k] != y[side][k]: diff.append((i, side, k, x[side][k], y[side][k]))
        if sorted(x[side]['failedTests']) != sorted(y[side]['failedTests']): diff.append((i, side, 'failedTests'))
for k in a['controls']:
    if (a['controls'][k]['exit'], a['controls'][k]['total'], a['controls'][k]['failed']) != (b['controls'][k]['exit'], b['controls'][k]['total'], b['controls'][k]['failed']):
        diff.append(('control', k))
print(json.dumps({'rowsLane': len(ra), 'rowsRerun': len(rb), 'controls': len(a['controls']), 'summaryEqual': a['summary'] == b['summary'], 'differences': diff}))
sys.exit(1 if diff or a['summary'] != b['summary'] else 0)
