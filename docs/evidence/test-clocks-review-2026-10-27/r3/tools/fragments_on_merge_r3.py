#!/usr/bin/env python3
"""rev-532c (round 3): does each probe fragment still apply on a tree? Reviewer tool, not authority.

usage: python3 -I fragments_on_merge_r3.py TREE LANE_PROBE VARIANTS.py

For every mutant of the lane's daemon_entry_probe.py (its MUTANTS list, main loop not run) and every rev-532c variant,
prints how many times each `old` occurs in its file in TREE's working tree (1 = applies), and the blob of each file the
record's daemon-entry runs bind (main.ts, state-directory.ts, http-host's shutdown.ts, the daemon-entry test).
"""
import hashlib, json, os, subprocess, sys
tree, lane_probe, variants_py = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3]
sys.argv = [lane_probe, tree, '/dev/null']
src, lane = open(lane_probe, encoding='utf8').read(), {}
exec(compile(src[: src.index('git = lambda')], lane_probe, 'exec'), lane)
ns = {}
exec(compile(open(variants_py, encoding='utf8').read(), variants_py, 'exec'), ns)
read = lambda p: open(os.path.join(tree, p), encoding='utf8').read()
rows = [{'id': m['id'], 'file': m['file'], 'count': read(m['file']).count(m['old'])} for m in lane['MUTANTS'] if m]
main = read('apps/syzygy/src/main.ts')
for vid, v in ns['VARIANTS'].items():
    try: ns['apply'](main, v['edits']); rows.append({'id': vid, 'file': 'apps/syzygy/src/main.ts', 'count': 1})
    except ValueError as e: rows.append({'id': vid, 'file': 'apps/syzygy/src/main.ts', 'count': 0, 'why': str(e)})
blob = lambda p: subprocess.run(['git', 'rev-parse', f'HEAD:{p}'], cwd=tree, capture_output=True, text=True).stdout.strip()
bound = {p: blob(p) for p in ('apps/syzygy/src/main.ts', 'packages/polaris-dossier/src/state-directory.ts', 'packages/http-host/src/shutdown.ts',
                              'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts')}
print(json.dumps({'tree': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True).stdout.strip(), 'boundBlobs': bound,
                  'notOnce': [r for r in rows if r['count'] != 1], 'total': len(rows)}, indent=1))
