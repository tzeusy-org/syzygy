#!/usr/bin/env python3
"""Run the PR's utf8-probe.mjs against one r2_mutants.py mutant.
Usage: python3 -I probe_mutant.py <clone> <tmp dir> <commit> <expected probe output> <out.json> <id>...

For each id: check out the commit, apply the mutant (old exactly once), `npx tsc -b --force packages/support
packages/three-surface-poc-core`, run utf8-probe.mjs (the copy at the commit) into the tmp dir, compare with
compare-utf8-probe.py against the expected output, restore the file. Stores the compare summary per id."""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r2_mutants import MUTANTS  # noqa: E402

clone, tmp, commit, expected, out = sys.argv[1:6]
ids = sys.argv[6:]
E = 'docs/evidence/syzygy-bpyt-6-3'
res = {'commit': commit, 'expected': expected, 'rows': []}
subprocess.run(['git', '-C', clone, 'checkout', '-q', '--detach', commit], check=True)
for mid in ids:
    path, old, new = MUTANTS[mid]
    p = os.path.join(clone, path)
    src = open(p, encoding='utf-8').read()
    row = {'id': mid, 'file': path, 'old': old, 'new': new, 'oldCount': src.count(old), 'loadavgBefore': open('/proc/loadavg').read().strip()}
    if row['oldCount'] == 1:
        open(p, 'w', encoding='utf-8').write(src.replace(old, new))
        try:
            b = subprocess.run(['npx', 'tsc', '-b', '--force', 'packages/support', 'packages/three-surface-poc-core'], cwd=clone,
                               env={**os.environ, 'TMPDIR': tmp}, capture_output=True, text=True)
            row['buildExit'] = b.returncode
            o = os.path.join(tmp, f'probe-{mid}.json')
            r = subprocess.run(['node', os.path.join(clone, E, 'utf8-probe.mjs'), clone, o, '--tmp', tmp], cwd=clone,
                               env={**os.environ, 'TMPDIR': tmp}, capture_output=True, text=True)
            row['probeExit'] = r.returncode
            c = subprocess.run(['python3', '-I', os.path.join(clone, E, 'compare-utf8-probe.py'), expected, o], capture_output=True, text=True)
            row['compareExit'] = c.returncode
            row['compare'] = json.loads(c.stdout) if c.stdout.strip().startswith('{') else c.stdout[-1000:]
            os.remove(o)
        finally:
            subprocess.run(['git', '-C', clone, 'checkout', '--', path], check=True)
    row['loadavgAfter'] = open('/proc/loadavg').read().strip()
    res['rows'].append(row)
    json.dump(res, open(out, 'w'), indent=1)
    cmp = row.get('compare', {})
    print(mid, 'build', row.get('buildExit'), 'probe', row.get('probeExit'), 'rowsDiffer', cmp.get('rowsDiffer') if isinstance(cmp, dict) else cmp,
          cmp.get('differPerDriver') if isinstance(cmp, dict) else '', flush=True)
