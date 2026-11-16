#!/usr/bin/env python3
"""Reviewer's purity mutants for packages/support/src/support-purity.test.ts, and the same forms against the owner-act
drafter's own purity test (parity: what the drafter test held before the PR).

Usage: purity_mutants.py <clone with node_modules> <out.json> <tmpdir>

Each row: edits [{path, old (None = create), new}], the test file to run, and the expectation the reviewer wrote down
before running. A row is 'killed' when vitest exits non-zero with at least one failed test; a run with no counts is an error.
"""
import json
import os
import subprocess
import sys

PURITY = 'packages/support/src/support-purity.test.ts'
DRAFTER_TEST = 'packages/three-surface-poc-core/src/owner-act-drafter.test.ts'
DRAFTER = 'packages/three-surface-poc-core/src/owner-act-drafter.ts'
SHA = 'packages/support/src/sha256.ts'
IDX = 'packages/support/src/index.ts'
DF = 'packages/support/src/deep-freeze.ts'
HASH_IMPORT = "import { createHash } from 'node:crypto';\n"
IDX_LINE = "export { sha256 } from './sha256.js';\n"

ROWS = [
    ('C0-unmutated', PURITY, [], 'pass'),
    ('RP1-re-export-from-node-fs', PURITY, [(IDX, IDX_LINE, IDX_LINE + "export { readFileSync } from 'node:fs';\n")], 'killed'),
    ('RP2-globalThis-bracket-read-of-process-env', PURITY,
     [(SHA, HASH_IMPORT, HASH_IMPORT + "export const HOME = (globalThis as Record<string, any>)['process']['env']['HOME'];\n")], 'survives'),
    ('RP3-top-level-side-effect-console-write', PURITY, [(DF, "export function deepFreeze", "console.log('support loaded');\nexport function deepFreeze")], 'survives'),
    ('RP4-createRequire-of-node-fs', PURITY,
     [(SHA, HASH_IMPORT, HASH_IMPORT + "import { createRequire } from 'node:module';\nconst load = createRequire(import.meta.url);\nexport const fsModule = load('node:fs');\n")], 'killed'),
    ('RP5-network-through-an-unnamed-global-WebSocket', PURITY,
     [(SHA, HASH_IMPORT, HASH_IMPORT + "export const open = (url: string): WebSocket => new WebSocket(url);\n")], 'survives'),
    ('RP6-file-read-via-globalThis-process-getBuiltinModule', PURITY,
     [(SHA, HASH_IMPORT, HASH_IMPORT + "const p = (globalThis as Record<string, any>)['process'];\nexport const HOST: string = p.getBuiltinModule('node:f' + 's').readFileSync('/etc/hostname', 'utf8');\n")], 'survives'),
    ('RP7-clock-via-performance-now', PURITY, [(SHA, HASH_IMPORT, HASH_IMPORT + "export const started = performance.now();\n")], 'survives'),
    ('RP8-randomness-from-the-allowed-node-crypto', PURITY,
     [(SHA, HASH_IMPORT, "import { createHash, randomBytes } from 'node:crypto';\nexport const SALT = randomBytes(8).toString('hex');\n")], 'survives'),
    ('RP9-ts-import-equals-require', PURITY, [(SHA, HASH_IMPORT, HASH_IMPORT + "import fs = require('node:fs');\nexport const F = fs;\n")], 'killed'),
    ('RP10-subdirectory-module-re-exported', PURITY,
     [('packages/support/src/io/read.ts', None, "import { readFileSync } from 'node:fs';\nexport const read = (p: string): string => readFileSync(p, 'utf8');\n"),
      (IDX, IDX_LINE, IDX_LINE + "export * from './io/read.js';\n")], 'killed'),
    ('RP11-mts-module-re-exported', PURITY,
     [('packages/support/src/net.mts', None, "import 'node:http';\nexport const N = 1;\n"), (IDX, IDX_LINE, IDX_LINE + "export * from './net.mjs';\n")], 'killed'),
    ('RP12-computed-dynamic-import-with-a-space', PURITY,
     [(SHA, HASH_IMPORT, HASH_IMPORT + "export const lazy = (): Promise<unknown> => import (['node', 'ne' + 't'].join(':'));\n")], 'survives'),
    ('RP13-fetch-by-reference-not-call', PURITY,
     [(DF, "export function deepFreeze", "const send = globalThis.fetch;\nexport const ping = (u: string): Promise<Response> => send(u);\nexport function deepFreeze")], 'survives'),
    # Parity: the same surviving forms placed in the owner-act drafter, against its own purity test (the guard the
    # drafter had before the PR, identical reader and forbidden list).
    ('D0-drafter-unmutated', DRAFTER_TEST, [], 'pass'),
    ('D2-drafter-globalThis-bracket-read', DRAFTER_TEST, [(DRAFTER, None, None)], 'survives'),
    ('D5-drafter-WebSocket', DRAFTER_TEST, [(DRAFTER, None, None)], 'survives'),
]


