#!/usr/bin/env python3
"""Run each reviewer S10 mutant (egress-mutants-*.json) against the support purity test, to show which layer refuses which.
Usage: cross_purity.py <clone> <out.json> <tmpdir> <mutants.json>..."""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import purity_mutants as pm  # noqa: E402

clone, out_path, tmp = sys.argv[1:4]
rows = []
for f in sys.argv[4:]:
    for m in json.load(open(f)):
        if not m['edits']:
            continue
        undo = pm.apply(clone, [(e['path'], e['old'], e['new']) for e in m['edits']])
        try:
            res = pm.run(clone, pm.PURITY, tmp)
        finally:
            pm.restore(undo)
        outcome = 'killed' if res.get('exit', 0) != 0 and res.get('failed', 0) > 0 else ('error' if 'error' in res else 'survives')
        rows.append({'id': m['id'], 'purity': outcome, **res})
        print(m['id'], outcome, res.get('failed'), res.get('failedTests'), flush=True)
status = subprocess.run(['git', '-C', clone, 'status', '--porcelain'], capture_output=True, text=True).stdout
json.dump({'statusAfter': status, 'rows': rows}, open(out_path, 'w'), indent=1)
print('status after:', repr(status))
