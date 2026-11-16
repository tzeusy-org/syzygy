"""Summarize a vitest JSON report: files, totals, failures, per-file title counts; argv[2] optional title-list output."""
import json, sys
d = json.load(open(sys.argv[1]))
files = d['testResults']
print({'files': len(files), 'total': d['numTotalTests'], 'passed': d['numPassedTests'], 'failed': d['numFailedTests'], 'pending': d['numPendingTests'],
       'todo': d.get('numTodoTests'), 'failedFiles': [f['name'] for f in files if f['status'] != 'passed'], 'success': d['success']})
if len(sys.argv) > 2:
    root = sys.argv[3]
    titles = sorted(f"{f['name'].replace(root + '/', '')} :: {t['fullName']}" for f in files for t in f['assertionResults'])
    open(sys.argv[2], 'w').write('\n'.join(titles) + '\n')
    print('titles', len(titles), 'distinct', len(set(titles)))
