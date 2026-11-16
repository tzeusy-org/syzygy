"""run_ab.py: interleave base and head runs of the same vitest invocation, N rounds (R-GP-IMPL-TEST-TIMEOUTS-1).
Usage: python3 run_ab.py <base-checkout> <head-checkout> <outdir> <label> <rounds> <tmpdir> -- <file>...
Each round runs `npx vitest run <files...> --reporter=dot --reporter=<tree_reporter.mjs> --includeTaskLocation` once in
the base checkout and once in the head checkout (alternating which goes first), with the checkouts' own configs. Writes
<outdir>/<label>-<side>-r<round>.json (the tree) and one line per run to <outdir>/<label>.jsonl with load1 before/after.
"""
import json, os, subprocess, sys, time
a = sys.argv[1:]
base, head, outdir, label, rounds, tmpdir = a[:6]
assert a[6] == '--'
files = a[7:]
outdir = os.path.abspath(outdir)
os.makedirs(outdir, exist_ok=True); os.makedirs(tmpdir, exist_ok=True)
reporter = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tree_reporter.mjs')
load = lambda: open('/proc/loadavg').read().split()[0]
for r in range(1, int(rounds) + 1):
    order = [('base', base), ('head', head)] if r % 2 else [('head', head), ('base', base)]
    for side, checkout in order:
        tree = os.path.join(outdir, f'{label}-{side}-r{r}.json')
        env = dict(os.environ, TMPDIR=tmpdir, REV537_OUT=tree)
        cmd = ['npx', 'vitest', 'run', *files, '--reporter=dot', f'--reporter={reporter}', '--includeTaskLocation']
        before, t0 = load(), time.monotonic()
        p = subprocess.run(cmd, cwd=checkout, env=env, capture_output=True, text=True)
        row = {'label': label, 'side': side, 'round': r, 'exit': p.returncode, 'wallS': round(time.monotonic() - t0, 1),
               'load1Before': before, 'load1After': load(), 'tail': (p.stdout + p.stderr).splitlines()[-30:]}
        open(os.path.join(outdir, f'{label}.jsonl'), 'a').write(json.dumps(row) + '\n')
        print(label, side, r, 'exit', p.returncode, 'wall', row['wallS'], 'load1', before, row['load1After'], flush=True)
