"""run_sample.py: run vitest files one at a time, N rounds, recording load1 and the task tree of each run
(R-GP-IMPL-TEST-TIMEOUTS-1).

Usage: python3 run_sample.py <checkout> <outdir> <label> <rounds> <tmpdir> [--extra "<vitest args>"] -- <file>...
Each run: `npx vitest run <file> --reporter=dot --reporter=<tree_reporter.mjs> --includeTaskLocation <extra>` in
<checkout>, with TMPDIR=<tmpdir>. Rounds are the outer loop, so one file's runs are spread over the session.
Writes <outdir>/<label>-r<round>-<file stem>.json (the tree) and appends one line per run to <outdir>/<label>.jsonl:
file, round, exit code, wall seconds, /proc/loadavg before and after, and the last 40 lines of output.
"""
import json, os, subprocess, sys, time

args = sys.argv[1:]
checkout, outdir, label, rounds, tmpdir = args[:5]
outdir = os.path.abspath(outdir)
rest = args[5:]
extra = []
if rest and rest[0] == '--extra':
    extra = rest[1].split()
    rest = rest[2:]
assert rest[0] == '--'
files = rest[1:]
reporter = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tree_reporter.mjs')
os.makedirs(outdir, exist_ok=True)
os.makedirs(tmpdir, exist_ok=True)


def load():
    with open('/proc/loadavg') as f:
        return f.read().split()[0]


for r in range(1, int(rounds) + 1):
    for f in files:
        stem = os.path.basename(f).replace('.ts', '')
        tree = os.path.join(outdir, f'{label}-r{r}-{stem}.json')
        env = dict(os.environ, TMPDIR=tmpdir, REV537_OUT=tree)
        cmd = ['npx', 'vitest', 'run', f, '--reporter=dot', f'--reporter={reporter}', '--includeTaskLocation', *extra]
        before = load()
        t0 = time.monotonic()
        p = subprocess.run(cmd, cwd=checkout, env=env, capture_output=True, text=True)
        wall = round(time.monotonic() - t0, 1)
        after = load()
        tail = (p.stdout + p.stderr).splitlines()[-40:]
        row = {'label': label, 'file': f, 'round': r, 'exit': p.returncode, 'wallS': wall, 'load1Before': before,
               'load1After': after, 'cmd': ' '.join(cmd[3:]), 'tail': tail}
        with open(os.path.join(outdir, f'{label}.jsonl'), 'a') as out:
            out.write(json.dumps(row) + '\n')
        print(label, r, f, 'exit', p.returncode, 'wall', wall, 'load1', before, after, flush=True)
