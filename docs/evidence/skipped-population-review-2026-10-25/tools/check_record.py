#!/usr/bin/env python3
"""rev-527: checks the syzygy-bpyt.4.30 rule-6 record against the git objects (rules 6 and 11).

usage: python3 -I check_record.py CLONE REVIEWED_COMMIT
"""
import hashlib, json, subprocess, sys

clone, reviewed = sys.argv[1], sys.argv[2]
REC = 'docs/evidence/syzygy-bpyt-4-30/skipped-population-probe.json'
TOOL = 'docs/evidence/syzygy-bpyt-4-30/tools/skipped_population_probe.py'


def show(commit, path):
    return subprocess.run(['git', 'show', f'{commit}:{path}'], cwd=clone, capture_output=True, check=True).stdout


def rev(x):
    return subprocess.run(['git', 'rev-parse', x], cwd=clone, capture_output=True, text=True, check=True).stdout.strip()


def anc(a, b):
    return subprocess.run(['git', 'merge-base', '--is-ancestor', a, b], cwd=clone).returncode == 0


sha = lambda b: hashlib.sha256(b).hexdigest()
d = json.loads(show(reviewed, REC))
results = []


def check(label, ok, detail=''):
    results.append(ok)
    print(f"{'OK  ' if ok else 'FAIL'} {label}{(' — ' + detail) if detail else ''}")


rc = d['commit']
check('record commit resolves', rev(rc) == rc, rc)
check('record commit is an ancestor of the reviewed commit', anc(rc, reviewed))
check('baseCommit is the merge base', rev(d['baseCommit']) == subprocess.run(['git', 'merge-base', reviewed, d['baseCommit']], cwd=clone, capture_output=True, text=True).stdout.strip())
check('rootSkipCommit resolves', rev(d['rootSkipCommit']) == d['rootSkipCommit'], d['rootSkipCommit'])
check('tool sha256 equals the tool at the record commit', sha(show(rc, TOOL)) == d['tool']['sha256'])
check('tool sha256 equals the tool at the reviewed commit', sha(show(reviewed, TOOL)) == d['tool']['sha256'])
for path, v in d['files'].items():
    check(f'files[{path}].head equals the blob at the record commit', sha(show(rc, path)) == v['head'])
    check(f'files[{path}] unchanged record commit -> reviewed commit', show(rc, path) == show(reviewed, path))

for r in d['runs']:
    name = r['case']
    for e in r['edits']:
        text = show(rc, e['file'])
        # A case that also swaps files mutates the swapped bytes; none here does both.
        n = text.count(e['old'].encode())
        check(f'{name}: old occurs exactly once in {e["file"]} at the record commit', n == 1, f'count {n}')
        check(f'{name}: new differs from old', e['old'] != e['new'])
    for path, v in r['filesFrom'].items():
        check(f'{name}: filesFrom[{path}] sha256 equals the blob at its commit', sha(show(v['commit'], path)) == v['sha256'])
    row = r['checkRow']
    rows = [t for t in r['tests'] if t['name'].startswith('system tier: the skipped population')]
    check(f'{name}: exactly one check row in tests', len(rows) == 1 and rows[0] == row)
    check(f'{name}: tests holds only the check row (a filtered run)', len(r['tests']) == 1, str(len(r['tests'])))
    clean = not r['killedAtDeadline'] and not r['survivors']
    if r['mustPass']:
        want = clean and r['exitCode'] == 0 and row['status'] == 'passed'
    else:
        want = (clean and r['exitCode'] not in (0, None) and row['status'] == 'failed'
                and r['failureMustCarry'] in (row['failure'] or ''))
        if name == 'collection-hangs':
            want = want and row['durationMs'] >= 45000
    check(f'{name}: recorded passes={r["passes"]} agrees with exit {r["exitCode"]}, row {row["status"]}, needle, survivors {len(r["survivors"])}', want == r['passes'] and r['passes'])
    if not r['mustPass']:
        fm = row['failure'] or ''
        i = fm.find('skipped but not expected')
        print(f'      {name} failure head: {fm[:300]!r}')
check('allPass recorded true and equals the conjunction', d['allPass'] is True and all(r['passes'] for r in d['runs']))
check('11 cases', len(d['runs']) == 11, str(len(d['runs'])))
print(f'{sum(results)} OK / {len(results)} checks; {len(results) - sum(results)} FAIL')
