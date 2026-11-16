"""rev-540: reduce vitest JSON reports to what the review cites: totals, every failure (file, title, first message line, duration),
the POC project's counts and the two new rows' status. The raw JSON (about 2 MB each) is not kept.
Usage: python3 -I suite_summary.py <out.json> <label>=<report.json> [...]
"""
import json, sys

out, runs = sys.argv[1], sys.argv[2:]
summary = {}
for arg in runs:
    label, path = arg.split('=', 1)
    d = json.load(open(path))
    root = '/' + label.split('-')[0] + '/'
    failures, poc = [], {'files': 0, 'total': 0, 'passed': 0, 'failed': 0, 'skipped': 0}
    new_rows = {}
    for r in d['testResults']:
        name = r['name'].split('/rev-540/', 1)[-1].split('/', 1)[-1]
        if r['status'] == 'failed' and not r['assertionResults']:
            failures.append({'file': name, 'title': '(file)', 'message': (r.get('message') or '').splitlines()[0][:200]})
        if r['status'] == 'failed' and r['assertionResults'] and not any(a['status'] == 'failed' for a in r['assertionResults']):
            failures.append({'file': name, 'title': '(suite hook)', 'message': (r.get('message') or '').splitlines()[0][:200] if r.get('message') else ''})
        for a in r['assertionResults']:
            if a['status'] == 'failed':
                failures.append({'file': name, 'title': a['fullName'][:200], 'durationMs': round(a.get('duration') or 0),
                                 'message': next((l for l in '\n'.join(a['failureMessages']).splitlines() if l.startswith('Error') or 'Error' in l), '')[:200]})
            if name.startswith('apps/three-surface-poc/'):
                poc['total'] += 1
                poc['passed' if a['status'] == 'passed' else 'failed' if a['status'] == 'failed' else 'skipped'] += 1
            if name == 'apps/three-surface-poc/src/git-observation.test.ts' and a['title'].startswith('protects every'):
                new_rows[a['title']] = a['status']
        poc['files'] += name.startswith('apps/three-surface-poc/')
    summary[label] = {'report': path.rsplit('/', 1)[-1], 'success': d['success'],
                      'files': {'total': len(d['testResults']), 'failed': sum(r['status'] == 'failed' for r in d['testResults'])},
                      'tests': {k: d[k] for k in ('numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests')},
                      'failures': failures, 'poc': poc, 'newRows': new_rows}
    print(label, summary[label]['tests'], 'failures', len(failures), 'poc', poc, new_rows)
json.dump(summary, open(out, 'w'), indent=1)
