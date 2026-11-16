"""six_report.py: the six tests the lane saw time out, per run of run_ab.py (R-GP-IMPL-TEST-TIMEOUTS-1).
Usage: python3 six_report.py <runs-dir> <label>
Prints, per side and round, each of the six tests' state and duration, and every failed test of the run."""
import glob, json, os, re, sys
d, label = sys.argv[1:3]
SIX = [('gate-acts.test.ts', 'render the sign-off record byte for byte'), ('start-gates.test.ts', 'pins the consented HEAD, records the subject'),
       ('start-gates.test.ts', 'refuses config naming a remote, a promisor'), ('start-gates.test.ts', 'reports D9 and the RFC7-20 reading established once'),
       ('polaris-accessibility.browser.test.ts', 'keeps diagram labels legible and flow order'), ('polaris-authority-sweep.test.ts', 'no source/authority/provenance field in the governance')]
def tests(node):
    for c in node.get('tasks', []):
        if c['type'] == 'suite': yield from tests(c)
        else: yield c
rows = [json.loads(l) for l in open(os.path.join(d, f'{label}.jsonl'))]
for r in rows:
    tree = json.load(open(os.path.join(d, f"{label}-{r['side']}-r{r['round']}.json")))
    print(f"{r['side']} r{r['round']} exit={r['exit']} load1 {r['load1Before']}->{r['load1After']}")
    for fname, frag in SIX:
        f = next(x for x in tree['files'] if x['file'].endswith(fname))
        hits = [t for t in tests(f) if frag in t['name']]
        print('   ', fname[:28], frag[:40], [(t['state'], round(t['durationMs'] or 0)) for t in hits])
    for f in tree['files']:
        for t in tests(f):
            if t['state'] == 'fail': print('    FAILED', f['file'].split('/')[-1], '|', t['name'][:90], round(t['durationMs'] or 0), t['errors'][:1])
