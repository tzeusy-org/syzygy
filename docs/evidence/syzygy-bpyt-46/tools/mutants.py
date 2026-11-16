#!/usr/bin/env python3
"""Rule-6 mutants for syzygy-bpyt.46 (the PR 545 follow-ups: items 1, 3 and 5, and the round-2 review's N2-N4), run in a clean clone.

Round 1 of review R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-1 added F2's object-entry row and N1's reader rows (the reviewer's fix files,
byte for byte); the E5, W and I rows below pin each of their predicates, and E4 takes N2's uniform edit. Main a15b6a04 (PR 549)
removed the root vitest.config.ts alias map, so item 3's root-alias test and its A rows are gone; E4 now runs against the S10 file.

Usage: mutants.py <clone with node_modules> <out.json> <tmpdir> <absent|present>

The edit, run and restore steps are syzygy-bpyt.6.14's (docs/evidence/syzygy-bpyt-6-14/tools/mutants.py, imported from the clone),
so every row records its edits verbatim as {path, old, new} and the clone's `git status --porcelain` is recorded after (expected
empty). Reviewer fragments are read from committed records by id, never retyped:
  - the PR 530 round-2 review's D2 and D5, from its records (6.14's reviewer_fragments);
  - the PR 545 round-2 review's FN rows, from docs/evidence/support-leaf-guards-review-2026-10-28/r2/fix-check-r2.json;
  - 6.14's residual rows R1, R2, Y3 and Z7, from docs/evidence/syzygy-bpyt-6-14/residuals-head.json.
Each row names, before the run, the exact set of failing test names (vitest full names) it must give: [] for a row that must pass.
"""
import hashlib
import importlib.util
import json
import os
import subprocess
import sys

PURITY = 'packages/support/src/support-purity.test.ts'
TESTKIT = 'packages/support/src/purity.testkit.ts'
DRAFTER_TEST = 'packages/three-surface-poc-core/src/owner-act-drafter.test.ts'
DRAFTER = 'packages/three-surface-poc-core/src/owner-act-drafter.ts'
REACH_TEST = 'packages/polaris-generation-core/src/workspace-reach.test.ts'
REACH_KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
NO_EGRESS = 'packages/polaris-dossier/src/no-egress.test.ts'
DOSSIER_PKG = 'packages/polaris-dossier/package.json'
LANE_614 = 'docs/evidence/syzygy-bpyt-6-14/tools/mutants.py'
FIX_CHECK_R2 = 'docs/evidence/support-leaf-guards-review-2026-10-28/r2/fix-check-r2.json'
RESIDUALS_614 = 'docs/evidence/syzygy-bpyt-6-14/residuals-head.json'

LEAF = '@syzygy/support stays a pure leaf '
F1_ROW = LEAF + 'takes only createHash from node:crypto, by its own name, and re-exports nothing from it'
N3_ROW = LEAF + 'assigns to no property in any source, so no allowed global is rewritten'
IMPORT_ROW = LEAF + 'calls no import() in any source, however it is spaced or commented'
IMPORT_READER = 'the import() reader the import() row stands on reads '
MOD_READER = 'the module-declaration reader the createHash row stands on reads '
WRITE_READER = 'the property-write reader the no-write row stands on reads '
ID_READER = 'the identifier reader the allowlist stands on reads '
DRAFTER_PURE = 'owner-act drafter (M4 slice 7) is pure: it imports no filesystem, network or process module and names no write'
DRAFTER_ALLOW = 'owner-act drafter (M4 slice 7) names no identifier outside its literal list, so it reads no global it does not use'
ENTRIES = 'the workspace entry modules '
STATE_TARGETS = '      "import": "./dist/state-directory.js",\n      "default": "./dist/state-directory.js"\n'
DOTDOT_CHECK = "      if (JSON.stringify(entry).includes('/../')) throw new Error(`${specifier}: its entry has a /../ segment, which Node refuses`);\n"


def edit(path, old, new):
    return {'path': path, 'old': old, 'new': new}


