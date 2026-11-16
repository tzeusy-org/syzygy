#!/usr/bin/env python3
"""Reviewer's own rule-6 mutants for PR 545 (R-GP-IMPL-SUPPORT-LEAF-GUARDS-1), run in a clean scratch clone.

Usage: rev_mutants.py <clone with node_modules> <out.json> <tmpdir> <absent|present> [row-id-prefix ...]

Each row's edits are recorded verbatim: {path, old, new} replaces `old` (which must occur exactly once) by `new`; old None
creates the file; {path, link} creates a symbolic link; {path, replaceWithLink} saves the file and replaces it by a link.
A row is `killed` when vitest exits non-zero with a failed test or file, `survives` when it exits 0, `error` with no report.
The expectation is written before the run. Every edit is restored and `git status --porcelain` recorded after.
"""
import json
import os
import subprocess
import sys

PURITY = 'packages/support/src/support-purity.test.ts'
DRAFTER_TEST = 'packages/three-surface-poc-core/src/owner-act-drafter.test.ts'
NO_EGRESS = 'packages/polaris-dossier/src/no-egress.test.ts'
INDEX = 'packages/support/src/index.ts'
SHA = 'packages/support/src/sha256.ts'
DRAFTER = 'packages/three-surface-poc-core/src/owner-act-drafter.ts'
PKG = 'packages/support/package.json'
SITE = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts'
IMPORT = "import { createHash } from 'node:crypto';\n"
INDEX_LAST = "export { decodeUtf8 } from './decode-utf8.js';\n"
SITE_FIRST = "import { DESIGN_TOKENS_CSS } from '../design-tokens.js';\n"
EXPORTS = '"types": "./dist/index.d.ts",\n      "import": "./dist/index.js",\n      "default": "./dist/index.js"'
EGRESS_MAIN = "import { createSocket } from 'node:dgram';\nexport * from './index.js';\ncreateSocket('udp4').bind(0, '127.0.0.1').unref();\n"


def e(path, old, new):
    return {'path': path, 'old': old, 'new': new}


def after_import(text):
    return [e(SHA, IMPORT, IMPORT + text)]


def after_index(text):
    return [e(INDEX, INDEX_LAST, INDEX_LAST + text)]


