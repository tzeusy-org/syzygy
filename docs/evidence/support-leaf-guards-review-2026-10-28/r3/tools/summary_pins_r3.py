#!/usr/bin/env python3
"""Round 3, rule 6 on summary.py's new W5-W7 pins: mutate one committed record at a time in the clone, run
`summary.py . --check`, and restore with `git checkout --`. Each mutation must make --check exit non-zero.

Usage: summary_pins_r3.py <clone at the evidence head> <out.json>
"""
import json, subprocess, sys

clone, out = sys.argv[1:3]
D = 'docs/evidence/syzygy-bpyt-6-14'
F1_ROW = '@syzygy/support stays a pure leaf takes only createHash from node:crypto, by its own name, and re-exports nothing from it'


def mutate(name, fn):
    path = f'{clone}/{D}/{name}'
    data = json.load(open(path))
    fn(data)
    json.dump(data, open(path, 'w'), indent=1)


def extra_failing(rid):
    def fn(d):
        row = next(r for r in d['rows'] if r['id'].startswith(rid))
        row['failedTests'].append({'name': F1_ROW, 'message': ''})
    return fn


def drop(rid):
    def fn(d):
        d['rows'] = [r for r in d['rows'] if not r['id'].startswith(rid)]
    return fn


def survives(rid):
    def fn(d):
        row = next(r for r in d['rows'] if r['id'].startswith(rid))
        row['observed'] = row['expected'] = 'survives'
        row['failedTests'] = []
    return fn


CASES = [
    ('P1-W6-extra-failing-row', 'mutants-head-present.json', extra_failing('W6-')),
    ('P2-W7-row-dropped', 'mutants-head-absent.json', drop('W7-')),
    ('P3-W5-survives-as-expected', 'mutants-head-absent.json', survives('W5-')),
]
res = []
base = subprocess.run(['python3', '-I', f'{D}/tools/summary.py', '.', '--check'], cwd=clone, capture_output=True, text=True)
res.append({'id': 'P0-unmutated', 'exit': base.returncode, 'out': base.stdout.strip()[:400]})
for cid, name, fn in CASES:
    mutate(name, fn)
    try:
        r = subprocess.run(['python3', '-I', f'{D}/tools/summary.py', '.', '--check'], cwd=clone, capture_output=True, text=True)
        res.append({'id': cid, 'exit': r.returncode, 'out': (r.stdout + r.stderr).strip()[-600:]})
    finally:
        subprocess.run(['git', 'checkout', '--', f'{D}/{name}'], cwd=clone, check=True)
status = subprocess.run(['git', 'status', '--porcelain'], cwd=clone, capture_output=True, text=True).stdout
out_obj = {'cases': res, 'statusAfter': status,
           'caught': [c['id'] for c in res[1:] if c['exit'] != 0], 'survived': [c['id'] for c in res[1:] if c['exit'] == 0]}
json.dump(out_obj, open(out, 'w'), indent=2)
print(json.dumps(out_obj, indent=2))
