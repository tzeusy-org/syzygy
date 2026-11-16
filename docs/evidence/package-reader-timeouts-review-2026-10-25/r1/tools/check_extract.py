#!/usr/bin/env python3
"""Compare the load-127 extract with the lane-B report it names (rev-520). Prints only counts and equalities."""
import hashlib, json, sys

extract_path, original_path = sys.argv[1], sys.argv[2]
raw = open(original_path, 'rb').read()
print('original sha256', hashlib.sha256(raw).hexdigest(), 'bytes', len(raw))
ex, orig = json.load(open(extract_path)), json.loads(raw)
print('extract declares', ex['extractedFrom'])
want = [s for s in orig['testResults'] if s['name'].endswith('/packages/polaris-generation-consent/src/package-reader.test.ts')]
print('original suites for the file:', len(want), 'extract suites:', len(ex['testResults']))
print('suite entry equal (deep):', want[0] == ex['testResults'][0])
for k in ('startTime', 'numTotalTests', 'numFailedTests'):
    print(k, 'extract', ex[k], 'original', orig.get(k), 'equal', ex[k] == orig.get(k))
a = ex['testResults'][0]['assertionResults']
names = [t['fullName'] for t in a]
print('assertions', len(a), 'distinct fullNames', len(set(names)))
st = {}
for t in a: st[t['status']] = st.get(t['status'], 0) + 1
print('status counts', st)
fails = sorted(((round(t['duration']), t['fullName']) for t in a if t['status'] != 'passed'), reverse=True)
print('non-passed in this file:', len(fails))
for d, n in fails: print('  ', d, n[:120])
msgs = {}
for t in a:
    for m in t.get('failureMessages', []):
        key = m.split('\n')[0][:80]
        msgs[key] = msgs.get(key, 0) + 1
print('failure message heads', msgs)
