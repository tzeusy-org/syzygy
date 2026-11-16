"""Round-2 reviewer mutants for PR 545 (syzygy-bpyt.6.14), and a sample of the lane's own rows, run in a clean clone.

Usage: [R1_DIR=<round-1 review dir>] python3 -I r2_mutants.py <clone with node_modules> <out.json> <tmpdir> <absent|present> <mine|lane|all|extra>

Borrows apply/restore/run/dist_dirs from the lane's committed tools/mutants.py (loaded by path from the clone), so an edit is
applied and undone exactly as the lane's are. `lane` rows are read by id from the lane's own ROWS table, with its expectation,
and also checked against summary.py's KILLED_BY failing set where it names one. Every row of mine states, before the run, its
expected outcome and the exact set of failing test titles (None when it is expected to survive). A row is `killed` only when
vitest exits non-zero with a failed test or file; `survives` when it exits 0.
"""
import importlib.util
import json
import os
import subprocess
import sys

clone, out_path, tmpdir, dist, which = sys.argv[1:6]
spec = importlib.util.spec_from_file_location('lane_mutants', os.path.join(clone, 'docs/evidence/syzygy-bpyt-6-14/tools/mutants.py'))
lane = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lane)

PURITY, DRAFTER_TEST, NO_EGRESS, TESTKIT = lane.PURITY, lane.DRAFTER_TEST, lane.NO_EGRESS, lane.TESTKIT
INDEX = 'packages/support/src/index.ts'
SHA = 'packages/support/src/sha256.ts'
INDEX_LAST = "export { decodeUtf8 } from './decode-utf8.js';\n"
SHA_LAST = "  return createHash('sha256').update(value).digest('hex');\n}\n"
S10 = 'the S10 bundle takes each workspace package from the source its entry names (syzygy-bpyt.6.14)'
F1_ROW = '@syzygy/support stays a pure leaf takes only createHash from node:crypto, by its own name, and re-exports nothing from it'
N1_ROW = '@syzygy/support stays a pure leaf lists a module at any depth and with any extension, and skips only the tests and the testkit'
N2_ROW = 'the forbidden-token list both guards stand on is the literal list, so a narrowed token fails here'
N3_ROW = '@syzygy/support stays a pure leaf assigns to no property in any source, so no allowed global is rewritten'
N4_ROW = f'{S10} bundles the driver only under the guard: an alias that leaves the sources fails it'
SELF_ROW = f'{S10} fails the bundle when an @syzygy specifier resolves outside them'
FILTER = "/\\.[cm]?[jt]sx?$/u.test(name)"


def e(path, old, new):
    return {'path': path, 'old': old, 'new': new}


def add_index(text):
    return e(INDEX, INDEX_LAST, INDEX_LAST + text)


def add_sha(text):
    return e(SHA, SHA_LAST, SHA_LAST + text)


TSX = e('packages/support/src/value.tsx', None, "export * from 'node:crypto';\n")