# (id, test file(s), edits or a source tag, the failing test names expected, [] for a row that must pass). Tags: ('d', id) a PR 530 round-2 drafter row;
# ('fn', id) a PR 545 round-2 FN row; ('res', id) a 6.14 residual row.
ROWS = [
    ('P0-support-unmutated', PURITY, [], []),
    ('D0-drafter-unmutated', DRAFTER_TEST, [], []),
    ('W0-entries-unmutated', REACH_TEST, [], []),
    ('N0-no-egress-unmutated', NO_EGRESS, [], []),
    # Item 1: the drafter's allowlist. D2 and D5 survived the drafter's guard at #545; each must now fail the new row alone. DK1 and
    # DK2 must still fail the old row alone. K3 narrows the identifier reader both allowlists now share.
    ('D2-drafter-globalThis-bracket-read', DRAFTER_TEST, ('d', 'D2-drafter-globalThis-bracket-read'), [DRAFTER_ALLOW]),
    ('D5-drafter-WebSocket', DRAFTER_TEST, ('d', 'D5-drafter-WebSocket'), [DRAFTER_ALLOW]),
    ('DK1-drafter-clock-read', DRAFTER_TEST, [edit(DRAFTER, 'import { sha256 } from \'@syzygy/support\';\n',
                                                   "import { sha256 } from '@syzygy/support';\nexport const now = (): number => Date.now();\n")],
     [DRAFTER_PURE, DRAFTER_ALLOW]),
    ('DK2-drafter-re-export-from-node-fs', DRAFTER_TEST, [edit(DRAFTER, "import { sha256 } from '@syzygy/support';\n",
                                                               "import { sha256 } from '@syzygy/support';\nexport { readFileSync } from 'node:fs';\n")],
     [DRAFTER_PURE, DRAFTER_ALLOW]),
    ('DA1-drafter-allowlist-loses-a-used-name', DRAFTER_TEST, [edit(DRAFTER_TEST, " 'sha256', 'size',", " 'size',")], [DRAFTER_ALLOW]),
    ('K3-shared-identifier-reader-skips-private-names', [PURITY, DRAFTER_TEST],
     [edit(TESTKIT, 'if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node))', 'if (ts.isIdentifier(node))')],
     [ID_READER + '"class K { #p = 1; m<T>(v: T): T { return v; } }"']),
    # Round 2's N2-N4, the reviewer's own rows: each must fail exactly the row the reviewer named.
    *[(f'FN-{rid}', PURITY, ('fn', f'FN-{rid}'), want) for rid, want in [
        ('Y7', [F1_ROW]), ('Y6', [N3_ROW]), ('V7', [F1_ROW]), ('V9', [IMPORT_ROW]), ('Y5b', [IMPORT_ROW]), ('Y5c', [IMPORT_ROW]),
        ('U4', [N3_ROW]), ('U5', [N3_ROW]),
        ('Q1', [MOD_READER + '"export * from \'node:crypto\';"', MOD_READER + '"export { sha256 } from \'./sha256.js\';\\nexport { value };"']),
        ('Q2', [WRITE_READER + '"Object[\'freeze\'] ??= (value) => value;"']),
    ]],
    # 6.14's residuals: R2 (the review's [Inferred] kill) must now fail the import() row alone; R1, Y3 and Z7 (syzygy-bpyt.58's) still pass.
    ('R2-dynamic-import-with-a-space-of-an-allowed-name', PURITY, ('res', 'R2-dynamic-import-with-a-space-of-an-allowed-name'), [IMPORT_ROW]),
    ('R1-function-constructor-through-object-brackets', PURITY, ('res', 'R1-function-constructor-through-object-brackets'), []),
    ('Y3-R1-escalated-to-the-environment', PURITY, ('res', 'Y3-R1-escalated-to-the-environment'), []),
    ('Z7-unscoped-workspace-with-no-entry', NO_EGRESS, ('res', 'Z7-unscoped-workspace-with-no-entry'), []),
    # Item 5: the entry reader's two throws and its main fallback, each alone.
    ('E1-dotdot-check-dropped', REACH_TEST, [edit(REACH_KIT, DOTDOT_CHECK, '')],
     [ENTRIES + 'throws on a /../ segment that the resolver would join away, since Node refuses the entry']),
    # Round 1's F2 (the reviewer's X2): the check narrowed to a string entry must fail the /../ row, by its object-entry case.
    ('E5-dotdot-check-reads-only-a-string-entry', REACH_TEST,
     [edit(REACH_KIT, "if (JSON.stringify(entry).includes('/../'))", "if (typeof entry === 'string' && entry.includes('/../'))")],
     [ENTRIES + 'throws on a /../ segment that the resolver would join away, since Node refuses the entry']),
    ('E2-unreadable-entry-not-thrown', REACH_TEST,
     [edit(REACH_KIT, "if (typeof module !== 'string') throw new Error(", "if (typeof module !== 'string' && false) throw new Error(")],
     [ENTRIES + 'throws on an entry the resolver cannot read']),
    ('E3-main-fallback-dropped', REACH_TEST,
     [edit(REACH_KIT, " : manifest.main !== undefined ? [['.', manifest.main]] : [];", ' : [];')],
     [ENTRIES + 'reads each entry of each package, its main where it has no exports, as the src module it names']),
    # A /../ entry in the real workspace whose conditions all agree (round 1's N2): the S10 file fails before any row, by the /../
    # check, since the unreadable-entry throw reads the entry's one target (the message form is the review's Z1 record's).
    ('E4-uniform-dotdot-entry-in-the-workspace', NO_EGRESS,
     [edit(DOSSIER_PKG, STATE_TARGETS, STATE_TARGETS.replace('./dist/state-directory.js', './dist/x/../state-directory.js'))],
     ['file: @syzygy/polaris-dossier/state-directory: its entry has a /../ segment, which Node refuses']),
    # Round 1's N1 (the reviewer's X4, X6, X12, X7 and X8): each arm of the two readers, dropped, fails its own reader row.
    ('W1-write-reader-object-pattern-arm-dropped', PURITY,
     [edit(PURITY, 'ts.isPropertyAssignment(property) ? targets(property.initializer) : ts.isSpreadAssignment(property) ? targets(property.expression) : []', '[]')],
     [WRITE_READER + '"({ value: Object.freeze } = { value: (bytes) => bytes });"']),
    ('W2-write-reader-parenthesis-arm-dropped', PURITY, [edit(PURITY, '      : ts.isParenthesizedExpression(node) ? targets(node.expression)\n', '')],
     [WRITE_READER + '"(Object.freeze) = (value) => value;"']),
    ('W3-write-reader-spread-arm-dropped', PURITY,
     [edit(PURITY, 'targets(ts.isSpreadElement(element) ? element.expression : element)', 'targets(element)')], [WRITE_READER + '"[...Object.freeze] = [];"']),
    ('I1-import-reader-reads-only-a-string-literal-argument', PURITY,
     [edit(PURITY, 'if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)',
           'if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0]!))')],
     [IMPORT_READER + '"const value = \'node:f\' + \'s\';\\nvoid import (value);"']),
    ('I2-import-reader-without-recursion', PURITY,
     [edit(PURITY, 'calls.push(node.getText(file));\n    ts.forEachChild(node, visit);', 'calls.push(node.getText(file));')],
     [IMPORT_READER + '"export const value = () => import (\'node:crypto\');"', IMPORT_READER + '"const value = \'node:f\' + \'s\';\\nvoid import (value);"',
      IMPORT_READER + '"void import/**/(\'node:fs\');"']),
]


