#!/usr/bin/env python3
"""AGENTS.md at 2f249d2c says a top-level `resolve.conditions` never reaches the test runner. Probe it once: with
packages/support/dist/index.js replaced by a module that throws, run one test file importing @syzygy/support under (a) the
config with its `ssr.resolve.conditions` moved to a top-level `resolve.conditions`, and (b) the unmutated config. If (a) loads the
dist, the test file fails on the planted error. Run from a built checkout with TMPDIR private; restores every byte.
"""
import json, os, subprocess, tempfile

CONFIG = 'vitest.config.ts'
OLD = "  ssr: { resolve: { conditions: ['source', 'module', 'node', 'development|production'] } },\n"
NEW = "  resolve: { conditions: ['source', 'module', 'node', 'development|production'] },\n"
OA = 'packages/three-surface-poc-core/src/owner-act-drafter.test.ts'


def vitest(files):
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, 'report.json')
        done = subprocess.run(['npx', 'vitest', 'run', *files, '--reporter=json', f'--outputFile={report}'], capture_output=True, text=True)
        data = json.load(open(report)) if os.path.exists(report) else {}
    messages = [(f.get('message') or '')[:200] for f in data.get('testResults', []) if f.get('status') == 'failed']
    return {'exit': done.returncode, 'passed': data.get('numPassedTests'), 'total': data.get('numTotalTests'), 'suiteMessages': messages}


config = open(CONFIG).read()
dist = 'packages/support/dist/index.js'
dist_bytes = open(dist, 'rb').read()
assert config.count(OLD) == 1
out = {'old': OLD, 'new': NEW, 'loadavg': open('/proc/loadavg').read().split()[:3]}
try:
    open(dist, 'w').write("throw new Error('R549-POISONED-DIST support');\n")
    open(CONFIG, 'w').write(config.replace(OLD, NEW))
    out['topLevelConditions'] = vitest([OA])
    open(CONFIG, 'w').write(config)
    out['ssrConditions'] = vitest([OA])
finally:
    open(CONFIG, 'w').write(config)
    open(dist, 'wb').write(dist_bytes)
out['worktreeClean'] = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True).stdout == ''
print(json.dumps(out, indent=1))
