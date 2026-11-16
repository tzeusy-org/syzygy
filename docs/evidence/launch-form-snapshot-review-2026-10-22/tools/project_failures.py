"""Classify a vitest JSON report's failed and skipped tests by file and first error line."""
import collections
import json
import os
import sys

data = json.load(open(sys.argv[1]))
print({k: data[k] for k in ('numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTodoTests', 'numTotalTestSuites', 'numFailedTestSuites')})
by_file = collections.defaultdict(collections.Counter)
skipped = []
suite_errors = []
for f in data['testResults']:
    name = os.path.basename(f['name'])
    if f.get('status') == 'failed' and not any(a['status'] == 'failed' for a in f['assertionResults']):
        suite_errors.append((name, (f.get('message') or '')[:200]))
    for a in f['assertionResults']:
        if a['status'] == 'failed':
            msg = (a.get('failureMessages') or [''])[0]
            first = next((ln for ln in msg.splitlines() if ln.strip()), '')
            by_file[name][first[:110]] += 1
        elif a['status'] in ('skipped', 'pending', 'todo'):
            skipped.append((name, a['fullName'][:140]))
for name, counter in sorted(by_file.items()):
    print(name, sum(counter.values()))
    for line, n in counter.most_common():
        print(f'    {n} x {line}')
print('skipped:', skipped)
print('suite-level errors:', suite_errors)
for f in data['testResults']:
    if os.path.basename(f['name']) == 'launched.test.ts':
        statuses = collections.Counter(a['status'] for a in f['assertionResults'])
        print('launched.test.ts:', dict(statuses))
