#!/usr/bin/env python3
"""Run the changed test files several times at one commit, for syzygy-bpyt.7.14.

Usage: python3 -I repeats.py <tree> <out.json> <runs> <tmpdir> <file> [file ...]
Each run is `npx vitest run <files>` with a private TMPDIR. A run passes when it exits 0
and its Tests line counts every test as passed. The one-minute load average is recorded
before each run.
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

tree, out, runs, tmpdir, *files = sys.argv[1:]
assert subprocess.run(['git', '-C', tree, 'status', '--porcelain'], capture_output=True, text=True).stdout == ''
commit = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
command = ['npx', 'vitest', 'run', *files]
records = []
for n in range(1, int(runs) + 1):
    load1 = float(open('/proc/loadavg').read().split()[0])
    os.makedirs(tmpdir, exist_ok=True)
    run = subprocess.run(command, cwd=tree, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmpdir}, timeout=1800)
    shutil.rmtree(tmpdir, ignore_errors=True)
    plain = re.sub(r'\x1b\[[0-9;]*m', '', run.stdout + run.stderr)
    files_line = next((l.strip() for l in plain.split('\n') if re.match(r'\s*Test Files\s', l)), '')
    tests_line = next((l.strip() for l in plain.split('\n') if re.match(r'\s*Tests\s', l)), '')
    passed = int(m.group(1)) if (m := re.search(r'(\d+) passed', tests_line)) else 0
    total = int(m.group(1)) if (m := re.search(r'\((\d+)\)', tests_line)) else 0
    records.append({'run': n, 'exit': run.returncode, 'testFiles': files_line, 'tests': tests_line, 'passed': passed,
                    'total': total, 'failed': run.returncode != 0 or passed != total,
                    'logSha256': hashlib.sha256(plain.encode()).hexdigest(), 'load1': load1})
    print(n, run.returncode, tests_line, load1, flush=True)
json.dump({'what': 'the changed test files, run repeatedly at one commit', 'commit': commit, 'command': command, 'runs': records},
          open(out, 'w'), indent=1)
