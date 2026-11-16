#!/usr/bin/env python3
"""Rule-6 mutants for packages/support/src/support-purity.test.ts (review R-GP-IMPL-SUPPORT-LEAF-1, N3).

Usage: support-purity-mutants.py <clone with node_modules> <out.json>

For each mutant: apply the stored `old` -> `new` fragment (or create the file), run only the purity test, restore. A mutant is
killed when the run exits non-zero with at least one failed test. A run that reports no test counts is an error, never a kill.
The record stores every fragment and the commit of the clone, so each row can be re-run by hand.

  P*  mutate the package, expect the purity test to fail   (R8 in the review is P1; R6 is P2)
  T*  mutate the test's own specifier reader on an unchanged package, expect its reader cases to fail
  C0  control: the unmutated clone passes
  N0  negative control: two harmless additions (a constant, a relative import of the package's own module) must pass
"""
import json
import os
import subprocess
import sys

TEST = 'packages/support/src/support-purity.test.ts'
HASH_IMPORT = "import { createHash } from 'node:crypto';\n"

PACKAGE_MUTANTS = [
    ('P1-reads-a-file-via-node-fs', 'packages/support/src/sha256.ts', HASH_IMPORT, HASH_IMPORT + "import { readFileSync } from 'node:fs';\nexport const HOST = readFileSync('/etc/hostname', 'utf8');\n"),
    ('P2-imports-node-http', 'packages/support/src/sha256.ts', HASH_IMPORT, HASH_IMPORT + "import 'node:http';\n"),
    ('P3-imports-a-workspace-package', 'packages/support/src/index.ts', "export { sha256 } from './sha256.js';\n", "import '@syzygy/cap1-core';\nexport { sha256 } from './sha256.js';\n"),
    ('P4-reads-the-environment-without-an-import', 'packages/support/src/sha256.ts', HASH_IMPORT, HASH_IMPORT + "export const HOME = process.env['HOME'];\n"),
    ('P5-calls-fetch', 'packages/support/src/deep-freeze.ts', "export function deepFreeze<T>(value: T): T {\n", "void fetch('http://127.0.0.1');\nexport function deepFreeze<T>(value: T): T {\n"),
    ('P6-new-file-reads-the-clock', 'packages/support/src/clock.ts', None, "export const now = (): number => Date.now();\n"),
    ('P7-dynamic-import-of-node-fs', 'packages/support/src/sha256.ts', HASH_IMPORT, HASH_IMPORT + "export const lazy = (): Promise<unknown> => import('node:fs');\n"),
    ('P8-declares-a-workspace-dependency', 'packages/support/package.json', '  "version": "0.0.0",\n', '  "version": "0.0.0",\n  "dependencies": { "@syzygy/cap1-core": "*" },\n'),
    ('P9-references-another-project', 'packages/support/tsconfig.json', '  "include": ["src"]\n', '  "include": ["src"],\n  "references": [{ "path": "../cap1-core" }]\n'),
    ('P10-imports-an-other-built-in-the-forbidden-list-does-not-name', 'packages/support/src/sha256.ts', HASH_IMPORT, HASH_IMPORT + "import { Buffer } from 'node:buffer';\nexport const B = Buffer;\n"),
]
READER_MUTANTS = [
    ('T1-reader-drops-dynamic-import-and-require', TEST,
     "    ...[...code.matchAll(/\\b(?:import|require)\\s*\\(\\s*['\"`]([^'\"`]+)['\"`]/g)].map((match) => match[1]!),\n", ''),
    ('T2-reader-keeps-comment-lines', TEST, ".filter((line) => !line.trimStart().startsWith('//'))", '.filter(() => true)'),
    ('T3-reader-drops-side-effect-imports', TEST,
     "    ...[...code.matchAll(/^\\s*import\\s*['\"`]([^'\"`]+)['\"`]/gm)].map((match) => match[1]!),\n", ''),
    ('T4-reader-drops-from-imports', TEST,
     "    ...[...code.matchAll(/\\b(?:import|export)\\b[^;]*?\\bfrom\\s*['\"`]([^'\"`]+)['\"`]/g)].map((match) => match[1]!),\n", ''),
]
NEGATIVE = [
    ('N0a-a-harmless-constant', 'packages/support/src/one.ts', None, 'export const ONE = 1;\n'),
    ('N0b-a-relative-import-of-its-own-module', 'packages/support/src/empty-hash.ts', None, "import { sha256 } from './sha256.js';\nexport const EMPTY = sha256('');\n"),
]