# (id, test files, edits, expected, what it probes)
ROWS = [
    ('S0-purity-unmutated', [PURITY], [], 'pass', 'baseline'),
    ('Y1-reflect-get-globalThis-env', [PURITY], after_import("export const HOME = Reflect.get(globalThis, 'process').env.HOME;\n"),
     'killed', 'Reflect.get(globalThis, ...)'),
    ('Y2-eval-under-an-allowed-name', [PURITY], after_import('const value = eval;\nexport { value };\n'), 'killed', 'eval aliased to value'),
    ('Y3-R1-escalated-to-the-environment', [PURITY],
     after_import("export const value = Object['constructor']['constructor']('return globalThis')()['process']['env']['HOME'];\n"),
     'survives', 'R1 reaching process.env'),
    ('Y4-new-Function', [PURITY], after_import("export const value = new Function('return 1');\n"), 'killed', 'new Function'),
    ('Y5-computed-import-no-space', [PURITY], after_import('export const value = (bytes) => import(bytes);\n'), 'killed',
     'import(bytes), allowed names only'),
    ('Y5b-computed-import-newline', [PURITY], after_import('export const value = (bytes) => import\n(bytes);\n'), 'survives',
     'R2 with a newline'),
    ('Y5c-computed-import-comment', [PURITY], after_import('export const value = (bytes) => import/**/(bytes);\n'), 'survives',
     'R2 with a comment'),
    ('Y6-allowed-global-member-replaced', [PURITY], after_import('Object.freeze = (value) => value;\n'), 'survives',
     'a member of an allowed global replaced at import'),
    ('Y7-export-star-from-node-crypto', [PURITY], after_index("export * from 'node:crypto';\n"), 'survives',
     'export * re-exports randomBytes, randomUUID, setEngine'),
    ('Y8-export-star-from-node-fs', [PURITY], after_index("export * from 'node:fs';\n"), 'killed', 'export * of node:fs'),
    ('Y9-export-star-as-allowed-name', [PURITY], after_index("export * as value from 'node:crypto';\n"), 'survives',
     'namespace re-export under an allowed name'),
    ('Y10-string-named-re-export', [PURITY], after_index("export { 'randomBytes' as 'value' } from 'node:crypto';\n"), 'survives',
     'string-named re-export of randomBytes'),
    ('Y11-string-named-import-called-at-import', [PURITY],
     [e(SHA, IMPORT, "import { createHash, 'randomBytes' as value } from 'node:crypto';\nexport const T = value(8);\n")], 'survives',
     'RP8 with a string-named import'),
    ('Y12-namespace-import-re-exported', [PURITY], after_import("import * as value from 'node:crypto';\nexport { value };\n"),
     'survives', 'import * as value, then export { value }'),
    ('Y13-import-meta', [PURITY], after_import('export const value = import.meta.dirname;\n'), 'killed', 'import.meta.dirname'),
    ('Y14-drafter-takes-randomness-through-support', [PURITY, DRAFTER_TEST],
     after_index("export * from 'node:crypto';\n") + [
         e(DRAFTER, "import { sha256 } from '@syzygy/support';\n",
           "import { sha256, randomUUID } from '@syzygy/support';\nexport const nonce = (): string => randomUUID();\n")],
     'survives', 'Y7 plus the owner-act drafter calling randomUUID'),
    # N10
    ('N0-no-egress-unmutated', [NO_EGRESS], [], 'pass', 'baseline'),
    ('Z1-node-condition-ahead-of-import', [NO_EGRESS],
     [e(PKG, EXPORTS, '"types": "./dist/index.d.ts",\n      "node": "./dist/main.js",\n      "import": "./dist/index.js",\n      "default": "./dist/index.js"'),
      e('packages/support/src/main.ts', None, EGRESS_MAIN)], 'killed', 'a condition Node takes first that names another target'),
    ('Z2-dotdot-in-exports-target', [NO_EGRESS],
     [e(PKG, EXPORTS, EXPORTS.replace('./dist/index.js', './dist/../src/main.js')),
      e('packages/support/src/main.ts', None, EGRESS_MAIN)], 'killed', 'a .. segment in the target'),
    ('Z3-entry-is-a-symlink-out-of-src', [NO_EGRESS],
     [e('packages/support/lib/index.ts', None,
        "export { sha256 } from '../src/sha256.js';\nexport { deepFreeze } from '../src/deep-freeze.js';\nexport { decodeUtf8 } from '../src/decode-utf8.js';\n"),
      {'path': INDEX, 'replaceWithLink': '../lib/index.ts'}], 'killed', 'src/index.ts a symlink to lib/index.ts'),
    ('Z4-relative-import-into-dist', [NO_EGRESS], [e(SITE, SITE_FIRST, "import '../../../../packages/support/dist/index.js';\n" + SITE_FIRST)],
     'dist-dependent', 'a relative specifier, not @syzygy/*, that leaves src'),
    ('Z5-unexported-subpath', [NO_EGRESS], [e(SITE, SITE_FIRST, "import '@syzygy/support/package.json';\n" + SITE_FIRST)], 'killed',
     'a subpath the exports map does not name'),
    ('Z6-new-well-formed-package', [NO_EGRESS],
     [e('packages/extra/package.json', None,
        '{\n  "name": "@syzygy/extra",\n  "version": "0.0.0",\n  "private": true,\n  "type": "module",\n  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "default": "./dist/index.js" } }\n}\n'),
      e('packages/extra/src/index.ts', None, 'export const EXTRA = 1;\n'),
      {'path': 'node_modules/@syzygy/extra', 'link': '../../packages/extra'},
      e(SITE, SITE_FIRST, "import '@syzygy/extra';\n" + SITE_FIRST)], 'killed', 'only the oracle row should name a new entry'),
    # The shared list's rows pin each token's presence, not its pattern: a weakened token plus the drafter's DK1 clock read.
    ('K4-shared-Date-token-weakened-plus-DK1', [PURITY, DRAFTER_TEST],
     [e('packages/support/src/purity.testkit.ts', ' /\\bDate\\b/,', ' /\\bDate\\(/,'),
      e(DRAFTER, "import { sha256 } from '@syzygy/support';\n",
        "import { sha256 } from '@syzygy/support';\nexport const now = (): number => Date.now();\n")], 'survives',
     'a token narrowed in the shared list'),
    # At base only: the hand-written alias for @syzygy/support dropped (the lane's M4 at main).
    ('BM4-base-alias-for-support-dropped', [NO_EGRESS],
     [e(NO_EGRESS, "      '@syzygy/support': src('packages/support/src/index.ts'),\n", '')], 'dist-dependent', 'base only'),
    ('Z7-unscoped-workspace-with-no-entry', [NO_EGRESS],
     [e('packages/leak/package.json', None, '{\n  "name": "leak",\n  "version": "0.0.0",\n  "private": true,\n  "type": "module"\n}\n'),
      e('packages/leak/index.js', None, 'export const LEAK = 1;\n'),
      {'path': 'node_modules/leak', 'link': '../packages/leak'},
      e(SITE, SITE_FIRST, "import 'leak';\n" + SITE_FIRST)], 'survives', 'M2 under a name outside @syzygy/'),
]


