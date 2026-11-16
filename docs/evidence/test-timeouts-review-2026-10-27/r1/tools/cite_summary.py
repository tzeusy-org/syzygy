"""cite_summary.py: tabulate cite_lookup.py's output against citation_audit.py's verdicts (R-GP-IMPL-TEST-TIMEOUTS-1).
Usage: python3 cite_summary.py <cite-lookup-all.txt> <citation-audit.json>"""
import json, re, sys
from collections import Counter
txt = open(sys.argv[1]).read().split('=' * 100)
a = {r['site']: r for r in json.load(open(sys.argv[2]))['rows']}
c = Counter()
for block in txt:
    block = block.strip()
    if not block: continue
    site, kind = block.split('\n')[0].split(' ')[:2]
    hits = sum(int(m) for m in re.findall(r'title hits (\d+)', block))
    commits = len(re.findall(r'^  commit ', block, re.M))
    mine = 'title-in-record' if hits else 'commit-only' if commits else 'no-title-site' if kind in ('hook', 'config', 'suite') else 'test-without-title-hit'
    c[(kind, mine, str(a[site]['measured']))] += 1
print('sites', sum(c.values()))
for k, v in sorted(c.items()): print(v, k)
