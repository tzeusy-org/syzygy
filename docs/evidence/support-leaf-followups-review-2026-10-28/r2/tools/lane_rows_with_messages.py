#!/usr/bin/env python3
"""Usage: lane_rows_with_messages.py <clone> <out.json> <tmpdir> <absent|present>: the lane's mutants.py ROWS, run by the lane's own
apply/run/restore steps (6.14's), with the same as-expected predicate, but each failed test's message kept, so a kill can be read."""
import importlib.util, json, os, subprocess, sys
clone, out, tmpdir, dist = sys.argv[1:5]
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
mt = load('mt46', os.path.join(clone, 'docs/evidence/syzygy-bpyt-46/tools/mutants.py'))
lane = load('lane614', os.path.join(clone, mt.LANE_614))
os.makedirs(tmpdir, exist_ok=True)
git = lambda *a: subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True).stdout
assert git('status', '--porcelain') == ''
present = lane.dist_dirs(clone)
assert (dist == 'absent' and present == []) or (dist == 'present' and present == sorted(f'{p}/dist' for p in json.load(open(os.path.join(clone, 'package.json')))['scripts']['build'].split()[2:])), present
drafter_rows, _ = lane.reviewer_fragments(clone)
fn_rows = {r['id']: r['edits'] for r in json.load(open(os.path.join(clone, mt.FIX_CHECK_R2)))['sets']['N']['rows']}
res_rows = {r['id']: r['edits'] for r in json.load(open(os.path.join(clone, mt.RESIDUALS_614)))['rows']}
rows = []
for rid, test, edits, want in mt.ROWS:
    if isinstance(edits, tuple): edits = {'d': drafter_rows, 'fn': fn_rows, 'res': res_rows}[edits[0]][edits[1]]
    load1 = open('/proc/loadavg').read().split()[0]
    undo = lane.apply(clone, edits)
    try: r = lane.run(clone, test, tmpdir)
    finally: lane.restore(undo)
    failing = mt.failing_set(r)
    ok = 'error' not in r and failing == sorted(want) and (r['exit'] == 0) == (want == [])
    rows.append({'id': rid, 'asExpected': ok, 'exit': r.get('exit'), 'passed': r.get('passed'), 'failed': r.get('failed'), 'load1': load1,
                 'failedTests': r.get('failedTests'), 'fileMessages': r.get('fileMessages')})
    print(rid, 'as expected' if ok else 'UNEXPECTED', r.get('exit'), r.get('passed'), r.get('failed'), flush=True)
summary = {'rows': len(rows), 'asExpected': sum(r['asExpected'] for r in rows)}
json.dump({'commit': git('rev-parse', 'HEAD').strip(), 'dist': dist, 'distDirs': present, 'summary': summary, 'statusAfter': git('status', '--porcelain'), 'rows': rows}, open(out, 'w'), indent=1)
print('summary', summary)
