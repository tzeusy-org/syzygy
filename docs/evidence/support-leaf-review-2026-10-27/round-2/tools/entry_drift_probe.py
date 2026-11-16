#!/usr/bin/env python3
"""Entry drift: the package's "." export moves to a new entry (src/main.ts, which egresses at import) while src/index.ts stays.
Does the S10 proof (alias hard-coded to src/index.ts) stay green, and does Node's own resolution of @syzygy/support (what a
dist-run consumer gets) reach the egressing entry? Usage: entry_drift_probe.py <built clone> <out.json> <tmpdir>
Restores package.json, removes src/main.ts, rebuilds packages/support/dist from clean source, and checks git status."""
import json
import os
import re
import shutil
import subprocess
import sys

clone, out_path, tmp = sys.argv[1:4]
os.makedirs(tmp, exist_ok=True)
pkg = os.path.join(clone, 'packages/support/package.json')
main_ts = os.path.join(clone, 'packages/support/src/main.ts')
original = open(pkg).read()
assert original.count('./dist/index.js') == 2 and original.count('./dist/index.d.ts') == 1
result = {}
try:
    open(pkg, 'w').write(original.replace('./dist/index.js', './dist/main.js').replace('./dist/index.d.ts', './dist/main.d.ts'))
    open(main_ts, 'w').write("import { createSocket } from 'node:dgram';\nexport * from './index.js';\ncreateSocket('udp4').bind(0, '127.0.0.1').unref();\n")
    out = os.path.join(tmp, 'vitest.json')
    proc = subprocess.run(['npx', 'vitest', 'run', 'packages/polaris-dossier/src/no-egress.test.ts', '--reporter=json', f'--outputFile={out}'], cwd=clone,
                          env=dict(os.environ, TMPDIR=tmp), capture_output=True, text=True, timeout=1500)
    d = json.load(open(out))
    result['s10'] = {'exit': proc.returncode, 'passed': d['numPassedTests'], 'failed': d['numFailedTests'], 'pending': d['numPendingTests']}
    b = subprocess.run(['npx', 'tsc', '-b', 'packages/support'], cwd=clone, capture_output=True, text=True)
    result['buildSupport'] = {'exit': b.returncode, 'out': (b.stdout + b.stderr)[-300:]}
    log = os.path.join(tmp, 'resolve.strace')
    r = subprocess.run(['strace', '-f', '-qq', '-e', 'trace=%network', '-o', log, 'node', '--input-type=module', '-e',
                        "const m = await import('@syzygy/support'); console.log(typeof m.sha256);"],
                       cwd=os.path.join(clone, 'packages/three-surface-poc-core'), capture_output=True, text=True, timeout=120, env=dict(os.environ, TMPDIR=tmp))
    lines = open(log).read().splitlines()
    result['nodeResolution'] = {'exit': r.returncode, 'stdout': r.stdout.strip(), 'internetFamilyCalls': [re.sub(r'^\d+\s+', '', l) for l in lines if re.search(r'\bAF_INET6?\b', l)]}
finally:
    open(pkg, 'w').write(original)
    if os.path.exists(main_ts):
        os.remove(main_ts)
    shutil.rmtree(os.path.join(clone, 'packages/support/dist'), ignore_errors=True)
    rb = subprocess.run(['npx', 'tsc', '-b', 'packages/support'], cwd=clone, capture_output=True, text=True)
    result['restore'] = {'rebuildExit': rb.returncode, 'distFiles': sorted(os.listdir(os.path.join(clone, 'packages/support/dist'))),
                         'gitStatus': subprocess.run(['git', '-C', clone, 'status', '--porcelain'], capture_output=True, text=True).stdout}
json.dump(result, open(out_path, 'w'), indent=1)
print(json.dumps(result, indent=1))
