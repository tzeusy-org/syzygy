#!/usr/bin/env python3
"""rev-532c (round 3): read the four retained daemon-entry runs at a commit (git objects only) and tabulate the named
mutants' outcomes per row; compare with this round's own text-row runs. Reviewer tool, not authority.

usage: python3 -I record_de_check_r3.py TREE COMMIT TEXT_ROWS_R3.json
"""
import json, subprocess, sys
tree, commit, mine_path = sys.argv[1], sys.argv[2], sys.argv[3]
show = lambda p: json.loads(subprocess.run(['git', 'show', f'{commit}:docs/evidence/syzygy-bpyt-4-5/{p}'], cwd=tree, capture_output=True, text=True, check=True).stdout)
RUNS = {'new': 'daemon-entry-head.json', 'old': 'daemon-entry-base-test.json', 'prior': 'daemon-entry-prior-test.json', 'round1': 'daemon-entry-round1-test.json'}
ROW = {'text': 'every mention of the POC app in main.ts lies inside', 'hook': 'the daemon path never loads the POC app, and the `dossier render` branch does',
       'pin': 'each import is dynamic and inside', 'r1text': 'every line of main.ts naming the POC app sits inside'}
recs = {k: show(v) for k, v in RUNS.items()}
ids = ['control', 'S1-else-if-flag-after-dossier', 'S2-same-line-if-after-dossier', 'S3-else-if-flag-after-polaris', 'S4-else-runtime-hook-after-dossier',
       'S5-else-createRequire-flag-after-polaris', 'S6-misindented-close-after-dossier', 'S7-else-split-specifier-after-dossier', 'L1-else-if-chain',
       'L2-nested-function-in-dossier', 'L3-nested-try-in-polaris', 'C1-comment-outside-branches', 'X1-close-failed-callback-in-main',
       'X2-close-failure-in-http-host', 'X3-shutdown-in-http-host']
mine = {r['id']: r for r in json.load(open(mine_path))['results']}
table, disagree = [], []
for mid in ids:
    row = {'id': mid}
    for k, rec in recs.items():
        r = next(x for x in rec['results'] if ((x['mutant'] or {}).get('id', 'control')) == mid)
        row[k] = 'skipped' if r.get('skipped') else {'exit': r['exit'], 'passed': r['passed'],
                 'failedRows': sorted(name for name, t in ROW.items() for f in r['failed'] if t in f), 'failedCount': len(r['failed'])}
    if mid in mine:
        lane_text = 'failed' if 'text' in row['new']['failedRows'] else 'passed'
        lane_pin = 'failed' if 'pin' in row['old']['failedRows'] else 'passed'
        row['rev532c'] = {'newTextRow': mine[mid]['new']['status'], 'oldPin': mine[mid]['old']['status']}
        if (lane_text, lane_pin) != (mine[mid]['new']['status'], mine[mid]['old']['status']): disagree.append(mid)
    table.append(row)
print(json.dumps({'commit': commit, 'rows': table, 'disagreeWithRev532c': disagree, 'recordCommits': {k: v['commit'] for k, v in recs.items()},
                  'testFrom': {k: v['testFileFrom'] for k, v in recs.items()}}, indent=1))
