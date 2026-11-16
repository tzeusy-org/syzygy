"""Refusals 1-4 of the PR 554 body, against main a15b6a04 (the merge base): each listed form, from the committed fragment records
(read from the head clone, by id, never retyped), applied to the base clone and run against the guard file it names, by 6.14's steps.
A form is new against the base if it passes there. Usage: base_refusals.py <head clone> <base clone> <out.json> <tmpdir>"""
import importlib.util, json, os, subprocess, sys

head, base, out, tmpdir = sys.argv[1:5]
os.makedirs(tmpdir, exist_ok=True)
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
mt = load('mt46', os.path.join(head, 'docs/evidence/syzygy-bpyt-46/tools/mutants.py'))
lane = load('lane614', os.path.join(head, mt.LANE_614))
drafter_rows, _ = lane.reviewer_fragments(head)
fn_rows = {r['id']: r['edits'] for r in json.load(open(os.path.join(head, mt.FIX_CHECK_R2)))['sets']['N']['rows']}
res_rows = {r['id']: r['edits'] for r in json.load(open(os.path.join(head, mt.RESIDUALS_614)))['rows']}
ROWS = [('V7', mt.PURITY, fn_rows['FN-V7']), ('V9', mt.PURITY, fn_rows['FN-V9']), ('Y5b', mt.PURITY, fn_rows['FN-Y5b']),
        ('Y5c', mt.PURITY, fn_rows['FN-Y5c']), ('R2', mt.PURITY, res_rows['R2-dynamic-import-with-a-space-of-an-allowed-name']),
        ('U4', mt.PURITY, fn_rows['FN-U4']), ('U5', mt.PURITY, fn_rows['FN-U5']),
        ('D2', mt.DRAFTER_TEST, drafter_rows['D2-drafter-globalThis-bracket-read']), ('D5', mt.DRAFTER_TEST, drafter_rows['D5-drafter-WebSocket'])]
git = lambda *a: subprocess.run(['git', '-C', base, *a], capture_output=True, text=True, check=True).stdout
assert git('status', '--porcelain') == ''
rows = []
for rid, test, edits in ROWS:
    load1 = open('/proc/loadavg').read().split()[0]
    undo = lane.apply(base, edits)
    try: r = lane.run(base, test, tmpdir)
    finally: lane.restore(undo)
    rows.append({'id': rid, 'test': test, 'edits': edits, 'load1': load1, **{k: r.get(k) for k in ('exit', 'passed', 'failed', 'total', 'failedTests', 'fileMessages', 'error')}})
    print(rid, r.get('exit'), r.get('passed'), r.get('failed'), [t['name'] for t in r.get('failedTests', [])], flush=True)
json.dump({'commit': git('rev-parse', 'HEAD').strip(), 'dists': lane.dist_dirs(base), 'rows': rows, 'statusAfter': git('status', '--porcelain')}, open(out, 'w'), indent=1)
print('status after', repr(git('status', '--porcelain')))
