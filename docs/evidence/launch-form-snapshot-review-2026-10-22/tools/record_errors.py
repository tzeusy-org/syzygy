"""Print each mutant's distinct first error lines and failed-row set from the record."""
import collections
import json
import sys

rec = json.load(open(sys.argv[1]))
for m in rec['mutants']:
    lines = collections.Counter(t['firstErrorLine'][:150] for t in m['failedTests'])
    print('---', m['id'], m['tests'], m['outcome'], len(m['failedRows']))
    for line, n in lines.items():
        print(f'   {n} x {line}')
    if m['id'] == 'D4-truncate' and m['tests'] == 'fix':
        print('   rows:', m['failedRows'])
    if m['id'] == 'D1-with-memoized-reader' and m['tests'] == 'fix':
        print('   rows:', m['failedRows'])
        print('   test sample:', m['failedTests'][0]['test'][:200])
