# Usage: compare_states.py <absent.json> <present.json>: rows whose failing-test set or exit differs between the two dist states; timeouts.
import json, sys
a, p = (json.load(open(f)) for f in sys.argv[1:3])
print('absent', a['commit'][:8], 'dist', len(a['dist']), 'present', p['commit'][:8], 'dist', len(p['dist']), 'statusAfter', repr(a['statusAfter']), repr(p['statusAfter']))
pa = {r['id']: r for r in p['rows']}
diff = []
for r in a['rows']:
    q = pa[r['id']]
    if (r['exit'], sorted(f['name'] for f in r['failed']), r['fileMessages']) != (q['exit'], sorted(f['name'] for f in q['failed']), q['fileMessages']): diff.append(r['id'])
msgs = [(r['id'], f['message']) for d in (a, p) for r in d['rows'] for f in r['failed']]
print('rows', len(a['rows']), len(p['rows']), 'differ', diff, 'timeouts', [i for i, m in msgs if 'timed out' in m.lower()])
for r in a['rows']:
    print(f"{r['id']}: exit {r['exit']}; " + ('; '.join(f['message'][:110] for f in r['failed']) or 'no failure'))
