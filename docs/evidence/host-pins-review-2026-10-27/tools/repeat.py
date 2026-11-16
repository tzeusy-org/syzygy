#!/usr/bin/env python3
"""rev-535: run the five changed test files N times at the tree's HEAD, P runs at a time.

Usage: python3 -I repeat.py <tree> <out.json> <runs> <parallel> <tmp-prefix>
Each run gets its own TMPDIR (<tmp-prefix>-<n>, removed afterwards). Records per run: the exit code,
the Tests line, the one-minute load average at start, and every leftover entry under its TMPDIR
before removal (a row that does not clean up leaves a directory behind).
"""
import json
import os
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

tree, out, runs, parallel, prefix = sys.argv[1:6]
FILES = ['apps/three-surface-poc/src/browser-origin.test.ts', 'apps/three-surface-poc/src/git-observation.test.ts',
         'packages/cap1-daemon/src/package.test.ts', 'packages/cap1-daemon/src/server.test.ts',
         'packages/http-host/src/credentials.test.ts']
commit = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
assert subprocess.run(['git', '-C', tree, 'status', '--porcelain'], capture_output=True, text=True).stdout == ''


def one(n):
    tmp = f'{prefix}-{n}'
    os.makedirs(tmp, exist_ok=True)
    load1 = float(open('/proc/loadavg').read().split()[0])
    run = subprocess.run(['npx', 'vitest', 'run', *FILES], cwd=tree, capture_output=True, text=True,
                         env={**os.environ, 'TMPDIR': tmp}, timeout=1800)
    plain = re.sub(r'\x1b\[[0-9;]*m', '', run.stdout + run.stderr)
    tests = next((l.strip() for l in plain.split('\n') if re.match(r'\s*Tests\s', l)), '')
    failed = sorted({l.strip() for l in plain.split('\n') if re.match(r'\s*(FAIL|×)\s', l)})
    leftovers = sorted(os.listdir(tmp))
    shutil.rmtree(tmp, ignore_errors=True)
    return {'run': n, 'exit': run.returncode, 'tests': tests, 'failed': failed, 'load1': load1, 'tmpLeftovers': leftovers}


with ThreadPoolExecutor(int(parallel)) as pool:
    records = list(pool.map(one, range(1, int(runs) + 1)))
for r in records:
    print(r['run'], r['exit'], r['tests'], r['load1'], 'leftovers', len(r['tmpLeftovers']), r['failed'][:3], flush=True)
json.dump({'commit': commit, 'files': FILES, 'parallel': int(parallel), 'runs': records}, open(out, 'w'), indent=1)
print('passing runs', sum(r['exit'] == 0 for r in records), 'of', len(records))
