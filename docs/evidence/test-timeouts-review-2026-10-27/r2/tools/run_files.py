#!/usr/bin/env python3
"""Run named vitest files N rounds each, one process at a time, recording load1 (round-2 reviewer tool).

usage: python3 -I run_files.py TREE OUTDIR TMPDIR ROUNDS LABEL PROJECT FILE [FILE ...]

Rounds are the outer loop. Each run: `npx vitest run --project PROJECT FILE --reporter=default --reporter=<r2_reporter.mjs>`,
in TREE, with TMPDIR set, the reporter's JSON at OUTDIR/<LABEL>-r<k>-<basename>.json, the output tail kept in the summary,
and /proc/loadavg's load1 read before and after. A summary line per run is appended to OUTDIR/<LABEL>.jsonl."""
import json, os, subprocess, sys, time

tree, outdir, tmpdir, rounds, label, project, *files = sys.argv[1:]
reporter = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'r2_reporter.mjs')
load1 = lambda: float(open('/proc/loadavg').read().split()[0])
os.makedirs(outdir, exist_ok=True); os.makedirs(tmpdir, exist_ok=True)
for k in range(1, int(rounds) + 1):
    for f in files:
        out = os.path.join(outdir, f'{label}-r{k}-{os.path.basename(f).removesuffix(".ts")}.json')
        env = {**os.environ, 'TMPDIR': tmpdir, 'R2_OUT': out}
        l0, t0 = load1(), time.time()
        p = subprocess.run(['npx', 'vitest', 'run', '--project', project, f, '--reporter=default', f'--reporter={reporter}'],
                           cwd=tree, env=env, capture_output=True, text=True)
        wall, l1 = round(time.time() - t0, 1), load1()
        row = {'label': label, 'round': k, 'file': f, 'exit': p.returncode, 'wallS': wall, 'load1Start': l0, 'load1End': l1,
               'tail': (p.stdout + p.stderr).strip().split('\n')[-8:]}
        open(os.path.join(outdir, f'{label}.jsonl'), 'a').write(json.dumps(row) + '\n')
        print(label, k, os.path.basename(f), 'exit', p.returncode, 'wall', wall, 'load1', l0, l1, flush=True)
