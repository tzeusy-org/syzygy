#!/usr/bin/env python3
"""Are followUps[0].guards the round-1 raw's N3 guards, verbatim (whitespace of the hard wrap normalised)?

Usage: guards_verbatim.py <round-1-raw.md> <census.json> <report.txt>
"""
import json
import re
import sys

raw = open(sys.argv[1], encoding='utf-8').read()
census = json.load(open(sys.argv[2]))
report = open(sys.argv[3], encoding='utf-8').read()
start = raw.index('- **Guards F1 must carry.**')
end = raw.index('- **Proposed fix.**', start)
block = ' '.join(line.strip() for line in raw[start + len('- **Guards F1 must carry.**'):end].splitlines() if line.strip())
parts = [p.strip() for p in re.split(r'(?=\(\d\) )', block) if p.strip()]
guards = census['followUps'][0]['guards']
print('raw guards', len(parts), 'record guards', len(guards))
for i, (a, b) in enumerate(zip(parts, guards)):
    print(i + 1, 'equal' if a == b else 'DIFFERS', '' if a == b else (a, b))
fj = re.search(r'Discovered-Follow-Ups-JSON:\s*```json\s*(\[.*?\])\s*```', report, re.S)
filed = json.loads(fj.group(1))
f1 = [f for f in filed if f['id'] == 'F1'][0]['description']
norm = lambda s: re.sub(r'\s+', ' ', s)
print('each raw guard inside the report F1 description:', [norm(p) in norm(f1) for p in parts])
print('marker in record what:', '--user-data-dir=<profile>, with no trailing slash' in census['followUps'][0]['what'],
      ' any "<profile>/" in F1 what/guards/R3:', [s for s in (census['followUps'][0]['what'], ' '.join(guards), [r['why'] for r in census['dispositionRules'] if r['rule'].startswith('R3')][0]) if '<profile>/' in s])
print('F1 measure (record):', census['followUps'][0]['measure'])
print('F1 measure (report):', re.search(r'Measure with .*', f1).group(0))
f2 = [f for f in filed if f['id'] == 'F2'][0]['description']
print('F2 report criterion:', re.search(r'Criterion: .*?(?=Mechanism)', f2).group(0))
