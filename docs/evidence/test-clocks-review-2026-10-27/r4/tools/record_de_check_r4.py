#!/usr/bin/env python3
"""rev-532d (round 4): compare the record's retained daemon-entry runs with this round's runs. Reviewer tool, not authority.

usage: python3 -I record_de_check_r4.py CLONE DE_ROWS_JSON OUT.json

For each id in DE_ROWS_JSON (tools/de_rows_r4.py's output at the PR head) that the record's daemon-entry-head.json also
holds, compares the failed rows (the record keeps full names, `<describe> <title>`; this round keeps titles, so a record
row matches when it ends with the title). Also reads, from daemon-entry-base-test.json, whether the old pin fails each Y.
"""
import json, os, sys

clone, rows_path, out_path = sys.argv[1:4]
ev = os.path.join(clone, 'docs/evidence/syzygy-bpyt-4-5')
PIN = 'each import is dynamic and inside the `dossier` or `polaris` branch'
mine = {r['id']: r for r in json.load(open(rows_path, encoding='utf8'))['results']}
load = lambda n: json.load(open(os.path.join(ev, n), encoding='utf8'))
by_id = lambda d: {(r['mutant'] or {}).get('id', 'control'): r for r in d['results']}
head, base = load('daemon-entry-head.json'), load('daemon-entry-base-test.json')
h, b = by_id(head), by_id(base)
compared, disagree = [], []
for mid, r in mine.items():
    if mid not in h: continue
    compared.append(mid)
    rec = sorted(h[mid]['failed']); got = sorted(r['failed'])
    if len(rec) != len(got) or not all(x.endswith(' ' + y) for x, y in zip(rec, got)): disagree.append({'id': mid, 'record': rec, 'mine': got})
out = {'recordHeadCommit': head['commit'], 'recordHeadTestSha256': head['testFileSha256'], 'compared': compared, 'notInRecord': sorted(set(mine) - set(h)),
       'disagree': disagree, 'oldPinFailsY': {mid: any(PIN in t for t in b[mid]['failed']) for mid in b if mid.startswith('Y')}}
json.dump(out, open(out_path, 'w', encoding='utf8'), indent=1)
print(json.dumps({k: out[k] for k in ('recordHeadCommit', 'compared', 'notInRecord', 'disagree', 'oldPinFailsY')}))