def apply(clone, edits):
    undo = []
    try:
        for ed in edits:
            p = os.path.join(clone, ed['path'])
            if 'link' in ed:
                assert not os.path.lexists(p), ed['path']
                os.symlink(ed['link'], p)
                undo.append(('remove', p))
            elif 'replaceWithLink' in ed:
                text = open(p).read()
                os.remove(p)
                undo.append(('write', p, text))
                os.symlink(ed['replaceWithLink'], p)
                undo.append(('remove', p))
            elif ed['old'] is None:
                assert not os.path.lexists(p), ed['path']
                made, d = [], os.path.dirname(p)
                while not os.path.isdir(d):
                    made.append(d)
                    d = os.path.dirname(d)
                for m in reversed(made):
                    os.mkdir(m)
                    undo.append(('rmdir', m))
                open(p, 'w').write(ed['new'])
                undo.append(('remove', p))
            else:
                text = open(p).read()
                assert text.count(ed['old']) == 1, (ed['path'], text.count(ed['old']))
                undo.append(('write', p, text))
                open(p, 'w').write(text.replace(ed['old'], ed['new']))
    except BaseException:
        restore(undo)
        raise
    return undo


def restore(undo):
    for step in reversed(undo):
        if step[0] == 'write':
            open(step[1], 'w').write(step[2])
        elif step[0] == 'remove':
            os.remove(step[1])
        else:
            os.rmdir(step[1])


def run(clone, tests, tmpdir):
    out = os.path.join(tmpdir, 'vitest.json')
    if os.path.exists(out):
        os.remove(out)
    proc = subprocess.run(['npx', 'vitest', 'run', *tests, '--reporter=json', f'--outputFile={out}'], cwd=clone,
                          env=dict(os.environ, TMPDIR=tmpdir), capture_output=True, text=True, timeout=900)
    if not os.path.exists(out):
        return {'exit': proc.returncode, 'error': 'no json output', 'stderrTail': proc.stderr[-800:]}
    d = json.load(open(out))
    files = d['testResults']
    return {
        'exit': proc.returncode, 'passed': d['numPassedTests'], 'failed': d['numFailedTests'], 'pending': d['numPendingTests'],
        'total': d['numTotalTests'], 'failedFiles': [f['name'].replace(clone + '/', '') for f in files if f['status'] == 'failed'],
        'fileMessages': [f['message'][:600] for f in files if f.get('message')],
        'failedTests': [{'name': t['fullName'], 'message': (t.get('failureMessages') or [''])[0][:500]}
                        for f in files for t in f['assertionResults'] if t['status'] == 'failed'],
    }


def main():
    clone, out_path, tmpdir, dist, *only = sys.argv[1:]
    os.makedirs(tmpdir, exist_ok=True)
    git = lambda *args: subprocess.run(['git', '-C', clone, *args], capture_output=True, text=True, check=True).stdout
    assert git('status', '--porcelain') == '', 'the clone must start clean'
    present = sorted(f'{p}/{n}/dist' for p in ['apps', 'packages'] for n in os.listdir(os.path.join(clone, p))
                     if os.path.isdir(os.path.join(clone, p, n, 'dist')))
    assert (dist == 'absent' and present == []) or (dist == 'present' and len(present) == 12), (dist, present)
    rows = []
    for rid, tests, edits, expected, probe in ROWS:
        if only and not any(rid.startswith(prefix) for prefix in only):
            continue
        if expected == 'dist-dependent':
            expected = 'killed' if dist == 'absent' else 'survives'
        load = open('/proc/loadavg').read().split()[:3]
        undo = apply(clone, edits)
        try:
            res = run(clone, tests, tmpdir)
        finally:
            restore(undo)
        observed = 'error' if 'error' in res else ('survives' if res['exit'] == 0 else
                                                   ('killed' if res['failed'] > 0 or res['failedFiles'] else 'error'))
        if expected == 'pass' and observed == 'survives':
            observed = 'pass'
        rows.append({'id': rid, 'probe': probe, 'tests': tests, 'edits': edits, 'expected': expected, 'observed': observed,
                     'loadavg': load, **res})
        print(rid, 'expected', expected, 'observed', observed, res.get('passed'), res.get('failed'),
              [(t['name'], t['message'].split('\n')[0][:160]) for t in res.get('failedTests', [])],
              [m[:200] for m in res.get('fileMessages', [])], flush=True)
    status = git('status', '--porcelain')
    leftovers = [p for p in ['packages/leak', 'node_modules/leak', 'packages/extra', 'node_modules/@syzygy/extra', 'packages/support/lib', 'packages/support/src/main.ts']
                 if os.path.lexists(os.path.join(clone, p))]
    summary = {'rows': len(rows), 'asExpected': sum(r['observed'] == r['expected'] for r in rows),
               'unexpected': [r['id'] for r in rows if r['observed'] != r['expected']]}
    json.dump({'commit': git('rev-parse', 'HEAD').strip(), 'dist': dist, 'distDirs': present, 'summary': summary,
               'statusAfter': status, 'leftovers': leftovers, 'rows': rows}, open(out_path, 'w'), indent=1)
    print('summary', summary, 'status after', repr(status), 'leftovers', leftovers)


if __name__ == '__main__':
    main()