# (id, tests, edits, expected, expected failing titles or None)
MINE = [
    ('V0-unmutated', [PURITY, NO_EGRESS], [], 'pass', None),
    # Module-binding forms round 1 did not name.
    ('V1-side-effect-import-of-node-crypto', [PURITY], [add_index("import 'node:crypto';\n")], 'killed', [F1_ROW]),
    ('V2-default-import-under-an-allowed-name-re-exported', [PURITY], [add_index("import value from 'node:crypto';\nexport { value };\n")], 'killed', [F1_ROW]),
    ('V3-export-star-with-a-string-keyed-import-attribute', [PURITY], [add_index("export * from 'node:crypto' with { 'type': 'json' };\n")], 'killed', [F1_ROW]),
    ('V4-type-only-import', [PURITY], [add_index("import type { value } from 'node:crypto';\n")], 'killed', [F1_ROW]),
    ('V5-type-only-export-star', [PURITY], [add_index("export type * from 'node:crypto';\n")], 'killed', [F1_ROW]),
    ('V6-export-star-inside-a-nested-declare-module-block', [PURITY], [add_index("declare module './sha256.js' {\n  export * from 'node:crypto';\n}\n")], 'survives', None),
    ('V7-import-equals-require-with-a-space', [PURITY], [add_index("import value = require ('node:crypto');\nexport { value };\n")], 'survives', None),
    ('V8-local-re-export-of-createHash', [PURITY], [add_sha('export { createHash };\n'),
                                                     e(INDEX, "export { sha256 } from './sha256.js';\n", "export { sha256, createHash } from './sha256.js';\n")], 'survives', None),
    ('V9-literal-dynamic-import-of-node-crypto-with-a-space', [PURITY], [add_index("export const value = () => import ('node:crypto');\n")], 'survives', None),
    ('V10-named-re-export-under-an-allowed-name', [PURITY], [add_index("export { createHash as value } from 'node:crypto';\n")], 'killed', [F1_ROW]),
    ('V11-export-star-in-a-nested-mts-module', [PURITY], [e('packages/support/src/io/value.mts', None, "export * from 'node:crypto';\n")], 'killed', [F1_ROW]),
    ('V12-export-star-in-a-tsx-module-re-exported', [PURITY], [TSX, add_index("export * from './value.js';\n")], 'killed', [F1_ROW]),
    # The reader under F1's row: no reader row pins it, so narrowing it passes on the clean tree, and Y7 then passes too.
    ('Q1-module-declaration-reader-reads-imports-only', [PURITY],
     [e(PURITY, '(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && ', 'ts.isImportDeclaration(statement) && ')], 'survives', None),
    ('Q1Y7-reader-narrowed-plus-export-star', [PURITY],
     [e(PURITY, '(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && ', 'ts.isImportDeclaration(statement) && '),
      add_index("export * from 'node:crypto';\n")], 'survives', None),
    # N1's fixture row against a non-recursive scan and narrowed or broadened filters.
    ('W1-scan-without-recursion-alone', [PURITY], [e(PURITY, "readdirSync(dir, { recursive: true, encoding: 'utf8' })", "readdirSync(dir, { encoding: 'utf8' })")], 'killed', [N1_ROW]),
    ('W2-filter-narrowed-to-ts', [PURITY], [e(PURITY, FILTER, "/\\.ts$/u.test(name)")], 'killed', [N1_ROW]),
    ('W3-filter-drops-m-and-c', [PURITY], [e(PURITY, FILTER, "/\\.[jt]sx?$/u.test(name)")], 'killed', [N1_ROW]),
    ('W4-filter-drops-js', [PURITY], [e(PURITY, FILTER, "/\\.[cm]?tsx?$/u.test(name)")], 'killed', [N1_ROW]),
    ('W5-filter-drops-the-x-forms', [PURITY], [e(PURITY, FILTER, "/\\.[cm]?[jt]s$/u.test(name)")], 'survives', None),
    ('W5V12-x-forms-dropped-plus-a-tsx-export-star', [PURITY], [e(PURITY, FILTER, "/\\.[cm]?[jt]s$/u.test(name)"), TSX,
                                                               add_index("export * from './value.js';\n")], 'survives', None),
    ('W6-test-exclusion-broadened-to-any-test-substring', [PURITY], [e(PURITY, "!name.endsWith('.test.ts')", "!name.includes('test')")], 'survives', None),
    ('W7-testkit-exclusion-broadened-to-any-depth', [PURITY], [e(PURITY, "name !== 'purity.testkit.ts'", "!name.endsWith('purity.testkit.ts')")], 'survives', None),
    # N2's literal row against one narrowed token.
    ('K5-process-token-narrowed-to-process-env', [PURITY], [e(TESTKIT, '/\\bprocess\\./', '/\\bprocess\\.env/')], 'killed', [N2_ROW]),
    ('K6-os-dropped-from-the-module-token', [PURITY], [e(TESTKIT, '|child_process|os)', '|child_process)')], 'killed', [N2_ROW]),
    # N3's write row against a compound assignment, a logical assignment and an element write; then forms it does not see.
    ('U1-logical-and-assignment', [PURITY], [add_sha('Object.freeze &&= (value) => value;\n')], 'killed', [N3_ROW]),
    ('U2-compound-plus-assignment', [PURITY], [add_sha("Object.values += '';\n")], 'killed', [N3_ROW]),
    ('U3-element-write', [PURITY], [add_sha("Object['freeze'] = (value) => value;\n")], 'killed', [N3_ROW]),
    ('U4-array-destructuring-write', [PURITY], [add_sha('[Object.freeze] = [(value) => value];\n')], 'survives', None),
    ('U5-object-destructuring-write', [PURITY], [add_sha('({ value: Object.freeze } = { value: (bytes) => bytes });\n')], 'survives', None),
    ('Q2-write-reader-drops-element-access-plus-U3', [PURITY],
     [e(PURITY, '(ts.isPropertyAccessExpression(node.left) || ts.isElementAccessExpression(node.left)))', '(ts.isPropertyAccessExpression(node.left)))'),
      add_sha("Object['freeze'] = (value) => value;\n")], 'survives', None),
    # N4's row against a bundleDriver that ignores its aliases, and a guard whose path test is dropped.
    ('G1-bundleDriver-ignores-its-aliases', [NO_EGRESS], [e(NO_EGRESS, '    alias: aliases,\n', '    alias: workspaceAliases(),\n')], 'killed', [N4_ROW]),
    ('G2-guard-checks-only-external', [NO_EGRESS],
     [e(NO_EGRESS, "if (resolved.external || !/^(?:packages|apps)\\/[^/]+\\/src\\//u.test(relative)) {", 'if (resolved.external) {')], 'killed', [N4_ROW, SELF_ROW]),
]

