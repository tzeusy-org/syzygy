"""Re-run each named polaris-dossier test file alone, one after another, and record its counts and failure kinds."""
import json
import os
import re
import subprocess
import sys
import time

clone, out_dir, tmpdir = sys.argv[1:4]
files = sys.argv[4].split(',')
results = []
for name in files:
    report = os.path.join(out_dir, f'rerun-{name}.json')
    log = os.path.join(out_dir, f'rerun-{name}.log')
    cmd = ['npx', 'vitest', 'run', '--project', '@syzygy/polaris-dossier', '--reporter=default', '--reporter=json', f'--outputFile.json={report}',
           f'packages/polaris-dossier/src/{name}']
    started = time.time()
    with open(log, 'w') as handle:
        proc = subprocess.run(cmd, cwd=clone, env=dict(os.environ, CI='1', TMPDIR=tmpdir), stdout=handle, stderr=subprocess.STDOUT, timeout=1800)
    text = re.sub(r'\x1b\[[0-9;]*m', '', open(log, errors='replace').read())
    entry = {'file': name, 'exitCode': proc.returncode, 'seconds': round(time.time() - started, 1),
             'timeouts5000': text.count('Error: Test timed out in 5000ms.')}
    if os.path.exists(report):
        data = json.load(open(report))
        entry['counts'] = {k: data[k] for k in ('numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests')}
    load = open('/proc/loadavg').read().split()[0]
    entry['loadAfter'] = load
    print(json.dumps(entry), flush=True)
    results.append(entry)
json.dump(results, open(os.path.join(out_dir, 'rerun-summary.json'), 'w'), indent=1)
