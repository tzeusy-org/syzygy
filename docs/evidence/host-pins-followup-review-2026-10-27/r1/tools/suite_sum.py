#!/usr/bin/env python3
"""Summarize one Vitest JSON report: totals, every non-passed test with its file, status and duration.

Usage: python3 -I suite_sum.py <report.json> <tree> <out.json>
"""
import hashlib
import json
import os
import sys

report, tree, out = sys.argv[1:4]
raw = open(report, 'rb').read()
rep = json.loads(raw)
not_passed = []
for r in rep['testResults']:
    name = os.path.relpath(r['name'], tree)
    for a in r['assertionResults']:
        if a['status'] != 'passed':
            msg = ' '.join(a.get('failureMessages') or [])
            not_passed.append({'file': name, 'title': a['fullName'], 'status': a['status'], 'ms': a.get('duration'),
                               'timedOut': 'timed out' in msg, 'message': msg[:300]})
    if r['status'] == 'failed' and not r['assertionResults']:
        not_passed.append({'file': name, 'title': '(file failed)', 'status': 'failed', 'ms': None, 'timedOut': False,
                           'message': (r.get('message') or '')[:300]})
res = {'reportSha256': hashlib.sha256(raw).hexdigest(), 'success': rep['success'], 'files': len(rep['testResults']),
       'total': rep['numTotalTests'], 'passed': rep['numPassedTests'], 'failed': rep['numFailedTests'],
       'pending': rep['numPendingTests'], 'todo': rep.get('numTodoTests'),
       'failedFiles': sum(r['status'] == 'failed' for r in rep['testResults']), 'notPassed': not_passed}
json.dump(res, open(out, 'w'), indent=1, ensure_ascii=True)
print({k: v for k, v in res.items() if k != 'notPassed'})
for t in not_passed:
    print(' ', t['status'], t['ms'], t['file'], '>', t['title'][:150], '[timeout]' if t['timedOut'] else '')
