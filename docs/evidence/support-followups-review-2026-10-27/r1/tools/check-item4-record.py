#!/usr/bin/env python3
"""Item-4 mutant record check (PR #538): `old` once in `file` at the record's head, outcome agrees with the three detectors'
exit codes and counts, and whether each row's mutant commit exists in the repository. Usage: check-item4-record.py <repo> <evidence commit>"""
import json, subprocess, sys
repo, ev = sys.argv[1:3]
g = lambda *a: subprocess.run(['git', *a], cwd=repo, capture_output=True, text=True)
d = json.loads(g('show', f'{ev}:docs/evidence/syzygy-bpyt-6-13/item4-mutants-2026-10-27.json').stdout)
bad = 0
for r in d['rows']:
    text = g('show', f"{d['head']}:{r['file']}").stdout
    once = text.count(r['old']) == 1
    t, p, s = r['tests'], r['probe'], r['sweep']
    tests_ok = t['killed'] == (t['exit'] != 0 and t['failedTestCount'] > 0) and t['failedTestCount'] == len(t['failedTests'])
    probe_ok = p['killed'] == (p['compareExit'] != 0 and p['rowsThatDiffer'] > 0)
    sweep_ok = s['killed'] == ((s['createHashSha256Sites'], s['localSha256Definitions']) != (6, 1))
    by = sorted(k for k in ('probe', 'tests', 'sweep') if r[k]['killed'])
    by_ok = by == sorted(r['killedBy'])
    exists = g('cat-file', '-e', r['commit'] + '^{commit}').returncode == 0
    ok = once and tests_ok and probe_ok and sweep_ok and by_ok
    bad += not ok
    print(('ok  ' if ok else 'BAD ') + r['id'], f"oldOnceAtHead={once} tests={tests_ok} probe={probe_ok} sweep={sweep_ok} killedBy={by} mutantCommitInRepo={exists}")
c = d['control']
print('control killedBy nothing:', not (c['tests']['killed'] or c['probe']['killed'] or c['sweep']['killed']), 'control commit', c['commit'][:8])
print(f"rows={len(d['rows'])} bad={bad}")
sys.exit(1 if bad else 0)
