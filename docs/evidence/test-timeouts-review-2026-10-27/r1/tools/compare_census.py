"""compare_census.py: compare the reviewer's census (rev_census.mjs) with the lane's census record by (path, line, kind).
Usage: python3 compare_census.py <rev-census.json> <lane-census.json>"""
import json, sys
mine = json.load(open(sys.argv[1]))
lane = json.load(open(sys.argv[2]))
a = {(s['path'], s['line'], s['kind']) for s in mine['sitesList']}
b = {(s['path'], s['line'], s['kind']) for s in lane['sites']}
print('mine', len(a), 'lane', len(b), 'both', len(a & b))
for x in sorted(a - b): print('only-mine', x)
for x in sorted(b - a): print('only-lane', x)
# value check on the shared population
lv = {(s['path'], s['line'], s['kind']): s.get('expression') for s in lane['sites']}
mv = {(s['path'], s['line'], s['kind']): s.get('timeout') for s in mine['sitesList']}
diff = [(k, mv[k], lv[k]) for k in sorted(a & b) if (mv[k] or '').strip() != (lv[k] or '').strip()]
print('expression mismatches', len(diff))
for d in diff[:20]: print(' ', d)
