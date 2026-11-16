#!/usr/bin/env python3
"""rev-529: do the lane's differential comparisons see the two shim mutants the tests miss?

Usage: diff_probe.py <rev529-dir>
 - R14 (a dropped type re-export in the credentials shim): applied to <mut> source, surface.mjs run on
   <mut>, compared with diff-out/surface-base.json by the differential's own surface() rule.
 - R13 (UNKNOWN_ROUTE_STATUS re-exported as HANDLER_FAILURE_STATUS in the server shim): applied to the
   built <clone>/packages/cap1-daemon/dist/server.js, host-diff.mjs run through the cap1-daemon barrel,
   compared with diff-out/host-base.json by the differential's own host() rule.
Each file is restored and `git status --porcelain` is checked empty afterwards.
"""
import json
import os
import shutil
import subprocess
import sys

R = sys.argv[1]
MUT, CLONE = f'{R}/mut', f'{R}/clone'
TOOLS = f'{CLONE}/docs/evidence/syzygy-bpyt-7-3/tools'
SCRATCH = '/tmp/r529-3/probe'
ENTRIES = ['packages/cap1-daemon/src/index.ts', 'packages/cap1-daemon/src/server.ts',
           'packages/cap1-daemon/src/credentials.ts', 'packages/cap1-daemon/src/routes-human.ts']


def surface(path):
    entries = json.load(open(path))['entries']
    return {e: sorted([r['name'], r['value'], r['type']] for r in entries[e]) for e in ENTRIES}


def host(path):
    record = json.load(open(path))
    return {k: v for k, v in record.items() if k not in ('module', 'exports')}


def mutate(path, old, new):
    text = open(path).read()
    assert text.count(old) == 1, (path, text.count(old))
    open(path, 'w').write(text.replace(old, new, 1))
    return text


def clean(tree):
    return subprocess.run(['git', '-C', tree, 'status', '--porcelain'], capture_output=True, text=True).stdout == ''


shutil.rmtree(SCRATCH, ignore_errors=True)
os.makedirs(SCRATCH)
out = {}

# Unmutated control for surface on mut (source-based, no dist needed).
subprocess.run(['node', f'{TOOLS}/surface.mjs', MUT, f'{SCRATCH}/s-ctl.json', *ENTRIES], check=True, capture_output=True)
out['surfaceControlEqual'] = surface(f'{SCRATCH}/s-ctl.json') == surface(f'{R}/diff-out/surface-base.json')

p = f'{MUT}/packages/cap1-daemon/src/credentials.ts'
orig = mutate(p, '  type StateWriteRefusalName,\n', '')
try:
    subprocess.run(['node', f'{TOOLS}/surface.mjs', MUT, f'{SCRATCH}/s-r14.json', *ENTRIES], check=True, capture_output=True)
finally:
    open(p, 'w').write(orig)
out['R14surfaceEqual'] = surface(f'{SCRATCH}/s-r14.json') == surface(f'{R}/diff-out/surface-base.json')
out['R14cleanAfter'] = clean(MUT)

# R13 against the built shim.
p = f'{CLONE}/packages/cap1-daemon/dist/server.js'
orig = mutate(p, 'UNKNOWN_ROUTE_REASON, UNKNOWN_ROUTE_STATUS, }', 'UNKNOWN_ROUTE_REASON, HANDLER_FAILURE_STATUS as UNKNOWN_ROUTE_STATUS, }')
try:
    subprocess.run(['node', f'{TOOLS}/host-diff.mjs', f'{CLONE}/packages/cap1-daemon/dist/index.js', f'{SCRATCH}/h', f'{SCRATCH}/h-r13.json'],
                   check=True, capture_output=True)
finally:
    open(p, 'w').write(orig)
a, b = host(f'{SCRATCH}/h-r13.json'), host(f'{R}/diff-out/host-base.json')
out['R13hostEqualThroughCap1Daemon'] = a == b
out['R13differingKeys'] = sorted(k for k in set(a) | set(b) if a.get(k) != b.get(k))
out['R13constants'] = {k: [a['credentials']['constants'][k], b['credentials']['constants'][k]] for k in a['credentials']['constants']
                       if a['credentials']['constants'][k] != b['credentials']['constants'][k]}
out['R13cleanAfter'] = clean(CLONE)
shutil.rmtree(SCRATCH, ignore_errors=True)
print(json.dumps(out, indent=1))
