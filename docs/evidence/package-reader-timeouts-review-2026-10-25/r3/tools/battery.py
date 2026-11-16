#!/usr/bin/env python3
"""rev-520c: run PROJECT-STATUS.md's canonical battery (the first ```sh block under "## How to verify this page") in TREE, one
command per line, and print commands=N nonzero=M. Same method as rev-520b's tool: NAME=value lines set the environment for later
lines; blank and comment-only lines are skipped; every other line runs as `sh -c LINE` from TREE. It also records how many lines the
block has and how many it skipped, so the denominator can be checked. usage: python3 -I battery.py TREE OUT.json"""
import json, os, re, subprocess, sys, time

tree, out_path = os.path.realpath(sys.argv[1]), sys.argv[2]
text = open(os.path.join(tree, 'PROJECT-STATUS.md'), encoding='utf8').read()
section = text[text.index('## How to verify this page'):]
m = re.search(r'^```sh\n(.*?)^```', section, re.M | re.S)
lines = m.group(1).split('\n')
env, results, skipped, assignments = dict(os.environ), 0, 0, 0
results = []
for line in lines:
    s = line.strip()
    if not s or s.startswith('#'): skipped += 1; continue
    a = re.fullmatch(r'([A-Za-z_][A-Za-z0-9_]*)=(\S+)', s)
    if a: env[a.group(1)] = a.group(2); assignments += 1; continue
    t0 = time.monotonic()
    done = subprocess.run(['sh', '-c', line], cwd=tree, env=env, capture_output=True, text=True)
    tail = [l for l in (done.stdout + done.stderr).strip().split('\n') if l.strip()][-1:] or ['']
    results.append({'command': line, 'exitCode': done.returncode, 'seconds': round(time.monotonic() - t0, 1), 'lastLine': tail[0][:300]})
    print(f"{done.returncode:>3} {results[-1]['seconds']:>6}s  {s[:110]}", flush=True)
commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True).stdout.strip()
dirty = subprocess.run(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=tree, capture_output=True, text=True).stdout
nonzero = [r for r in results if r['exitCode'] != 0]
json.dump({'commit': commit, 'blockLines': len(lines), 'skipped': skipped, 'assignments': assignments, 'commands': len(results),
           'nonzero': len(nonzero), 'treeDirtyAfter': dirty, 'results': results}, open(out_path, 'w'), indent=1)
print(f'block lines {len(lines)}, skipped {skipped}, assignments {assignments}; tree after: {"clean" if not dirty else "DIRTY"}')
print(f'commit={commit} commands={len(results)} nonzero={len(nonzero)}')
for r in nonzero: print('NONZERO', r['exitCode'], r['command'][:150], '|', r['lastLine'][:200])
