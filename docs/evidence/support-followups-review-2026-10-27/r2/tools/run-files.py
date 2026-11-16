#!/usr/bin/env python3
"""Run a named set of vitest files once and summarise per file from the JSON reporter.

Usage: run-files.py <clone> <tmpdir> <out.json> <file> [<file> ...]
Prints HEAD, load average before and after, one row per file (tests, passed, failed, skipped) and a total line.
Every named file must appear in the report (a file vitest did not run is listed as missing).
"""
import json
import os
import subprocess
import sys

clone, tmpdir, out, *files = sys.argv[1:]
head = subprocess.run(['git', '-C', clone, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
before = open('/proc/loadavg').read().strip()
report = os.path.join(tmpdir, 'report.json')
p = subprocess.run(['npx', 'vitest', 'run', '--testTimeout=60000', '--hookTimeout=60000', '--reporter=json', f'--outputFile={report}', *files],
                   cwd=clone, env=dict(os.environ, TMPDIR=tmpdir), capture_output=True, text=True)
after = open('/proc/loadavg').read().strip()
r = json.load(open(report))
rows = {}
for s in r['testResults']:
    rel = os.path.relpath(s['name'], clone)
    st = [t['status'] for t in s['assertionResults']]
    rows[rel] = {'tests': len(st), 'passed': st.count('passed'), 'failed': st.count('failed'), 'skipped': len(st) - st.count('passed') - st.count('failed'),
                 'failedTests': [t['fullName'] for t in s['assertionResults'] if t['status'] == 'failed']}
missing = [f for f in files if f not in rows]
total = {k: sum(v[k] for v in rows.values()) for k in ('tests', 'passed', 'failed', 'skipped')}
print(f'HEAD {head}\nloadavg before {before}\nloadavg after {after}\nexit={p.returncode} files={len(files)} filesRun={len(rows)} missing={missing}')
for f in files:
    v = rows.get(f)
    print(f'  {f}: ' + (f"{v['tests']} tests, {v['passed']} passed, {v['failed']} failed, {v['skipped']} skipped {v['failedTests']}" if v else 'MISSING'))
print('total', total)
json.dump({'head': head, 'exit': p.returncode, 'files': files, 'rows': rows, 'total': total, 'loadavg': [before, after]}, open(out, 'w'), indent=1)
