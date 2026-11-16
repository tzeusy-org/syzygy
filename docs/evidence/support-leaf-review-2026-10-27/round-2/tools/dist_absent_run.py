#!/usr/bin/env python3
"""Run vitest in a built clone with every packages/*/dist and apps/*/dist moved aside, then move them back.
Usage: dist_absent_run.py <clone> <out.json> <tmpdir> [vitest args...]  (JSON reporter to <out.json>; console to stdout)"""
import os
import shutil
import subprocess
import sys

clone, out, tmp, extra = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
os.makedirs(tmp, exist_ok=True)
dists = [os.path.join(clone, t, n, 'dist') for t in ('packages', 'apps') for n in sorted(os.listdir(os.path.join(clone, t)))
         if os.path.isdir(os.path.join(clone, t, n, 'dist'))]
print('moving aside', len(dists), 'dist directories', flush=True)
for d in dists:
    shutil.move(d, d + '.away-r530b')
try:
    left = [os.path.join(clone, t, n, 'dist') for t in ('packages', 'apps') for n in os.listdir(os.path.join(clone, t)) if os.path.isdir(os.path.join(clone, t, n, 'dist'))]
    print('dist directories present during the run:', left, flush=True)
    rc = subprocess.run(['npx', 'vitest', 'run', '--reporter=default', '--reporter=json', f'--outputFile.json={out}', *extra], cwd=clone,
                        env=dict(os.environ, TMPDIR=tmp)).returncode
    print('vitest exit', rc, flush=True)
finally:
    for d in dists:
        shutil.move(d + '.away-r530b', d)
    print('restored', len(dists), flush=True)
