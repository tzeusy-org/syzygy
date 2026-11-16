#!/usr/bin/env python3
"""Round 3: compare the lane's head mutant records at the evidence head with each other (dist absent / present) and with the
same records at the previous evidence head, row by row: id set, expected, observed, and the set of failing test names.

Usage: records_r3.py <clone> <new evidence commit> <old evidence commit> <out.json>
"""
import json, subprocess, sys

clone, new, old, out = sys.argv[1:5]
D = 'docs/evidence/syzygy-bpyt-6-14'


def load(commit, name):
    return json.loads(subprocess.run(['git', '-C', clone, 'show', f'{commit}:{D}/{name}'], check=True, capture_output=True,
                                     text=True).stdout)


def table(rec):
    return {r['id']: {'expected': r['expected'], 'observed': r['observed'], 'failed': sorted(t['name'] for t in r['failedTests']),
                      'failedFiles': r['failedFiles'], 'edits': r['edits']} for r in rec['rows']}


res = {}
for st in ['absent', 'present']:
    a, b = load(new, f'mutants-head-{st}.json'), load(old, f'mutants-head-{st}.json')
    ta, tb = table(a), table(b)
    res[st] = {
        'newCommit': a['commit'], 'oldCommit': b['commit'], 'newSummary': a['summary'], 'oldSummary': b['summary'],
        'newStatusAfter': a['statusAfter'], 'newLeftovers': a['leftovers'],
        'added': sorted(set(ta) - set(tb)), 'removed': sorted(set(tb) - set(ta)),
        'expectedNotObserved': sorted(i for i, r in ta.items() if r['expected'] != r['observed']),
        'changedVsOld': sorted(i for i in set(ta) & set(tb) if (ta[i]['observed'], ta[i]['failed'], ta[i]['edits'])
                               != (tb[i]['observed'], tb[i]['failed'], tb[i]['edits'])),
        'timedOutMessages': sum('timed out' in t['message'] for r in a['rows'] for t in r['failedTests']),
        'killedRows': sum(r['observed'] == 'killed' for r in a['rows']),
    }
na, np = table(load(new, 'mutants-head-absent.json')), table(load(new, 'mutants-head-present.json'))
res['absentVsPresentDiffer'] = sorted(i for i in set(na) | set(np) if na.get(i) != np.get(i))
res['W'] = {i: na[i]['failed'] for i in na if i.startswith(('W5', 'W6', 'W7'))}
# The base records: unchanged bytes between the two evidence heads?
for st in ['absent', 'present']:
    for name in [f'mutants-base-{st}.json', f'mutants-base-{st}.log']:
        x = subprocess.run(['git', '-C', clone, 'diff', '--quiet', old, new, '--', f'{D}/{name}']).returncode
        res[f'baseUnchanged:{name}'] = x == 0
    rb = load(new, f'mutants-base-{st}.json')
    res[f'base-{st}'] = {'commit': rb['commit'], 'summary': rb['summary']}
json.dump(res, open(out, 'w'), indent=2)
print(json.dumps(res, indent=2))
