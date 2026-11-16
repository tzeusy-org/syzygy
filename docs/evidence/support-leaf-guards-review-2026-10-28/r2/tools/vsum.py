"""Summarize a vitest JSON report: totals, per file, and every failing test with its first message line.

Usage: python3 -I vsum.py <report.json> [--tests]
"""
import json
import sys

report = json.load(open(sys.argv[1], encoding='utf-8'))
show_tests = '--tests' in sys.argv
print('total', report['numTotalTests'], 'passed', report['numPassedTests'], 'failed', report['numFailedTests'],
      'pending', report['numPendingTests'], 'files', len(report['testResults']),
      'failedFiles', sum(1 for r in report['testResults'] if r['status'] != 'passed'), 'success', report['success'])
for result in report['testResults']:
    name = result['name'].split('/head/')[-1].split('/merge/')[-1]
    counts = {}
    for test in result['assertionResults']:
        counts[test['status']] = counts.get(test['status'], 0) + 1
    print(' ', name, result['status'], counts, (result.get('message') or '')[:300])
    for test in result['assertionResults']:
        if show_tests or test['status'] == 'failed':
            message = (test.get('failureMessages') or [''])[0].split('\n')[0][:400]
            print('    ', test['status'], int(test.get('duration') or 0), 'ms |', test['fullName'], '|', message)
