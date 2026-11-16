#!/usr/bin/env python3
"""Round-2 reviewer mutant F for PR #548: a predicate that names two types (`string`, `number`) and admits a boolean, at the three
authority-artifact-fields.ts calls whose NOT_OBJECTS rows read the value directly (lines 102, 121, 132), run against the test file as it
stands at the reviewed commit (no `true` row) and as it stood at 2e7ab2ec (with the `true` row). Production bytes are the same at both
commits for that file. Usage: bool-mutant.py <clean repo at the reviewed commit> <out.json> <tmpdir>"""
import json, os, re, subprocess, sys

repo, out, tmp = sys.argv[1:]
os.makedirs(tmp, exist_ok=True)
git = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True, check=True).stdout
assert git('status', '--porcelain') == ''
commit = git('rev-parse', 'HEAD').strip()
SRC = 'packages/three-surface-poc-core/src/authority-artifact-fields.ts'
TEST = 'packages/three-surface-poc-core/src/authority-artifact-fields.test.ts'
assert git('show', f'2e7ab2ec:{SRC}') == git('show', f'{commit}:{SRC}')
F = lambda x: f"({x} !== null && typeof {x} !== 'string' && typeof {x} !== 'number' && !Array.isArray({x}))"
src0 = open(os.path.join(repo, SRC)).read()
SITES = {102: 'isRecord(json.value)', 121: 'isRecord(json.value)', 132: 'isRecord(entry)'}
rows = []
for testAt in (commit, '2e7ab2ec'):
    for line, old in SITES.items():
        lines = src0.split('\n')
        assert lines[line - 1].count(old) == 1, (line, old)
        arg = old[len('isRecord('):-1]
        new = F(arg)
        lines[line - 1] = lines[line - 1].replace(old, new)
        try:
            open(os.path.join(repo, SRC), 'w').write('\n'.join(lines))
            open(os.path.join(repo, TEST), 'w').write(git('show', f'{testAt}:{TEST}'))
            jf = os.path.join(tmp, 'f.json')
            load = open('/proc/loadavg').read().strip()
            r = subprocess.run(['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={jf}', TEST], cwd=repo, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmp})
            j = json.load(open(jf))
            failed = [a['fullName'] for f in j['testResults'] for a in f['assertionResults'] if a['status'] == 'failed']
        finally:
            subprocess.run(['git', '-C', repo, 'checkout', '-q', '--', SRC, TEST], check=True)
        rows.append({'id': f'F-L{line}-tests-at-{testAt[:8]}', 'ranAt': commit, 'file': SRC, 'line': line, 'old': old, 'new': new, 'testFileAt': testAt, 'loadavg': load,
                     'exit': r.returncode, 'total': j['numTotalTests'], 'failed': j['numFailedTests'], 'failedTests': failed, 'killed': r.returncode != 0 and j['numFailedTests'] > 0})
        print(rows[-1]['id'], 'KILLED' if rows[-1]['killed'] else 'SURVIVED', f"{j['numFailedTests']}/{j['numTotalTests']}", failed, flush=True)
    assert git('status', '--porcelain') == ''
json.dump(rows, open(out, 'w'), indent=1)
open(out, 'a').write('\n')
