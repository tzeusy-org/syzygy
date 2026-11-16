#!/usr/bin/env python3
"""Check the record's 19 mutants against git objects (rules 6 and 11). Usage: check_mutants.py <repo> <reviewed commit>

Per mutant: `old` occurs exactly once in `file` at codeCommitFull and (when it exists here) at the mutant's own `commit`;
`new` occurs zero times there; each detector's `killed` agrees with its failed rows (test/existing: failedCount > 0 and
len(failed) == failedCount and the summary line says that many failed; probe: casesThatDiffer > 0 or consent text differs);
the verdict string names exactly the detectors that killed it (or SURVIVED when none did). Also the tallies the PR body
states: probe 17, test 15, existing 6.
"""
import json
import re
import subprocess
import sys

repo, reviewed = sys.argv[1:3]


def show(rev, path):
    r = subprocess.run(['git', '-C', repo, 'show', f'{rev}:{path}'], capture_output=True)
    return None if r.returncode else r.stdout.decode('utf8')


def exists(rev):
    return subprocess.run(['git', '-C', repo, 'cat-file', '-e', f'{rev}^{{commit}}'], capture_output=True).returncode == 0


rec = json.loads(show(reviewed, 'docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-2026-10-25.json'))
mut = rec['mutants']
code = mut['codeCommitFull']
rows, fails = [], []
tally = {'test': 0, 'probe': 0, 'existing': 0}
for m in mut['run']['mutants']:
    body = show(code, m['file'])
    n_old, n_new = body.count(m['old']), body.count(m['new'])
    own = exists(m['commit'])
    own_old = show(m['commit'], m['file']).count(m['old']) if own else None
    killers = []
    for name, d in m['detectors'].items():
        if name == 'probe':
            k = d['casesThatDiffer'] > 0 or d.get('consentFunctionTextDiffers', False)
        else:
            summ = ' '.join(d.get('summary', []))
            fm = re.search(r'Tests\s+(\d+) failed', summ)
            k = d.get('failedCount', 0) > 0
            if k and (len(d.get('failed', [])) != d['failedCount'] or fm is None or int(fm.group(1)) != d['failedCount']):
                fails.append(f'{m["id"]} {name}: failed rows / summary disagree with failedCount')
            if not k and fm is not None:
                fails.append(f'{m["id"]} {name}: summary says failed but failedCount 0')
        if k != d['killed']:
            fails.append(f'{m["id"]} {name}: killed flag {d["killed"]} but evidence says {k}')
        if d['killed']:
            killers.append(name)
            tally[name] += 1
    expect = 'SURVIVED' if not killers else 'killed by ' + ', '.join(killers)
    if m['verdict'] != expect:
        fails.append(f'{m["id"]}: verdict {m["verdict"]!r} != {expect!r}')
    if n_old != 1 or n_new != 0:
        fails.append(f'{m["id"]}: old x{n_old} new x{n_new} at {code[:8]}')
    rows.append({'id': m['id'], 'oldAtCode': n_old, 'newAtCode': n_new, 'ownCommit': m['commit'][:8], 'ownCommitPresent': own, 'oldAtOwnCommit': own_old, 'verdict': m['verdict'], 'killers': killers})
print(json.dumps({'mutants': len(rows), 'tally': tally, 'rows': rows, 'fails': fails}, indent=1))
sys.exit(1 if fails else 0)