TOKEN_ROW = '@syzygy/support stays a pure leaf names none of the forbidden tokens it shares with the owner-act drafter in any source'
# `extra`: round 1's Y1 and Y8 (must still be killed) and Y3, Y5b, Y5c (disclosed as surviving), read by id from that review's
# rev-mutants-head-present.json in the directory R1_DIR names; and V7 and V9 without their space, which the token row must kill.
R1_DIR = os.environ.get('R1_DIR', '')
R1_ROWS = [('Y1-reflect-get-globalThis-env', 'killed'), ('Y8-export-star-from-node-fs', 'killed'), ('Y3-R1-escalated-to-the-environment', 'survives'),
           ('Y5b-computed-import-newline', 'survives'), ('Y5c-computed-import-comment', 'survives')]
EXTRA = [
    ('V7n-import-equals-require-without-the-space', [PURITY], [add_index("import value = require('node:crypto');\nexport { value };\n")], 'killed', [TOKEN_ROW]),
    ('V9n-literal-dynamic-import-without-the-space', [PURITY], [add_index("export const value = () => import('node:crypto');\n")], 'killed', [TOKEN_ROW]),
]

LANE_SAMPLE = ['C0', 'Y7', 'Y9', 'Y10', 'Y11', 'Y12', 'Y14', 'K4', 'Y6', 'T1', 'M5', 'G0', 'L1', 'RP8', 'M2']


def failing_set(res):
    return sorted({t['name'] for t in res.get('failedTests', [])} | {f"file: {m.splitlines()[0][:160]}" for m in res.get('fileMessages', [])})