def sha256_file(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def failing_set(res):
    """The failed test names, and `file: <message>` for a file that failed outside any test."""
    return sorted({t['name'] for t in res.get('failedTests', [])} | {f"file: {m.splitlines()[0][:160]}" for m in res.get('fileMessages', [])})


def main():
    clone, out_path, tmpdir, dist = sys.argv[1:5]
    os.makedirs(tmpdir, exist_ok=True)
    spec = importlib.util.spec_from_file_location('lane614', os.path.join(clone, LANE_614))
    lane = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(lane)
    git = lambda *args: subprocess.run(['git', '-C', clone, *args], capture_output=True, text=True, check=True).stdout
    commit = git('rev-parse', 'HEAD').strip()
    assert git('status', '--porcelain') == '', 'the clone must start clean'
    present = lane.dist_dirs(clone)
    # Since PR 549 the product build emits a dist for exactly the projects `npm run build` passes to scripts/clean_build.mjs.
    built = sorted(f'{project}/dist' for project in json.load(open(os.path.join(clone, 'package.json')))['scripts']['build'].split()[2:])
    assert (dist == 'absent' and present == []) or (dist == 'present' and present == built), (dist, present, built)
    drafter_rows, drafter_records = lane.reviewer_fragments(clone)
    fn_rows = {r['id']: r['edits'] for r in json.load(open(os.path.join(clone, FIX_CHECK_R2)))['sets']['N']['rows']}
    res_rows = {r['id']: r['edits'] for r in json.load(open(os.path.join(clone, RESIDUALS_614)))['rows']}
    rows = []
    for rid, test, edits, want in ROWS:
        if isinstance(edits, tuple):
            edits = {'d': drafter_rows, 'fn': fn_rows, 'res': res_rows}[edits[0]][edits[1]]
        undo = lane.apply(clone, edits)
        try:
            res = lane.run(clone, test, tmpdir)
        finally:
            lane.restore(undo)
        failing = failing_set(res)
        ok = 'error' not in res and failing == sorted(want) and (res['exit'] == 0) == (want == [])
        rows.append({'id': rid, 'test': test, 'edits': edits, 'expectedFailing': want, 'failing': failing, 'asExpected': ok,
                     **{k: res.get(k) for k in ('exit', 'passed', 'failed', 'total', 'failedFiles', 'fileMessages', 'error')}})
        print(rid, 'as expected' if ok else 'UNEXPECTED', res.get('exit'), res.get('passed'), res.get('failed'), failing, flush=True)
    status = git('status', '--porcelain')
    leftovers = [p for p in ['packages/leak', 'node_modules/leak'] if os.path.lexists(os.path.join(clone, p))]
    summary = {'rows': len(rows), 'asExpected': sum(r['asExpected'] for r in rows), 'unexpected': [r['id'] for r in rows if not r['asExpected']]}
    json.dump({'commit': commit, 'dist': dist, 'distDirs': present, 'lane614Sha256': sha256_file(os.path.join(clone, LANE_614)),
               'reviewerRecords': {**drafter_records, FIX_CHECK_R2: sha256_file(os.path.join(clone, FIX_CHECK_R2)),
                                   RESIDUALS_614: sha256_file(os.path.join(clone, RESIDUALS_614))},
               'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(),
               'summary': summary, 'statusAfter': status, 'leftovers': leftovers, 'rows': rows}, open(out_path, 'w'), indent=1)
    print('summary', summary, 'status after', repr(status), 'leftovers', leftovers)


if __name__ == '__main__':
    main()