def run_test(clone, tmpdir):
    out = os.path.join(tmpdir, 'vitest-purity.json')
    if os.path.exists(out):
        os.remove(out)
    proc = subprocess.run(['npx', 'vitest', 'run', TEST, '--reporter=json', f'--outputFile={out}'], cwd=clone, env=dict(os.environ, TMPDIR=tmpdir), capture_output=True, text=True, timeout=300)
    if not os.path.exists(out):
        raise SystemExit('no json reporter output: ' + proc.stderr[-400:])
    data = json.load(open(out))
    if data['numTotalTests'] == 0:
        raise SystemExit('the run reported no tests')
    failed = [t['fullName'] for f in data['testResults'] for t in f['assertionResults'] if t['status'] == 'failed']
    return {'exit': proc.returncode, 'passed': data['numPassedTests'], 'failed': data['numFailedTests'], 'total': data['numTotalTests'], 'failedTests': failed[:4]}


def apply(clone, path, old, new):
    full = os.path.join(clone, path)
    if old is None:
        if os.path.exists(full):
            raise SystemExit('create target exists: ' + path)
        open(full, 'w').write(new)
        return lambda: os.remove(full)
    text = open(full).read()
    if text.count(old) != 1:
        raise SystemExit(f'{path}: old fragment occurs {text.count(old)} times, not once')
    open(full, 'w').write(text.replace(old, new))
    return lambda: open(full, 'w').write(text)


def main():
    clone, out_path = sys.argv[1], sys.argv[2]
    tmpdir = '/tmp/lc63m'
    os.makedirs(tmpdir, exist_ok=True)
    commit = subprocess.run(['git', '-C', clone, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    if subprocess.run(['git', '-C', clone, 'status', '--porcelain', '--untracked-files=no'], capture_output=True, text=True, check=True).stdout.strip():
        raise SystemExit('clone has tracked changes')
    rows = []
    control = run_test(clone, tmpdir)
    rows.append({'id': 'C0-unmutated', 'expect': 'pass', **control, 'ok': control['exit'] == 0})
    for group, expect in ((PACKAGE_MUTANTS, 'killed'), (READER_MUTANTS, 'killed'), (NEGATIVE, 'pass')):
        for mid, path, old, new in group:
            restore = apply(clone, path, old, new)
            try:
                result = run_test(clone, tmpdir)
            finally:
                restore()
            ok = (result['exit'] != 0 and result['failed'] > 0) if expect == 'killed' else result['exit'] == 0
            rows.append({'id': mid, 'path': path, 'create': old is None, 'old': old, 'new': new, 'expect': expect, **result, 'ok': ok})
    status = subprocess.run(['git', '-C', clone, 'status', '--porcelain'], capture_output=True, text=True, check=True).stdout.strip()
    record = {
        'clone': {'commit': commit, 'trackedAndUntrackedChangesAfter': status},
        'test': TEST,
        'summary': {'rows': len(rows), 'killed': sum(1 for r in rows if r['expect'] == 'killed' and r['ok']), 'mutants': sum(1 for r in rows if r['expect'] == 'killed'),
                    'controlsPassing': sum(1 for r in rows if r['expect'] == 'pass' and r['ok']), 'controls': sum(1 for r in rows if r['expect'] == 'pass'), 'rowsNotOk': [r['id'] for r in rows if not r['ok']]},
        'rows': rows,
    }
    json.dump(record, open(out_path, 'w'), indent=1)
    for r in rows:
        print(('ok  ' if r['ok'] else 'BAD ') + r['id'], r['exit'], f"{r['failed']} failed of {r['total']}", r['failedTests'][:1])
    print(record['summary'])
    sys.exit(0 if not record['summary']['rowsNotOk'] else 1)


if __name__ == '__main__':
    main()