def main():
    os.makedirs(tmpdir, exist_ok=True)
    git = lambda *args: subprocess.run(['git', '-C', clone, *args], capture_output=True, text=True, check=True).stdout
    assert git('status', '--porcelain') == '', 'the clone must start clean'
    present = lane.dist_dirs(clone)
    assert (dist == 'absent' and present == []) or (dist == 'present' and len(present) == 12), (dist, present)
    rows = []
    plan = []
    if which in ('lane', 'all'):
        fragments, _ = lane.reviewer_fragments(clone)
        fragments_r1, _ = lane.reviewer_r1_fragments(clone)
        killed_by = {}
        src = open(os.path.join(clone, 'docs/evidence/syzygy-bpyt-6-14/tools/summary.py')).read()
        ns = {}
        start = src.index('S10 = ')
        stop = src.index('RESIDUALS = ')
        exec(src[start:stop], ns)
        killed_by = ns['KILLED_BY']
        for rid, test, head_edits, _base, head_expect, _bexp in lane.ROWS:
            prefix = rid.split('-')[0]
            if prefix not in LANE_SAMPLE or head_edits is None:
                continue
            edits = head_edits
            if edits == 'reviewer':
                edits = fragments[rid]
            elif edits == 'reviewer-r1':
                edits = fragments_r1[rid]
            elif isinstance(edits, str):
                raise SystemExit(f'drafter-string row {rid} not in sample')
            expected = head_expect
            if expected == 'dist-dependent':
                expected = 'killed' if dist == 'absent' else 'survives'
            tests = [test] if isinstance(test, str) else test
            plan.append(('lane:' + rid, tests, edits, expected, killed_by.get(prefix, 'any')))
    if which in ('mine', 'all'):
        plan.extend(MINE)
    if which == 'extra':
        r1 = {row['id']: row for row in json.load(open(os.path.join(R1_DIR, 'rev-mutants-head-present.json')))['rows']}
        for rid, expected in R1_ROWS:
            plan.append(('r1:' + rid, [PURITY], r1[rid]['edits'], expected, 'any' if expected == 'killed' else None))
        plan.extend(EXTRA)
    for rid, tests, edits, expected, want_failing in plan:
        load_before = open('/proc/loadavg').read().split()[0]
        undo = lane.apply(clone, edits)
        try:
            res = lane.run(clone, tests, tmpdir)
        finally:
            lane.restore(undo)
        observed = 'error' if 'error' in res else ('survives' if res['exit'] == 0 else
                                                   ('killed' if res['failed'] > 0 or res['failedFiles'] else 'error'))
        if expected == 'pass' and observed == 'survives':
            observed = 'pass'
        failing = failing_set(res)
        failing_ok = True if want_failing == 'any' else (want_failing is None and failing == []) or (want_failing is not None and failing == sorted(want_failing))
        rows.append({'id': rid, 'tests': tests, 'edits': edits, 'expected': expected, 'observed': observed,
                     'expectedFailing': want_failing, 'failing': failing, 'failingAsExpected': failing_ok,
                     'load1Before': load_before, 'load1After': open('/proc/loadavg').read().split()[0], **res})
        print(rid, 'expected', expected, 'observed', observed, 'failingOk', failing_ok, res.get('passed'), res.get('failed'),
              [t['message'][:160] for t in res.get('failedTests', [])], flush=True)
    status = git('status', '--porcelain')
    leftovers = [p for p in ['packages/leak', 'node_modules/@syzygy/leak', 'packages/support/lib', 'packages/support/src/io',
                             'packages/support/src/value.tsx'] if os.path.lexists(os.path.join(clone, p))]
    summary = {'rows': len(rows), 'asExpected': sum(r['observed'] == r['expected'] and r['failingAsExpected'] for r in rows),
               'unexpected': [r['id'] for r in rows if r['observed'] != r['expected'] or not r['failingAsExpected']]}
    json.dump({'commit': git('rev-parse', 'HEAD').strip(), 'dist': dist, 'distDirs': present, 'which': which,
               'summary': summary, 'statusAfter': status, 'leftovers': leftovers, 'rows': rows}, open(out_path, 'w'), indent=1)
    print('summary', summary, 'status after', repr(status), 'leftovers', leftovers)


if __name__ == '__main__':
    main()
