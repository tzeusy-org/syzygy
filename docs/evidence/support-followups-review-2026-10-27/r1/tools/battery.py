#!/usr/bin/env python3
"""Run PROJECT-STATUS.md's "How to verify this page" sh block in a clone, one command per line, and count nonzero exits.
Usage: battery.py <clone> <private tmpdir>. Variable assignments (NAME=value) are carried into later lines; comments and blank
lines are skipped. Prints each nonzero command with its last stderr line, then `commands=<n> nonzero=<m>`."""
import os, re, subprocess, sys
clone, tmp = sys.argv[1:3]
os.makedirs(tmp, exist_ok=True)
text = open(os.path.join(clone, 'PROJECT-STATUS.md'), encoding='utf-8').read()
section = text[text.index('## How to verify this page'):]
block = re.search(r'```sh\n(.*?)\n```', section, re.S).group(1)
env = {**os.environ, 'TMPDIR': tmp}
n = bad = 0
for line in block.split('\n'):
    s = line.strip()
    if not s or s.startswith('#'):
        continue
    m = re.fullmatch(r'([A-Z_][A-Z0-9_]*)=(\S+)', s)
    if m:
        env[m.group(1)] = m.group(2)
        continue
    n += 1
    p = subprocess.run(['bash', '-c', s], cwd=clone, env=env, capture_output=True, text=True)
    if p.returncode != 0:
        bad += 1
        tail = (p.stderr.strip() or p.stdout.strip()).split('\n')[-1][:200]
        print(f'NONZERO rc={p.returncode}: {s[:160]}  :: {tail}', flush=True)
print(f'commands={n} nonzero={bad}')
sys.exit(1 if bad else 0)
