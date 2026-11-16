#!/usr/bin/env python3
"""Does mutant Y7 (+ Y14's drafter edit) build with tsc, and do the built modules expose and call node:crypto randomness?

Usage: y7_build_probe.py <clone with node_modules and every dist/ built> <tmpdir>
Applies the edits, runs `tsc -b` on the two packages, imports the built entries with Node, restores the sources with
`git checkout`, rebuilds, and records `git status --porcelain` after (expected empty).
"""
import json
import os
import subprocess
import sys

clone, tmpdir = sys.argv[1:3]
INDEX = 'packages/support/src/index.ts'
DRAFTER = 'packages/three-surface-poc-core/src/owner-act-drafter.ts'
env = dict(os.environ, TMPDIR=tmpdir)


def sh(*args):
    p = subprocess.run(list(args), cwd=clone, capture_output=True, text=True, env=env)
    return {'argv': ' '.join(args), 'exit': p.returncode, 'out': (p.stdout + p.stderr)[-1200:]}


assert sh('git', 'status', '--porcelain')['out'] == ''
index = open(os.path.join(clone, INDEX)).read()
drafter = open(os.path.join(clone, DRAFTER)).read()
assert index.count("export { decodeUtf8 } from './decode-utf8.js';\n") == 1
assert drafter.count("import { sha256 } from '@syzygy/support';\n") == 1
open(os.path.join(clone, INDEX), 'w').write(index + "export * from 'node:crypto';\n")
open(os.path.join(clone, DRAFTER), 'w').write(drafter.replace(
    "import { sha256 } from '@syzygy/support';\n",
    "import { sha256, randomUUID } from '@syzygy/support';\nexport const nonce = (): string => randomUUID();\n"))
steps = []
try:
    steps.append(sh('npx', 'tsc', '-b', 'packages/support', 'packages/three-surface-poc-core'))
    steps.append(sh('node', '--input-type=module', '-e',
                    "const s = await import('./packages/support/dist/index.js'); const d = await import('./packages/three-surface-poc-core/dist/owner-act-drafter.js');"
                    " console.log(JSON.stringify({ randomBytes: typeof s.randomBytes, randomUUID: typeof s.randomUUID, setEngine: typeof s.setEngine,"
                    " nonceLooksRandom: /^[0-9a-f-]{36}$/.test(d.nonce()), twoNoncesDiffer: d.nonce() !== d.nonce() }));"))
finally:
    steps.append(sh('git', 'checkout', '--', INDEX, DRAFTER))
    steps.append(sh('npx', 'tsc', '-b', 'packages/support', 'packages/three-surface-poc-core'))
    steps.append(sh('git', 'status', '--porcelain'))
print(json.dumps(steps, indent=1))
