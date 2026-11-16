#!/usr/bin/env python3
"""rev-530: re-run named mutants from the 6.3 evidence record against the WHOLE suite, not the owning project,
to answer whether any committed test pins the predicate. Timeouts are raised to 120 s so host load cannot kill.

Usage: full_suite_mutants.py <clone, npm ci done> <record json path> <out json> <tmpdir> id[,id...]
Each mutant: `git reset --hard` to the clone's HEAD, replace the record's `old` by its `new` (exactly once), run
`npx vitest run --reporter=json --outputFile=<f> --testTimeout=120000 --hookTimeout=120000`, list every failed
test, reset. The clone's HEAD and the record's head are both stored.
"""
import json
import os
import subprocess
import sys

clone, record_path, out, tmp = sys.argv[1:5]
ids = sys.argv[5].split(',')
record = json.load(open(record_path))
rows = {r['id']: r for r in record['mutants']['rows']}
head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=clone, capture_output=True, text=True, check=True).stdout.strip()
results = json.load(open(out)) if os.path.exists(out) else []
for mid in ids:
    row = rows[mid]
    subprocess.run(['git', 'reset', '-q', '--hard', head], cwd=clone, check=True)
    path = os.path.join(clone, row['file'])
    text = open(path, encoding='utf-8').read()
    assert text.count(row['old']) == 1, (mid, text.count(row['old']))
    open(path, 'w', encoding='utf-8').write(text.replace(row['old'], row['new'], 1))
    report = os.path.join(tmp, f'{mid}.json')
    os.makedirs(tmp, exist_ok=True)
    run = subprocess.run(['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={report}', '--testTimeout=120000', '--hookTimeout=120000'],
                         cwd=clone, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmp})
    failed, suite_errors, totals = [], [], {}
    if os.path.exists(report):
        rep = json.load(open(report))
        totals = {k: rep.get(k) for k in ('numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numFailedTestSuites', 'numTotalTestSuites')}
        for suite in rep['testResults']:
            if suite.get('status') == 'failed' and not any(a['status'] == 'failed' for a in suite['assertionResults']):
                suite_errors.append({'file': os.path.relpath(suite['name'], clone), 'message': (suite.get('message') or '')[:300]})
            for a in suite['assertionResults']:
                if a['status'] == 'failed':
                    failed.append({'file': os.path.relpath(suite['name'], clone), 'test': a['fullName'][:200], 'message': (' '.join(a.get('failureMessages') or []))[:200]})
    subprocess.run(['git', 'reset', '-q', '--hard', head], cwd=clone, check=True)
    results.append({'id': mid, 'file': row['file'], 'old': row['old'], 'new': row['new'], 'ranAt': head, 'recordHead': record['mutants']['head'],
                    'exit': run.returncode, 'totals': totals, 'failed': failed, 'suiteErrors': suite_errors})
    json.dump(results, open(out, 'w'), indent=1)
    print(mid, 'exit', run.returncode, totals, 'failed', len(failed), 'suiteErrors', len(suite_errors), flush=True)
