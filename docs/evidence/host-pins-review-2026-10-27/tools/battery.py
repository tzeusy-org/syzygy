#!/usr/bin/env python3
"""rev-535: run PROJECT-STATUS.md's canonical battery block, line by line, in a clean clone.

Usage: python3 -I battery.py <tree> <out.json> <tmpdir>
Extracts the ```sh block under "## How to verify this page" from the tree's own PROJECT-STATUS.md, runs it as one
bash script with `set -x`-free per-line exit capture (each non-comment line is wrapped to record its exit code), and
writes {commit, commands, nonzero, rows: [{line, exit, seconds}]}. Variable assignments run but are not counted.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import time

tree, out, tmpdir = sys.argv[1:4]
commit = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
assert subprocess.run(['git', '-C', tree, 'status', '--porcelain'], capture_output=True, text=True).stdout == ''
text = open(os.path.join(tree, 'PROJECT-STATUS.md')).read()
start = text.index('## How to verify this page')
b = text.index('```sh', start) + len('```sh')
e = text.index('```', b)
lines = [l for l in text[b:e].split('\n') if l.strip() and not l.strip().startswith('#')]
env_prefix = []
rows = []
os.makedirs(tmpdir, exist_ok=True)
for line in lines:
    if re.match(r'^[A-Z_]+=\S+$', line.strip()):
        env_prefix.append(line.strip())
        continue
    script = '\n'.join(env_prefix + [line])
    started = time.time()
    run = subprocess.run(['bash', '-c', script], cwd=tree, capture_output=True, text=True,
                         env={**os.environ, 'TMPDIR': tmpdir}, timeout=1800)
    rows.append({'line': line, 'exit': run.returncode, 'seconds': round(time.time() - started, 1),
                 'tail': (run.stdout + run.stderr).strip().split('\n')[-1][:200]})
    print(run.returncode, rows[-1]['seconds'], line[:120], flush=True)
shutil.rmtree(tmpdir, ignore_errors=True)
clean = subprocess.run(['git', '-C', tree, 'status', '--porcelain'], capture_output=True, text=True).stdout == ''
json.dump({'commit': commit, 'commands': len(rows), 'nonzero': sum(r['exit'] != 0 for r in rows), 'cleanAfter': clean,
           'rows': rows}, open(out, 'w'), indent=1)
print(f'commit={commit} commands={len(rows)} nonzero={sum(r["exit"] != 0 for r in rows)} cleanAfter={clean}')
