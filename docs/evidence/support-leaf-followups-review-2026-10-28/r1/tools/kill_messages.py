# Usage: kill_messages.py <mutants json>: each killed row's first failure-message line, and any row whose message names a timeout.
import json, sys
d = json.load(open(sys.argv[1]))
print('commit', d['commit'], 'dist', d['dist'], 'summary', d['summary'], 'statusAfter', repr(d['statusAfter']))
timeouts = []
for r in d['rows']:
    for t in r.get('failedTests') or []:
        line = t['message'].splitlines()[0] if t['message'] else ''
        print(f"{r['id']}: {line[:170]}")
        if 'timed out' in t['message'].lower() or 'timeout' in t['message'].lower(): timeouts.append(r['id'])
    for m in r.get('fileMessages') or []: print(f"{r['id']} [file]: {m.splitlines()[0][:170]}")
print('timeouts', timeouts)
