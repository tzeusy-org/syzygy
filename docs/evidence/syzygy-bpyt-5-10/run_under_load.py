#!/usr/bin/env python3
"""Ten sequential runs of main.test.ts while N busy-loop processes hold the host.

Usage: run_under_load.py <out.json>   (from the worktree root, short TMPDIR)
N is twice the CPU count. The record keeps the HEAD commit, N, the 1-minute load
average before and after, and each run's exit status and test counts.
"""
import json
import os
import pathlib
import subprocess
import sys

TEST = 'apps/three-surface-poc/src/main.test.ts'
out = pathlib.Path(sys.argv[1]).resolve()
burners = 2 * (os.cpu_count() or 1)
procs = [subprocess.Popen([sys.executable, '-c', 'while True: pass']) for _ in range(burners)]
runs = []
try:
    load_before = os.getloadavg()[0]
    for i in range(10):
        proc = subprocess.run(['npx', 'vitest', 'run', TEST, '--reporter=json'], capture_output=True, text=True)
        report = json.loads(proc.stdout[proc.stdout.index('{'):])
        runs.append({'run': i + 1, 'exit': proc.returncode, 'passed': report['numPassedTests'], 'failed': report['numFailedTests']})
    load_after = os.getloadavg()[0]
finally:
    for p in procs:
        p.kill()
head = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
record = {'head': head, 'burnerProcesses': burners, 'loadavg1Before': load_before, 'loadavg1After': load_after, 'runs': runs, 'allPassed': all(r['exit'] == 0 for r in runs)}
out.write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({k: v for k, v in record.items() if k != 'runs'}), [r['passed'] for r in runs])
