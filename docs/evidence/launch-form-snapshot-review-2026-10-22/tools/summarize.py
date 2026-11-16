"""Summarize this reviewer's mutant results: per mutant and side, the failed rows, distinct error kinds and the test lines they fail at."""
import collections
import json
import re
import sys

ROW = 'launch forms in a run whose marker is unreadable count neither a declared form nor a syzygy-launched one: '
data = json.load(open(sys.argv[1]))
for r in data['results']:
    failed = r.get('failedTests', [])
    rows = sorted(t['test'][len(ROW):] for t in failed if t['test'].startswith(ROW))
    other = [t['test'] for t in failed if not t['test'].startswith(ROW)]
    kinds = collections.Counter(re.sub(r'ino: \d+', 'ino: N', t['firstErrorLine'])[:70] for t in failed)
    frames = collections.Counter(re.search(r'launched\.test\.ts:(\d+)', t['testFrame']).group(1) if 'launched.test.ts:' in t['testFrame'] else '?'
                                 for t in failed)
    print(f"{r['mutant']} / {r['side']}: {r['outcome']}, exit {r['exitCode']}, {json.dumps(r.get('counts'))}, rows failed {len(rows)}, other {len(other)}, "
          f"timedOut {r['timedOut']}, restored {r['restored']}, {r['seconds']} s, testSha256 {r['testSha256'][:12]}")
    for k, n in kinds.items():
        print(f'    {n} x {k}')
    if frames:
        print('    failing test lines:', dict(frames))
    if rows and len(rows) < 17:
        print('    rows:', rows)
