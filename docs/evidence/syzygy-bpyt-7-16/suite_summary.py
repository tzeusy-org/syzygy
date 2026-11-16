"""syzygy-bpyt.7.16 (syzygy-bpyt.8.39's suite_summary.py, unchanged but for this line): summarize Vitest JSON reports of suites at HEAD into suite.json (the reports, about 750 KB
each, are not kept). Each run names its tree's commit, its command, the host load printed before and after it, its totals and every
test that did not pass, with its duration and the first line of its error.
Usage: python3 -I suite_summary.py <tree> <out.json> <label>=<report.json>=<load before>=<load after>=<command> ...
"""
import json, subprocess, sys

tree, out = sys.argv[1:3]
commit = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], check=True, capture_output=True, text=True).stdout.strip()
clean = subprocess.run(['git', '-C', tree, 'status', '--porcelain'], check=True, capture_output=True, text=True).stdout == ''
runs = []
for arg in sys.argv[3:]:
    label, report, before, after, command = arg.split('=', 4)
    data = json.load(open(report))
    runs.append({
        'label': label, 'command': command, 'load1Before': float(before), 'load1After': float(after),
        'success': data['success'], 'files': len(data['testResults']), 'total': data['numTotalTests'], 'passed': data['numPassedTests'],
        'failed': data['numFailedTests'], 'skipped': data['numPendingTests'] + data.get('numTodoTests', 0),
        'notPassed': [{'file': f['name'].replace(tree + '/', ''), 'name': t['fullName'], 'status': t['status'],
                       'ms': None if t.get('duration') is None else round(t['duration']),
                       'error': next(iter(t.get('failureMessages') or []), '').split('\n', 1)[0]}
                      for f in data['testResults'] for t in f['assertionResults'] if t['status'] != 'passed'],
    })
with open(out, 'w') as fh:
    fh.write(json.dumps({'tree': 'a clone at HEAD', 'commit': commit, 'cleanAfter': clean, 'runs': runs}, indent=1) + '\n')
print(json.dumps({'commit': commit, 'runs': [(r['label'], r['total'], r['passed'], r['failed'], r['skipped']) for r in runs]}))
