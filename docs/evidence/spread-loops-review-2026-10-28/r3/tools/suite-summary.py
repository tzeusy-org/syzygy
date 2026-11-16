#!/usr/bin/env python3
"""Summarize a vitest JSON report: totals, failed files, skipped tests, and the new tests' status and durations. Usage: suite-summary.py <report> <root> <test-delta-output.json>"""
import json, os, sys
d = json.load(open(sys.argv[1])); root = sys.argv[2]; delta = json.load(open(sys.argv[3]))
added = {(f, t) for f, t, _ in delta['added']}
new, skipped = [], []
for r in d['testResults']:
    rel = os.path.relpath(r['name'], root)
    for t in r['assertionResults']:
        key = (rel, ' '.join(t['ancestorTitles'] + [t['title']]))
        if key in added:
            new.append({'test': key[1], 'status': t['status'], 'ms': round(t.get('duration') or 0)})
        if t['status'] in ('pending', 'skipped', 'todo'):
            skipped.append(f'{rel} :: {t["fullName"]}')
print(json.dumps({k: d[k] for k in ('numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTodoTests', 'numTotalTestSuites', 'success')}
                 | {'files': len(d['testResults']), 'failedFiles': [os.path.relpath(r['name'], root) for r in d['testResults'] if r['status'] != 'passed'],
                    'skipped': skipped, 'newTests': len(new), 'newPassed': sum(n['status'] == 'passed' for n in new),
                    'newMaxMs': max((n['ms'] for n in new), default=0), 'newTestRows': new}, indent=1))
