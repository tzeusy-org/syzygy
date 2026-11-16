#!/usr/bin/env python3
"""Round 3: run PROJECT-STATUS.md's canonical battery ("How to verify this page", the first ```sh block after it) in a clean
clone at the commit checked out, one command per line, and record each command's exit status. Variable assignments
(NAME=value) are kept as shell state and are not counted as commands; blank and comment lines are skipped.

Usage: battery_r3.py <clone> <out.json> <tmpdir>
"""
import json, os, re, subprocess, sys, time

clone, out, tmpdir = sys.argv[1:4]
git = lambda *a: subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True).stdout
commit = git('rev-parse', 'HEAD').strip()
assert git('status', '--porcelain') == '', 'clone must start clean'
text = open(os.path.join(clone, 'PROJECT-STATUS.md'), encoding='utf8').read()
blk = text[text.index('## How to verify this page'):]
a = blk.index('```sh\n') + 6
b = blk.index('```', a)
raw = blk[a:b].splitlines()
assert not any(l.rstrip().endswith('\\') for l in raw), 'continuation lines'
ASSIGN = re.compile(r'^[A-Z_]+=\S+\s*$')
cmds = [l for l in raw if l.strip() and not l.strip().startswith('#') and not ASSIGN.match(l.strip())]
script = ['set +e', 'cd ' + json.dumps(clone)]
n = 0
for line in raw:
    s = line.strip()
    if not s or s.startswith('#'):
        continue
    if ASSIGN.match(s):
        script.append(s)
        continue
    n += 1
    script.append(f'echo "@@@ {n} start"')
    script.append(line)
    script.append(f'echo "@@@ {n} exit $?"')
path = os.path.join(tmpdir, 'battery.sh')
open(path, 'w').write('\n'.join(script) + '\n')
load0 = open('/proc/loadavg').read().split()[0]
t0 = time.time()
proc = subprocess.run(['bash', path], capture_output=True, text=True, env=dict(os.environ, TMPDIR=tmpdir))
wall = round(time.time() - t0, 1)
exits = {int(m.group(1)): int(m.group(2)) for m in re.finditer(r'^@@@ (\d+) exit (\d+)$', proc.stdout, re.M)}
nonzero = [{'n': k, 'command': cmds[k - 1], 'exit': v} for k, v in sorted(exits.items()) if v != 0]
tail = {}
for item in nonzero:
    seg = proc.stdout.split(f'@@@ {item["n"]} start\n', 1)[1].split(f'@@@ {item["n"]} exit', 1)[0]
    tail[item['n']] = seg[-800:]
res = {'commit': commit, 'commands': n, 'blockCommands': len(cmds), 'recordedExits': len(exits), 'nonzero': nonzero, 'nonzeroTails': tail,
       'load1Start': load0, 'load1End': open('/proc/loadavg').read().split()[0], 'wallSeconds': wall,
       'statusAfter': git('status', '--porcelain'), 'stderrTail': proc.stderr[-1500:]}
json.dump(res, open(out, 'w'), indent=2)
print(f'commit={commit} commands={n} nonzero={len(nonzero)} recorded={len(exits)} wall={wall} status-after={res["statusAfter"]!r}')
