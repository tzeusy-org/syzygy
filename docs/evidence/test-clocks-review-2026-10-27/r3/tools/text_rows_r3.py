#!/usr/bin/env python3
"""rev-532c (round 3): run PR 532's new text row and the base's old pin against main.ts variants. Reviewer tool, not authority.

usage: python3 -I text_rows_r3.py TREE VARIANTS.py LANE_PROBE OLD_PIN_COMMIT OUT.json

TREE is a clean checkout of the reviewed head. For each variant of apps/syzygy/src/main.ts (the control; the lane's S1-S7,
L1-L3 and C1, taken from LANE_PROBE's MUTANTS list without running its main loop; and every variant in VARIANTS.py) it runs
one row of packages/cap1-system/src/daemon-entry-unchanged.system.test.ts under the system config (`-t` its title), so no
build is needed: both rows read main.ts from disk.
  new: the tree's own test file, the row "every mention of the POC app in main.ts lies inside ...";
  old: OLD_PIN_COMMIT's test file, the row "... each import is dynamic and inside the `dossier` or `polaris` branch".
Records each row's status and the first line of its failure, with /proc/loadavg. Restores both files after every run and
checks the tree is clean at the end.
"""
import json, os, subprocess, sys, time

tree, variants_py, lane_probe, old_commit, out_path = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
MAIN, TEST = 'apps/syzygy/src/main.ts', 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
ROWS = {'new': 'every mention of the POC app in main.ts lies inside', 'old': 'each import is dynamic and inside'}
ns = {}
exec(compile(open(variants_py, encoding='utf8').read(), variants_py, 'exec'), ns)
saved_argv = sys.argv
sys.argv = [lane_probe, tree, '/dev/null']
src = open(lane_probe, encoding='utf8').read()
lane = {}
exec(compile(src[: src.index('git = lambda')], lane_probe, 'exec'), lane)
sys.argv = saved_argv
LANE_IDS = ['S1-else-if-flag-after-dossier', 'S2-same-line-if-after-dossier', 'S3-else-if-flag-after-polaris', 'S4-else-runtime-hook-after-dossier',
            'S5-else-createRequire-flag-after-polaris', 'S6-misindented-close-after-dossier', 'S7-else-split-specifier-after-dossier',
            'L1-else-if-chain', 'L2-nested-function-in-dossier', 'L3-nested-try-in-polaris', 'C1-comment-outside-branches']
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode: sys.exit('tree is not clean')
main0, test0, old_test = open(os.path.join(tree, MAIN), encoding='utf8').read(), open(os.path.join(tree, TEST), encoding='utf8').read(), git('show', f'{old_commit}:{TEST}')

variants = [('control', 'control', None, [])]
by_id = {m['id']: m for m in lane['MUTANTS'] if m}
for mid in LANE_IDS:
    m = by_id[mid]
    variants.append((mid, 'lane:' + m['kind'], m['note'], [(m['old'], m['new'])]))
for vid, v in ns['VARIANTS'].items():
    variants.append((vid, v['kind'], v['note'], v['edits']))

def run(test_text, main_text, row, tag):
    report = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'tr3-{tag}.json')
    try:
        open(os.path.join(tree, TEST), 'w', encoding='utf8').write(test_text)
        open(os.path.join(tree, MAIN), 'w', encoding='utf8').write(main_text)
        load = open('/proc/loadavg').read().split()[0]
        subprocess.run(['npx', 'vitest', 'run', '--config', 'packages/cap1-system/vitest.config.ts', TEST, '-t', ROWS[row], '--reporter=json', f'--outputFile={report}'],
                       cwd=tree, capture_output=True, text=True, timeout=600, env={k: v for k, v in os.environ.items() if not k.startswith('VITEST')})
        rows = [a for s in json.load(open(report, encoding='utf8'))['testResults'] for a in s['assertionResults'] if ROWS[row] in a['fullName']]
        if len(rows) != 1: return {'status': f'rows={len(rows)}', 'load1': load}
        return {'status': rows[0]['status'], 'failure': (rows[0].get('failureMessages') or [''])[0].split('\n')[0][:240], 'load1': load}
    finally:
        open(os.path.join(tree, TEST), 'w', encoding='utf8').write(test0)
        open(os.path.join(tree, MAIN), 'w', encoding='utf8').write(main0)
        if os.path.exists(report): os.remove(report)

out = {'tool': {'name': os.path.basename(__file__)}, 'commit': git('rev-parse', 'HEAD').strip(), 'oldPinFrom': git('rev-parse', old_commit).strip(),
       'mainSha256': __import__('hashlib').sha256(main0.encode()).hexdigest(), 'results': []}
for vid, kind, note, edits in variants:
    try:
        text = ns['apply'](main0, edits) if edits else main0
    except ValueError as e:
        out['results'].append({'id': vid, 'kind': kind, 'skipped': str(e)}); print(json.dumps(out['results'][-1]), flush=True); continue
    rec = {'id': vid, 'kind': kind, 'note': note, 'edits': ns['edits_of'](main0, edits) if edits else [], 'started': time.time()}
    for row in ('new', 'old'):
        rec[row] = run(test0 if row == 'new' else old_test, text, row, f'{vid}-{row}')
    out['results'].append(rec)
    print(json.dumps({'id': vid, 'kind': kind, 'new': rec['new']['status'], 'old': rec['old']['status'],
                      'newFailure': rec['new'].get('failure', '')[:120], 'load1': rec['new']['load1']}), flush=True)
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode: sys.exit('tree not restored')
json.dump(out, open(out_path, 'w', encoding='utf8'), indent=1)
