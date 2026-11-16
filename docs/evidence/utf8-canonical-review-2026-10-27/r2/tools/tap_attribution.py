#!/usr/bin/env python3
"""Which test file makes the six extra canonical JSON calls of the repair-1 tap? (PR 534, round 2, N1 check)
Usage: python3 -I tap_attribution.py <scratch clone> <tap tools dir> <tmp dir> <out.json> <commit>...

For each commit: check out (detached), apply the PR's canonical-json-tap-apply.py (scratch clone only), run each of
the two candidate test files alone with CJ_TAP_OUT set, aggregate with the PR's canonical-json-tap-aggregate.py,
then restore the clone (git checkout -- . and remove cj-tap-setup.ts). Stores, per commit and file, the production
lenient caller rows (calls, same, different)."""
import json
import os
import subprocess
import sys

clone, tools, tmp, out = sys.argv[1:5]
commits = sys.argv[5:]
FILES = ['packages/three-surface-poc-core/src/project-shape-git-text.test.ts',
         'packages/three-surface-poc-core/src/project-shape-observation.test.ts']
res = {'files': FILES, 'runs': []}


def git(*a):
    return subprocess.run(['git', '-C', clone, *a], check=True, capture_output=True, text=True).stdout


for c in commits:
    git('checkout', '-q', '--detach', c)
    ap = subprocess.run(['python3', '-I', os.path.join(tools, 'canonical-json-tap-apply.py'), clone], capture_output=True, text=True)
    try:
        if ap.returncode != 0:
            res['runs'].append({'commit': c, 'applyError': ap.stderr[-500:] + ap.stdout[-500:]})
            continue
        for f in FILES:
            d = os.path.join(tmp, f'tap-{c}-{os.path.basename(f)}')
            os.makedirs(d, exist_ok=True)
            env = {**os.environ, 'TMPDIR': tmp, 'CJ_TAP_OUT': os.path.join(d, 'tap'), 'CJ_TAP_ROOT': clone}
            load = open('/proc/loadavg').read().strip()
            v = subprocess.run(['npx', 'vitest', 'run', f, '--testTimeout=60000', '--hookTimeout=60000'], cwd=clone, env=env, capture_output=True, text=True)
            summary = [l.strip() for l in v.stdout.splitlines() if l.strip().startswith(('Test Files', 'Tests'))]
            agg_out = os.path.join(d, 'agg.json')
            a = subprocess.run(['python3', '-I', os.path.join(tools, 'canonical-json-tap-aggregate.py'), d, agg_out], capture_output=True, text=True)
            rows = []
            if a.returncode == 0:
                agg = json.load(open(agg_out))
                rows = [{k: r[k] for k in ('caller', 'calls', 'same', 'different')} for r in agg['callers'] if r['origin'] == 'production' and r['kind'] == 'lenient']
            res['runs'].append({'commit': c, 'file': f, 'vitestExit': v.returncode, 'summary': summary, 'aggregateExit': a.returncode,
                                'linesRead': (json.load(open(agg_out))['linesRead'] if a.returncode == 0 else None), 'productionLenient': rows, 'loadavg': load})
            print(c, os.path.basename(f), v.returncode, summary, rows, flush=True)
    finally:
        git('checkout', '--', '.')
        p = os.path.join(clone, 'cj-tap-setup.ts')
        if os.path.exists(p):
            os.remove(p)
        res['restoredClean'] = git('status', '--short') == ''
    json.dump(res, open(out, 'w'), indent=1)
json.dump(res, open(out, 'w'), indent=1)
