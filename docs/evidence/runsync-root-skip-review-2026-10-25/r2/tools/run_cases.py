#!/usr/bin/env python3
"""rev-525b driver: run probe.py for each named case in order, writing OUTDIR/run-<case>.json.

usage: python3 -I run_cases.py TREE OUTDIR CASE...

probe.py itself refuses to start while anything listens on 7477; this driver stops at the first probe failure."""
import os, subprocess, sys, time

tree, outdir, cases = sys.argv[1], sys.argv[2], sys.argv[3:]
probe = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'probe.py')
for case in cases:
    t0 = time.monotonic()
    done = subprocess.run([sys.executable, '-I', probe, tree, case, os.path.join(outdir, f'run-{case}.json')], capture_output=True, text=True)
    print(f'== {case} (probe exit {done.returncode}, {time.monotonic() - t0:.0f} s)\n{done.stdout[-2500:]}{done.stderr[-1500:]}', flush=True)
    if done.returncode: sys.exit(f'{case}: probe failed')
print('== all cases done', flush=True)
