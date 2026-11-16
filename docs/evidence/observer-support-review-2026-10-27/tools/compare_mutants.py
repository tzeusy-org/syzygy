"""rev-540: compare this reviewer's re-runs of V12/V14/V15 and O1-O6 with the lane's committed records (outcome, failed rows,
commit, edits, total tests). Usage: python3 -I compare_mutants.py <rev-540 dir> <tree at 6ef18990>"""
import json, subprocess, sys
R, tree = sys.argv[1:3]
D = 'docs/evidence/syzygy-bpyt-6-15'
pairs = [('v12-head.json', 'mut-v12-head.json'), ('v14-v15-head.json', 'mut-v14-v15-head.json'), ('own-head.json', 'mut-own-head.json'),
         ('v12-base.json', 'mut-v12-base.json'), ('v14-v15-base.json', 'mut-v14-v15-base.json')]
bad = 0
for lane_name, mine_name in pairs:
    lane = json.loads(subprocess.run(['git', '-C', tree, 'show', f'6ef18990:{D}/{lane_name}'], capture_output=True, text=True, check=True).stdout)
    mine = json.load(open(f'{R}/{mine_name}'))
    lr = {r['id']: r for r in lane['results']}
    for r in mine['results']:
        l = lr.get(r['id'])
        same = l is not None and l['commit'] == r['commit'] and l['edits'] == r['edits'] and l['outcome'] == r['outcome'] and \
            sorted(f['title'] for f in l['failed']) == sorted(f['title'] for f in r['failed']) and l['totalTests'] == r['totalTests'] and l['exit'] == r['exit']
        bad += not same
        print('same' if same else 'DIFFERS', r['commit'][:8], r['id'], r['outcome'], f"exit={r['exit']}", f"{r['failedTests']}/{r['totalTests']}")
print('differing:', bad)
