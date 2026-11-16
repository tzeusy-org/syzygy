#!/usr/bin/env python3
"""rev-532b: run one test file alone, alternating between two commits, N times each, recording load1 and the vitest
summary (reviewer tool). usage: python3 -I isolated_ab_r2.py TREE FILE COMMIT_A COMMIT_B N OUT.json
TREE must be clean with node_modules installed for both commits (same package-lock); it is left at COMMIT_B."""
import json, os, re, subprocess, sys, time
tree, file, a, b, n, out = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5]), sys.argv[6]
git = lambda *x: subprocess.run(['git', *x], cwd=tree, capture_output=True, text=True, check=True).stdout
if git('status', '--porcelain').strip(): sys.exit('tree not clean')
if subprocess.run(['git', 'diff', '--quiet', a, b, '--', 'package-lock.json', 'package.json'], cwd=tree).returncode: sys.exit('lockfiles differ')
runs = []
for i in range(n):
    for c in (a, b):
        git('checkout', '-q', c)
        load = float(open('/proc/loadavg').read().split()[0]); t = time.time()
        d = subprocess.run(['npx', 'vitest', 'run', file], cwd=tree, capture_output=True, text=True, timeout=900)
        s = [l.strip() for l in d.stdout.splitlines() if re.match(r'\s+Tests\s', l)]
        runs.append({'commit': git('rev-parse', 'HEAD').strip(), 'i': i, 'exit': d.returncode, 'summary': s[-1] if s else None, 'load1Start': load,
                     'seconds': round(time.time() - t, 1), 'timedOut': len(re.findall(r'Test timed out in', d.stdout))})
        print(json.dumps(runs[-1]), flush=True)
json.dump({'tool': 'isolated_ab_r2.py', 'file': file, 'runs': runs}, open(out, 'w'), indent=1)
