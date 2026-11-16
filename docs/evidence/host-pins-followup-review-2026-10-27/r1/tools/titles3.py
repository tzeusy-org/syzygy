#!/usr/bin/env python3
"""Vitest's own title list for the three subject test files at the checked-out commit.

Usage: python3 -I titles3.py <tree> <out.json> <tmpdir>
Runs `npx vitest list --json=<file> <three files>` with TMPDIR=<tmpdir> (removed afterwards) and stores
the commit and every (file, name) pair it lists.
"""
import json
import os
import shutil
import subprocess
import sys

tree, out, tmpdir = sys.argv[1:4]
FILES = ['packages/http-host/src/credentials.test.ts', 'apps/three-surface-poc/src/browser-origin.test.ts',
         'packages/cap1-daemon/src/server.test.ts']
os.makedirs(tmpdir, exist_ok=False)
try:
    report = os.path.join(tmpdir, 'list.json')
    run = subprocess.run(['npx', 'vitest', 'list', f'--json={report}', *FILES], cwd=tree, capture_output=True,
                         text=True, env={**os.environ, 'TMPDIR': tmpdir}, timeout=900)
    listed = json.load(open(report))
finally:
    shutil.rmtree(tmpdir, ignore_errors=True)
head = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
pairs = sorted([os.path.relpath(t['file'], tree), t['name']] for t in listed)
json.dump({'commit': head, 'exit': run.returncode, 'count': len(pairs), 'titles': pairs}, open(out, 'w'), indent=1,
          ensure_ascii=True)
print(head[:8], 'exit', run.returncode, 'titles', len(pairs))
