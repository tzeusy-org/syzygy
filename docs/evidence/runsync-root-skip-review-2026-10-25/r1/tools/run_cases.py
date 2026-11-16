#!/usr/bin/env python3
"""rev-525 driver: run probe.py for each named case in order, writing OUTDIR/run-<case>.json.

usage: python3 -I run_cases.py TREE OUTDIR CASE...

Before each case it reads `ss -ltnH` and refuses to start while anything listens on port 7477, so a mutant daemon can never
collide with, or be mistaken for, someone else's listener."""
import os, subprocess, sys, time

tree, outdir, cases = sys.argv[1], sys.argv[2], sys.argv[3:]
probe = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'probe.py')
for case in cases:
    busy = [l for l in subprocess.run(['ss', '-ltnH'], capture_output=True, text=True).stdout.split('\n')
            if len(l.split()) >= 4 and l.split()[3].rsplit(':', 1)[1] == '7477']
    if busy: sys.exit(f'{case}: port 7477 is in use, not starting: {busy}')
    t0 = time.monotonic()
    done = subprocess.run([sys.executable, '-I', probe, tree, case, os.path.join(outdir, f'run-{case}.json')], capture_output=True, text=True)
    print(f'== {case} (probe exit {done.returncode}, {time.monotonic() - t0:.0f} s)\n{done.stdout[-1500:]}{done.stderr[-1500:]}', flush=True)
    if done.returncode: sys.exit(f'{case}: probe failed')
