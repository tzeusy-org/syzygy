#!/usr/bin/env python3
"""rev-532b: summarize a vitest JSON report (failed and skipped rows per file, first failure line). Reviewer tool.
usage: python3 -I suite_failures_r2.py REPORT.json SUBJECT_PATHS.txt OUT.json"""
import json, sys, collections
d = json.load(open(sys.argv[1], encoding='utf8'))
subject = {l.strip() for l in open(sys.argv[2]) if l.strip()}
files, failed, skipped = [], [], collections.Counter()
for s in d['testResults']:
    rel = s['name'].split('/clone/', 1)[-1].split('/clone-merge/', 1)[-1]
    files.append(rel)
    if s.get('status') == 'failed' and not s['assertionResults']: failed.append({'file': rel, 'title': '(file)', 'failure': (s.get('message') or '')[:300], 'inSubject': rel in subject})
    for a in s['assertionResults']:
        if a['status'] == 'failed':
            failed.append({'file': rel, 'title': a['fullName'][:160], 'failure': (a.get('failureMessages') or [''])[0].split('\n')[0][:300], 'inSubject': rel in subject})
        elif a['status'] in ('skipped', 'pending', 'todo'):
            skipped[rel] += 1
out = {k: d.get(k) for k in ('numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTodoTests', 'numTotalTestSuites', 'numFailedTestSuites', 'success')}
out.update({'files': len(files), 'failed': failed, 'skippedByFile': dict(skipped), 'failedInSubject': sum(f['inSubject'] for f in failed)})
json.dump(out, open(sys.argv[3], 'w'), indent=1)
print(json.dumps({k: v for k, v in out.items() if k not in ('failed', 'skippedByFile')}))
for f in failed: print('FAILED', f['file'], '|', f['title'][-90:], '|', f['failure'][:200])
for k, v in skipped.items(): print('SKIPPED', k, v)
