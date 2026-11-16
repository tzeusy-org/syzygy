#!/usr/bin/env python3
"""Round-3 reviewer re-run for PR #548 at the head: every recorded mutant whose test set holds authority-artifact-fields.test.ts
(mutants-C.json, mutants-N.json; S and I name no such test), round 2's mutant F at 102, 121 and 132, and two controls, each against the
head test file; F also against the test file at 4d92ac95 (no `true` row). Every failing test name is stored.
Usage: aaf-rerun.py <clean clone at the head, node_modules installed> <out.json> <tmpdir>"""
import json, os, subprocess, sys

repo, out, tmp = sys.argv[1:]
os.makedirs(tmp, exist_ok=True)
git = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True, check=True).stdout
assert git('status', '--porcelain') == ''
head = git('rev-parse', 'HEAD').strip()
SRC = 'packages/three-surface-poc-core/src/authority-artifact-fields.ts'
TEST = 'packages/three-surface-poc-core/src/authority-artifact-fields.test.ts'
EV = os.path.join(repo, 'docs/evidence/syzygy-bpyt-6-3-iso')
src0 = open(os.path.join(repo, SRC)).read()
F = lambda x: f"({x} !== null && typeof {x} !== 'string' && typeof {x} !== 'number' && !Array.isArray({x}))"

jobs = [{'id': 'control-unmutated', 'line': None, 'old': None, 'new': None, 'testAt': head, 'recorded': None},
        {'id': 'control-comment', 'line': 1, 'old': None, 'new': '// harmless\n', 'testAt': head, 'recorded': None}]
for g in 'CN':
    for m in json.load(open(os.path.join(EV, f'mutants-{g}.json')))['mutants']:
        if TEST in m.get('tests', []) or m.get('file') == SRC:
            assert m['file'] == SRC, m['id']
            jobs.append({'id': m['id'], 'line': m['line'], 'old': m['old'], 'new': m['new'], 'testAt': head,
                         'recorded': {'killed': m['killed'], 'failedTests': m.get('failedTests'), 'ranAt': json.load(open(os.path.join(EV, f'mutants-{g}.json')))['commit']}})
for line, old in ((102, 'isRecord(json.value)'), (121, 'isRecord(json.value)'), (132, 'isRecord(entry)')):
    for testAt in (head, '4d92ac9518dd60cdd124525c3e36c086ccd5e425'):
        jobs.append({'id': f'F-L{line}-tests-at-{testAt[:8]}', 'line': line, 'old': old, 'new': F(old[len('isRecord('):-1]), 'testAt': testAt, 'recorded': None})

rows = []
for j in jobs:
    lines = src0.split('\n')
    if j['id'] == 'control-comment':
        text = j['new'] + src0
    elif j['line'] is None:
        text = src0
    else:
        assert lines[j['line'] - 1].count(j['old']) == 1, j['id']
        lines[j['line'] - 1] = lines[j['line'] - 1].replace(j['old'], j['new'])
        text = '\n'.join(lines)
    jf = os.path.join(tmp, 'r.json')
    if os.path.exists(jf):
        os.remove(jf)
    try:
        open(os.path.join(repo, SRC), 'w').write(text)
        open(os.path.join(repo, TEST), 'w').write(git('show', f"{j['testAt']}:{TEST}"))
        load = open('/proc/loadavg').read().strip()
        r = subprocess.run(['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={jf}', TEST], cwd=repo, capture_output=True, text=True,
                           env={**os.environ, 'TMPDIR': tmp})
        rep = json.load(open(jf))
        failed = [a['fullName'] for f in rep['testResults'] for a in f['assertionResults'] if a['status'] == 'failed']
    finally:
        subprocess.run(['git', '-C', repo, 'checkout', '-q', '--', SRC, TEST], check=True)
    row = {**{k: j[k] for k in ('id', 'line', 'old', 'new')}, 'ranAt': head, 'testFileAt': j['testAt'], 'loadavg': load, 'exit': r.returncode,
           'total': rep['numTotalTests'], 'failed': rep['numFailedTests'], 'failedTests': failed, 'killed': r.returncode != 0 and rep['numFailedTests'] > 0}
    if j['recorded'] is not None:
        row['recorded'] = j['recorded']
        row['sameOutcome'] = row['killed'] == j['recorded']['killed']
        if j['recorded']['failedTests'] is not None:
            row['newFailures'] = sorted(set(failed) - set(j['recorded']['failedTests']))
            row['lostFailures'] = sorted(set(j['recorded']['failedTests']) - set(failed))
    rows.append(row)
    print(row['id'], 'KILLED' if row['killed'] else 'SURVIVED', f"{row['failed']}/{row['total']}", row.get('sameOutcome', ''), row.get('newFailures', ''), load, flush=True)
assert git('status', '--porcelain') == ''
json.dump(rows, open(out, 'w'), indent=1)
open(out, 'a').write('\n')
