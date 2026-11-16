#!/usr/bin/env python3
"""Run blindspots.mjs under scratch_trace.cjs in a private TMPDIR and print, per top-level entry, whether the trace logged it.

Usage: run_blindspots.py <clone> <private-dir (short, absent or empty)>
"""
import json
import os
import pathlib
import shutil
import subprocess
import sys

clone, private = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
assert private.is_absolute() and len(str(private)) <= 30 and (not private.exists() or not any(private.iterdir()))
tmp, log = private / 'tmp', private / 'trace.jsonl'
tmp.mkdir(parents=True)
here = pathlib.Path(__file__).resolve().parent
pre = clone / 'docs/evidence/scratch-prefix-census-2026-10-23/scratch_trace.cjs'
env = {**os.environ, 'TMPDIR': str(tmp), 'SCRATCH_TRACE_LOG': str(log), 'SCRATCH_TRACE_ROOT': str(here.parent), 'NODE_OPTIONS': f'--require {pre}'}
ran = subprocess.run(['node', str(here / 'blindspots.mjs')], env=env, capture_output=True, text=True, timeout=120)
rows = [json.loads(l) for l in log.read_text().splitlines()] if log.exists() else []
logged = {os.path.basename(r['path']) for r in rows}
listing = sorted(os.listdir(tmp))
print('exit', ran.returncode, ran.stderr.strip()[:300])
print('node', subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(), 'traceLines', len(rows))
for name in listing:
    print(('traced  ' if name in logged else 'UNTRACED'), name)
shutil.rmtree(private)
print('removed', private, not private.exists())
