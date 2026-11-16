#!/usr/bin/env python3
"""Mutant X2b (R-GP-IMPL-SOURCE-RESOLUTION-1): X2 with the plugin's name double-quoted, so the suite scan's project count does not
see it. Run from a checkout at 2f249d2c with every dist built, TMPDIR private: x2b_probe.py > record.json
1. With the mutant applied and the real dists in place: the suite scan, a test importing @syzygy/support, the resolver tests.
2. Effectiveness: the same config with packages/support/dist/index.js replaced by a module that throws, and the one test that
   imports @syzygy/support; then the unmutated config over the same poisoned dist. Every byte is restored afterwards.
"""
import json, os, subprocess, sys, tempfile
CONFIG = 'vitest.config.ts'
OLD = 'export default defineConfig({\n'
NEW = ("export default defineConfig({\n  plugins: [{ name: \"r549-dist\", enforce: 'pre', resolveId(id: string) { return id === '@syzygy/support' "
       "? fileURLToPath(new URL('./packages/support/dist/index.js', import.meta.url)) : null; } }],\n")
SG = 'apps/three-surface-poc/src/sync-child-process-guard.test.ts'
OA = 'packages/three-surface-poc-core/src/owner-act-drafter.test.ts'
PG = 'packages/polaris-generation-core/src/workspace-reach.test.ts'
def vitest(files):
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, 'report.json')
        done = subprocess.run(['npx', 'vitest', 'run', *files, '--reporter=json', f'--outputFile={report}'], capture_output=True, text=True)
        data = json.load(open(report)) if os.path.exists(report) else {}
    failing = []
    for f in data.get('testResults', []):
        for a in f.get('assertionResults', []):
            if a.get('status') == 'failed':
                failing.append({'test': a['fullName'], 'message': (a.get('failureMessages') or [''])[0][:300]})
        if f.get('status') == 'failed' and not any(a.get('status') == 'failed' for a in f.get('assertionResults', [])):
            failing.append({'suite': os.path.relpath(f['name']), 'message': (f.get('message') or '')[:300]})
    return {'exit': done.returncode, 'failed': data.get('numFailedTests'), 'passed': data.get('numPassedTests'),
            'failedSuites': data.get('numFailedTestSuites'), 'total': data.get('numTotalTests'), 'failing': failing}



config = open(CONFIG).read()
dist = 'packages/support/dist/index.js'
dist_bytes = open(dist, 'rb').read()
assert config.count(OLD) == 1
out = {'old': OLD, 'new': NEW, 'loadavg': open('/proc/loadavg').read().split()[:3]}
try:
    open(CONFIG, 'w').write(config.replace(OLD, NEW))
    out['mutantDistsReal'] = vitest([SG, OA, PG])
    open(dist, 'w').write("throw new Error('R549-POISONED-DIST support');\n")
    out['mutantDistPoisoned'] = vitest([OA])
    open(CONFIG, 'w').write(config)
    out['unmutatedDistPoisoned'] = vitest([OA])
finally:
    open(CONFIG, 'w').write(config)
    open(dist, 'wb').write(dist_bytes)
out['worktreeClean'] = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True).stdout == ''
print(json.dumps(out, indent=1))
