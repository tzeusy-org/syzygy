#!/usr/bin/env python3
"""rev-529: run PROJECT-STATUS.md's canonical battery block (the first fenced block after
'## How to verify this page') from <tree>, one command at a time, recording each exit status.

Usage: battery.py <tree> <out-dir>
Assignment lines (NAME=value) are kept as shell state; every other non-blank, non-comment
line is one command. Prints commit=<sha> commands=<n> nonzero=<k> and the nonzero lines.
"""
import os
import re
import subprocess
import sys

tree, out = sys.argv[1:3]
os.makedirs(out, exist_ok=True)
text = open(os.path.join(tree, 'PROJECT-STATUS.md'), encoding='utf-8').read()
section = text[text.index('## How to verify this page'):]
m = re.search(r'```sh\n(.*?)\n```', section, re.S)
lines = m.group(1).split('\n')
script = ['set +e']
n = 0
for line in lines:
    s = line.strip()
    if not s or s.startswith('#'):
        continue
    if re.match(r'^[A-Za-z_][A-Za-z0-9_]*=\S*$', s):
        script.append(s)
        continue
    n += 1
    script.append(f'(\n{s}\n) > "{out}/cmd-{n:03d}.log" 2>&1; echo "{n:03d} $?" >> "{out}/status.txt"')
open(os.path.join(out, 'battery.sh'), 'w').write('\n'.join(script) + '\n')
if os.path.exists(os.path.join(out, 'status.txt')):
    os.unlink(os.path.join(out, 'status.txt'))
subprocess.run(['sh', os.path.join(out, 'battery.sh')], cwd=tree)
commit = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
status = [l.split() for l in open(os.path.join(out, 'status.txt')).read().split('\n') if l]
cmds = [s for s in (l.strip() for l in lines) if s and not s.startswith('#') and not re.match(r'^[A-Za-z_][A-Za-z0-9_]*=\S*$', s)]
nonzero = [(int(i), int(rc)) for i, rc in status if rc != '0']
print(f'commit={commit} commands={len(status)} nonzero={len(nonzero)}')
for i, rc in nonzero:
    print(f'  {i:03d} exit={rc}: {cmds[i - 1]}')
clean = subprocess.run(['git', '-C', tree, 'status', '--porcelain'], capture_output=True, text=True).stdout
print('clean after:', clean == '')
