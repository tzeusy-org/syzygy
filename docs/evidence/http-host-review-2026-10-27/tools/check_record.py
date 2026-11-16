#!/usr/bin/env python3
"""rev-529: check the PR 529 lane's mutant and run records against git objects (rules 6, 11).

Usage: check_record.py <repo> <evidence-commit>
"""
import hashlib
import json
import re
import subprocess
import sys

repo, ev = sys.argv[1:3]
D = 'docs/evidence/syzygy-bpyt-7-3/'


def show(commit, path):
    r = subprocess.run(['git', '-C', repo, 'show', f'{commit}:{path}'], capture_output=True)
    return r.stdout.decode() if r.returncode == 0 else None


problems = []
specs = json.loads(show(ev, D + 'own-specs.json'))['mutants']
run = json.loads(show(ev, D + 'own-head.json'))
head = run['head']
print('own-head ran at', head, 'tree', run['tree'])
byid = {r['id']: r for r in run['results']}
print('specs', len(specs), 'results', len(run['results']), 'ids equal', [s['id'] for s in specs] == [r['id'] for r in run['results']])
for s in specs:
    r = byid[s['id']]
    for e in s['edits']:
        body = show(head, e['file'])
        n = body.count(e['old']) if body is not None else None
        if n != 1:
            problems.append(f"{s['id']}: old occurs {n} times in {e['file']} at {head[:8]}")
    if [dict(x) for x in s['edits']] != [dict(x) for x in r['edits']]:
        problems.append(f"{s['id']}: run edits differ from spec")
    m = re.search(r'Tests\s+(\d+) failed', ' '.join(r['tests']))
    failed_n = int(m.group(1)) if m else 0
    consistent = (r['outcome'] == 'killed' and r['exit'] != 0 and failed_n == len(r['failed']) and failed_n > 0) or \
                 (r['outcome'] == 'survived' and r['exit'] == 0 and failed_n == 0)
    if not consistent or not r['cleanAfter']:
        problems.append(f"{s['id']}: outcome {r['outcome']} exit {r['exit']} failed {failed_n}/{len(r['failed'])} clean {r['cleanAfter']}")
    print(f"{s['id']:45} {r['outcome']:8} exit={r['exit']} failedRows={len(r['failed'])} tests={r['tests']}")

m10 = json.loads(show(ev, D + 'm10-head.json'))
print('m10 keys', list(m10.keys()))
print('m10 tested commit', m10.get('testedCommit') or m10.get('commit') or m10.get('head'))
muts = m10.get('mutations') or m10.get('mutants') or m10.get('results')
for mu in muts:
    print('  m10', mu.get('id'), mu.get('file'), mu.get('outcome') or mu.get('status') or mu.get('killed'))
    f = mu.get('file')
    if f and mu.get('old') is not None:
        body = show(m10.get('testedCommit') or head, f)
        n = body.count(mu['old']) if body else None
        if n != 1:
            problems.append(f"m10 {mu.get('id')}: old occurs {n} times in {f}")

summary = json.loads(show(ev, D + 'summary.json'))
print('summary keys', list(summary.keys())[:30])
for name in ('record.py', 'summary.json', 'tools/differential.py', 'tools/host-diff.mjs', 'tools/e2e-diff.mjs', 'tools/gate-diff.mjs', 'tools/surface.mjs'):
    print(f'sha256 {name} =', hashlib.sha256(show(ev, D + name).encode()).hexdigest())
mutpy = show(ev, 'docs/evidence/argv-guards-review-2026-10-25/tools/mut.py')
print('sha256 mut.py =', hashlib.sha256(mutpy.encode()).hexdigest() if mutpy else None)
print('problems', len(problems))
for p in problems:
    print('  ', p)
