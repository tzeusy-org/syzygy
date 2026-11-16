#!/usr/bin/env python3
"""Re-derive the sized set from the retained records without the sizing script (rev-520).

usage: python3 -I rederive.py EVIDENCE_DIR SOURCE_PLACEMENT.json HEAD_SUMMARY.json SIZING.json
Denominator: the fullNames of my own head runs (HEAD_SUMMARY.json). Observations: every run of before-alone, before-full-1,
before-full-2 and the load-127 extract. Rule as stated in the PR: worst > 2500 ms -> ceil(worst * 3 / 5000) * 5000 ms.
The expected set is compared with the timeouts the source carries (SOURCE_PLACEMENT.json, parsed from source by
check_identity.py) and with the committed timeout-sizing.json rows."""
import json, math, os, sys

ev, placement_path, head_path, sizing_path = sys.argv[1:5]
head = json.load(open(head_path))
denominators = [sorted(t['name'] for t in r['tests']) for r in head['runs']]
assert all(d == denominators[0] for d in denominators), 'head runs disagree on the population'
names = denominators[0]
print('denominator (my head runs):', len(names), 'distinct:', len(set(names)), 'runs:', len(head['runs']))
obs = {}
for rec in ('before-alone.json', 'before-full-1.json', 'before-full-2.json'):
    d = json.load(open(os.path.join(ev, rec)))
    for r in d['runs']:
        run_names = [t['name'] for t in r['tests']]
        print(f'  {rec} run {r["index"]}: {len(run_names)} tests, {len(set(run_names))} distinct, same set as mine: {sorted(run_names) == names}')
        for t in r['tests']:
            obs.setdefault(t['name'], []).append((t['durationMs'], t['status'] != 'passed', f'{rec}#{r["index"]}'))
x = json.load(open(os.path.join(ev, 'load-127-report-extract.json')))
xa = x['testResults'][0]['assertionResults']
print(f'  extract: {len(xa)} tests, {len({t["fullName"] for t in xa})} distinct, same set as mine: {sorted(t["fullName"] for t in xa) == names}')
for t in xa:
    obs.setdefault(t['fullName'], []).append((round(t['duration']), t['status'] != 'passed', 'load-127'))
print('names observed but not in my denominator:', sorted(set(obs) - set(names)))
print('names in my denominator never observed:', sorted(set(names) - set(obs)))
expected = {}
worst_unsized = (0, None)
for n in names:
    d, lb, src = max(obs[n])
    if d > 2500:
        expected[n] = (math.ceil(d * 3 / 5000) * 5000, d, lb, src)
    elif d > worst_unsized[0]:
        worst_unsized = (d, n)
placed = {r['fullName']: r['timeout'] for r in json.load(open(placement_path))}
print('expected sized:', len(expected), 'lower bounds:', sum(v[2] for v in expected.values()),
      'from load-127:', sum(v[3] == 'load-127' for v in expected.values()))
print('source carries:', len(placed))
print('expected == source (names and timeouts):', {k: v[0] for k, v in expected.items()} == placed)
for n in sorted(set(expected) | set(placed)):
    e, p = expected.get(n, (None,))[0], placed.get(n)
    if e != p: print('  MISMATCH', e, p, n)
print('largest unsized worst case:', worst_unsized)
# worst case among my own records (excluding load-127) per sized test
for n, (t, d, lb, src) in sorted(expected.items(), key=lambda kv: -kv[1][1]):
    mine = max((o for o in obs[n] if o[2] != 'load-127'), default=None)
    print(f'  {t:>6} worst {d:>6}{" LB" if lb else "   "} {src:9} | worst outside load-127 {mine[0]:>5} ({mine[2]}) | {n[:80]}')
sz = json.load(open(sizing_path))
rows = {r['name']: r for r in sz['tests']}
print('committed sizing rows:', len(rows), 'sized:', sum(r['sized'] for r in rows.values()))
print('committed rows agree with mine (timeout, worst, lower bound):', all(
    (rows[n]['timeoutMs'], rows[n]['worstMs'], bool(rows[n]['worstIsLowerBound'])) == ((expected[n][0], expected[n][1], expected[n][2]) if n in expected else (None, max(obs[n])[0], bool(max(obs[n])[1])))
    for n in names))
