#!/usr/bin/env python3
"""Run one Chrome-driven test under a long and a short private TMPDIR.

Usage: tmpdir_length_probe.py <worktree> <tree-commit> <out.json> <long-tmpdir> <short-tmpdir>

orrery.browser.test.ts launches Chrome with a throwaway profile under TMPDIR
(launchBrowser in cdp-browser.ts makes `syzygy-poc-browser-XXXXXX` there). The
test runs once per directory; the record holds each directory's path length, the
exit code and the first line of any browser error. Both directories must exist.
The cause is not established here: the record reports the observed difference only.
"""
import json
import os
import pathlib
import subprocess
import sys

WT, COMMIT, OUT = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]).resolve()
TEST = 'apps/three-surface-poc/src/orrery.browser.test.ts'
results = []
for label, directory in (('long', sys.argv[4]), ('short', sys.argv[5])):
    path = pathlib.Path(directory).resolve()
    proc = subprocess.run(['npx', 'vitest', 'run', TEST, '--project', '@syzygy/three-surface-poc-app'], cwd=WT, capture_output=True, text=True, env={**os.environ, 'TMPDIR': str(path)})
    text = proc.stdout + proc.stderr
    error = next((line.strip() for line in text.splitlines() if 'browser exited' in line), '')
    results.append({
        'label': label,
        'tmpdirLength': len(str(path)),
        'profilePathLength': len(str(path / 'syzygy-poc-browser-XXXXXX')),
        'exit': proc.returncode,
        'summary': [line.strip() for line in text.splitlines() if line.strip().startswith(('Test Files', 'Tests '))],
        'firstBrowserErrorLine': error,
    })
    print(results[-1], flush=True)
OUT.write_text(json.dumps({'tool': 'tmpdir_length_probe.py', 'treeCommit': COMMIT, 'testFile': TEST, 'results': results}, indent=1) + '\n')
