#!/usr/bin/env python3
"""rev-535: check the lane's evidence under docs/evidence/syzygy-bpyt-7-14/ against git objects (rules 6 and 11).

Usage: python3 -I check_record.py <repo> <evidence-commit>
Reads every record from the evidence commit's git objects (never the working tree), and for each run row checks:
its commit; that each `old` occurs exactly once in its file at that commit; that the outcome agrees with the exit
code and the failed rows; a clean tree after; and, for the PR 529 reviewer's mutants, that the row is the reviewer's
mutant as written in the tool at the base commit. Prints one line per problem and a summary per file.
"""
import json
import subprocess
import sys

repo, ev = sys.argv[1:3]
BASE = '546f1ff066e2ffef749c757cdb4621336039113b'
CODE = '01df68eab9ef3f9b6f556c6aa00f28c70ba6e5f1'
D = 'docs/evidence/syzygy-bpyt-7-14/'
cache = {}


def show(commit, path):
    key = (commit, path)
    if key not in cache:
        r = subprocess.run(['git', '-C', repo, 'show', f'{commit}:{path}'], capture_output=True, text=True)
        cache[key] = r.stdout if r.returncode == 0 else None
    return cache[key]


def rec(name):
    return json.loads(show(ev, D + name))


problems = []
tool = show(BASE, 'docs/evidence/http-host-review-2026-10-27/tools/mutants.py')
ns = {}
exec(tool[tool.index('POC = '):tool.index('def git_clean')], ns)
REV = {m[0]: dict(zip(['file', 'old', 'new', 'files'], m[1:])) for m in ns['MUTANTS']}

for name, commit in (('premise-base.json', BASE), ('r529-base-rest.json', BASE), ('r529-head.json', CODE)):
    d = rec(name)
    n = 0
    if d['commit'] != commit:
        problems.append(f'{name}: top commit {d["commit"]}')
    for r in d['mutants']:
        n += 1
        spec = REV.get(r['id'])
        if spec is None or any(r.get(k) != v for k, v in spec.items()):
            problems.append(f'{name} {r["id"]}: not the reviewer mutant')
        if r.get('commit') != commit:
            problems.append(f'{name} {r["id"]}: row commit {r.get("commit")}')
        c = (show(commit, r['file']) or '').count(r['old'])
        if c != 1:
            problems.append(f'{name} {r["id"]}: old occurs {c} times at {commit[:8]}')
        failing = (r.get('failedTests') or 0) > 0 or (r.get('failedFiles') or 0) > 0
        want = 'killed' if r['exit'] != 0 and failing else 'survived' if r['exit'] == 0 and r.get('failedTests') == 0 else 'error'
        if r['outcome'] != want or (r['outcome'] == 'killed') != bool(r.get('failedTitles')):
            problems.append(f'{name} {r["id"]}: outcome {r["outcome"]} vs exit {r["exit"]} failed {r.get("failedTests")} titles {len(r.get("failedTitles", []))}')
        if len(r.get('failedTitles', [])) != (r.get('failedTests') or 0):
            problems.append(f'{name} {r["id"]}: {len(r.get("failedTitles", []))} titles for {r.get("failedTests")} failed tests')
        if not r.get('cleanAfter'):
            problems.append(f'{name} {r["id"]}: dirty after')
    print(name, 'rows', n)

for name, commit, key in (('own-base.json', BASE, 'failed'), ('own-head.json', CODE, 'failed'),
                          ('own-head-o5-rerun.json', CODE, 'failed'), ('tsc-base.json', BASE, 'errors'),
                          ('tsc-head.json', CODE, 'errors')):
    d = rec(name)
    n = 0
    if d['head'] != commit:
        problems.append(f'{name}: head {d["head"]}')
    for r in d['results']:
        n += 1
        if r.get('commit', commit) != commit:
            problems.append(f'{name} {r["id"]}: row commit {r.get("commit")}')
        for e in r['edits']:
            c = (show(commit, e['file']) or '').count(e['old'])
            if c != 1:
                problems.append(f'{name} {r["id"]}: old occurs {c} times in {e["file"]} at {commit[:8]}')
            if e['old'] == e['new']:
                problems.append(f'{name} {r["id"]}: old equals new')
        ev_rows = r.get(key) or []
        if key == 'failed':
            want = 'survives' if r['exit'] == 0 else 'killed' if ev_rows else 'error'
        else:
            want = 'survived' if r['exit'] == 0 else 'killed' if ev_rows else 'error'
        if r['outcome'] != want:
            problems.append(f'{name} {r["id"]}: outcome {r["outcome"]} vs exit {r["exit"]} and {len(ev_rows)} lines')
        if r['exit'] == 0 and ev_rows:
            problems.append(f'{name} {r["id"]}: exit 0 with failure lines')
        if not r.get('cleanAfter'):
            problems.append(f'{name} {r["id"]}: dirty after')
    if key == 'errors' and [c['exit'] for c in d['controls']] != [0, 0]:
        problems.append(f'{name}: controls {[c["exit"] for c in d["controls"]]}')
    print(name, 'rows', n, 'outcomes', sorted({r['outcome'] for r in d['results']}))

diff = subprocess.run(['git', '-C', repo, 'diff', '--name-only', BASE, CODE], capture_output=True, text=True).stdout.split()
print('code diff files', len(diff), diff)
evd = subprocess.run(['git', '-C', repo, 'diff', '--name-only', CODE, ev], capture_output=True, text=True).stdout.split()
print('evidence commit touches only the evidence dir:', all(p.startswith(D) for p in evd), len(evd))
print('problems', len(problems))
for p in problems:
    print(' -', p)
