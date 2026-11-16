"""From each stored vitest JSON report, the launched.test.ts line pairs (assertion line, calling ask line) of every failed row."""
import collections
import glob
import json
import os
import re
import sys

for path in sorted(glob.glob(os.path.join(sys.argv[1], '*.vitest.json'))):
    data = json.load(open(path))
    pairs = collections.Counter()
    for f in data['testResults']:
        for a in f['assertionResults']:
            if a['status'] != 'failed':
                continue
            msg = (a.get('failureMessages') or [''])[0]
            lines = re.findall(r'launched\.test\.ts:(\d+):\d+', msg)
            pairs[' -> '.join(lines[:2])] += 1
    if pairs:
        print(os.path.basename(path), dict(pairs))
    else:
        print(os.path.basename(path), 'no failed test')
