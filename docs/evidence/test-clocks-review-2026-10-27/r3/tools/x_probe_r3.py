#!/usr/bin/env python3
"""rev-532c (round 3): re-run the lane's X1-X3 (N1) against the whole new daemon-entry test at a tree. Reviewer tool, not authority.

usage: python3 -I x_probe_r3.py TREE LANE_PROBE OUT.json ID...

Takes each named mutant from LANE_PROBE's MUTANTS list (its main loop is not run), applies its fragment to its file,
rebuilds with `npx tsc -b apps/syzygy`, runs packages/cap1-system/src/daemon-entry-unchanged.system.test.ts under the
system config with the JSON reporter, records every failed row, restores the file and rebuilds. Checks the tree clean.
"""
import json, os, subprocess, sys
tree, lane_probe, out_path, ids = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4:]
TEST = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
saved = sys.argv
sys.argv = [lane_probe, tree, '/dev/null']
src, lane = open(lane_probe, encoding='utf8').read(), {}
exec(compile(src[: src.index('git = lambda')], lane_probe, 'exec'), lane)
sys.argv = saved
by_id = {m['id']: m for m in lane['MUTANTS'] if m}
env = {k: v for k, v in os.environ.items() if not k.startswith('VITEST')}
def build():
    d = subprocess.run(['npx', 'tsc', '-b', 'apps/syzygy'], cwd=tree, capture_output=True, text=True)
    if d.returncode: sys.exit(d.stdout[-1500:])
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode: sys.exit('tree is not clean')
results = []
for mid in ['control', *ids]:
    m = by_id.get(mid)
    path = os.path.join(tree, m['file']) if m else None
    text = open(path, encoding='utf8').read() if m else None
    report = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'x-{mid}.json')
    try:
        if m:
            if text.count(m['old']) != 1: sys.exit(f'{mid}: old occurs {text.count(m["old"])} times')
            open(path, 'w', encoding='utf8').write(text.replace(m['old'], m['new']))
        build()
        load = open('/proc/loadavg').read().split()[0]
        d = subprocess.run(['npx', 'vitest', 'run', '--config', 'packages/cap1-system/vitest.config.ts', TEST, '--reporter=json', f'--outputFile={report}'],
                           cwd=tree, capture_output=True, text=True, timeout=1200, env=env)
        rows = [a for s in json.load(open(report, encoding='utf8'))['testResults'] for a in s['assertionResults']]
        results.append({'id': mid, 'file': m['file'] if m else None, 'old': m['old'] if m else None, 'new': m['new'] if m else None, 'exit': d.returncode, 'load1': load,
                        'passed': sum(r['status'] == 'passed' for r in rows), 'failed': sorted(r['fullName'] for r in rows if r['status'] == 'failed')})
        print(json.dumps({k: results[-1][k] for k in ('id', 'exit', 'passed', 'failed', 'load1')}), flush=True)
    finally:
        if m: open(path, 'w', encoding='utf8').write(text)
        if os.path.exists(report): os.remove(report)
build()
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode: sys.exit('tree not restored')
json.dump({'tool': os.path.basename(__file__), 'commit': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True).stdout.strip(),
           'results': results}, open(out_path, 'w', encoding='utf8'), indent=1)