def apply(clone, edits):
    undo = []
    for path, old, new in edits:
        p = os.path.join(clone, path)
        if old is None and new is not None:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            assert not os.path.exists(p)
            open(p, 'w').write(new)
            undo.append((p, None))
        else:
            text = open(p).read()
            assert text.count(old) == 1, (path, old)
            undo.append((p, text))
            open(p, 'w').write(text.replace(old, new))
    return undo


def restore(undo):
    for p, text in reversed(undo):
        if text is None:
            os.remove(p)
            d = os.path.dirname(p)
            if not os.listdir(d) and d.endswith('/io'):
                os.rmdir(d)
        else:
            open(p, 'w').write(text)


def run(clone, test, tmpdir):
    out = os.path.join(tmpdir, 'purity.json')
    if os.path.exists(out):
        os.remove(out)
    proc = subprocess.run(['npx', 'vitest', 'run', test, '--reporter=json', f'--outputFile={out}'], cwd=clone,
                          env=dict(os.environ, TMPDIR=tmpdir), capture_output=True, text=True, timeout=600)
    if not os.path.exists(out):
        return {'exit': proc.returncode, 'error': 'no json output', 'stderrTail': proc.stderr[-500:]}
    d = json.load(open(out))
    return {'exit': proc.returncode, 'passed': d['numPassedTests'], 'failed': d['numFailedTests'], 'total': d['numTotalTests'],
            'failedTests': [t['fullName'] for f in d['testResults'] for t in f['assertionResults'] if t['status'] == 'failed']}


def main():
    clone, out_path, tmpdir = sys.argv[1:4]
    os.makedirs(tmpdir, exist_ok=True)
    head = subprocess.run(['git', '-C', clone, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    drafter = open(os.path.join(clone, DRAFTER)).read()
    anchor = drafter.split('\n')[0] + '\n'  # the drafter's first line
    rows_out = []
    for rid, test, edits, expect in ROWS:
        if rid == 'D2-drafter-globalThis-bracket-read':
            edits = [(DRAFTER, anchor, anchor + "export const HOME = (globalThis as Record<string, any>)['process']['env']['HOME'];\n")]
        if rid == 'D5-drafter-WebSocket':
            edits = [(DRAFTER, anchor, anchor + "export const open = (url: string): WebSocket => new WebSocket(url);\n")]
        undo = apply(clone, edits)
        try:
            res = run(clone, test, tmpdir)
        finally:
            restore(undo)
        outcome = 'error' if 'error' in res else ('killed' if res['exit'] != 0 and res['failed'] > 0 else 'pass')
        observed = 'pass' if outcome == 'pass' and expect == 'pass' else ('survives' if outcome == 'pass' else outcome)
        row = {'id': rid, 'test': test, 'edits': [{'path': p, 'old': o, 'new': n} for p, o, n in edits], 'expected': expect,
               'observed': observed, **res}
        rows_out.append(row)
        print(rid, 'expected', expect, 'observed', observed, res.get('passed'), res.get('failed'), res.get('failedTests'), flush=True)
    status = subprocess.run(['git', '-C', clone, 'status', '--porcelain'], capture_output=True, text=True).stdout
    json.dump({'clone': head, 'statusAfter': status, 'rows': rows_out}, open(out_path, 'w'), indent=1)
    print('status after:', repr(status))


if __name__ == '__main__':
    main()
