"""Checks this review's proposed fixes (R-GP-IMPL-SUPPORT-LEAF-GUARDS-2) in a clean clone: each fix set is applied, its file must
pass unmutated and build, and each mutant row run on top of it must fail exactly the rows named before the run.

Usage: python3 -I fix_check_r2.py <clone with node_modules> <out.json> <tmpdir> <round-1 records dir>

Fix sets:
  B  the blocking fixture fix (F2): the N1 row's file list and expectation, so the x forms and an exact exclusion are pinned;
  N  the notes' fixes (N2-N4): module-declaration reader rows; the write reader extracted with its own rows; import x = require()
     read as a declaration; an AST row for import() calls; destructuring targets read as writes.
Each set's own text is in tools/fix-r2-*.ts.txt beside this script, and is inserted from there byte for byte.
"""
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys

clone, out_path, tmpdir, r1_dir = sys.argv[1:5]
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('r2', os.path.join(here, 'r2_mutants.py'))
saved = sys.argv
sys.argv = [saved[0], clone, os.devnull, tmpdir, 'absent', 'mine']
r2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r2)
sys.argv = saved
lane = r2.lane
PURITY = r2.PURITY
mine = {row[0]: row for row in r2.MINE}


def text(name):
    return open(os.path.join(here, name), encoding='utf-8').read()


def r1_edits(rid):
    for name in ['rev-mutants-head-present.json']:
        for row in json.load(open(os.path.join(r1_dir, name)))['rows']:
            if row['id'] == rid:
                return row['edits']
    raise KeyError(rid)


OLD_LIST = "      for (const file of ['a.ts', 'io/b.ts', 'c.mts', 'd.cjs', 'e.test.ts', 'purity.testkit.ts', 'f.json']) {\n"
OLD_EXPECT = "      expect(sourcesUnder(pathToFileURL(`${dir}/`))).toEqual(['a.ts', 'c.mts', 'd.cjs', 'io/b.ts']);\n"
B = [r2.e(PURITY, OLD_LIST, text('fix-r2-sources-list.ts.txt')), r2.e(PURITY, OLD_EXPECT, text('fix-r2-sources-expect.ts.txt'))]

# The two texts the notes' fixes replace are round 1's own fix texts, read from that review's tools/ (each occurs once at HEAD).
OLD_READER = open(os.path.join(r1_dir, 'tools/fix-f1-function.ts.txt'), encoding='utf-8').read()
OLD_WRITES_ROW = open(os.path.join(r1_dir, 'tools/fix-n-writes.ts.txt'), encoding='utf-8').read()
N = [
    r2.e(PURITY, OLD_READER, '\n' + text('fix-r2-module-reader.ts.txt') + '\n' + text('fix-r2-writes-reader.ts.txt')),
    r2.e(PURITY, OLD_WRITES_ROW, text('fix-r2-writes-row.ts.txt') + text('fix-r2-import-call-row.ts.txt')),
    r2.e(PURITY, "describe('the identifier reader the allowlist stands on', () => {\n",
         text('fix-r2-reader-rows.ts.txt') + "describe('the identifier reader the allowlist stands on', () => {\n"),
]

F1_ROW, N1_ROW, N3_ROW = r2.F1_ROW, r2.N1_ROW, r2.N3_ROW
IMPORT_ROW = '@syzygy/support stays a pure leaf calls no import() in any source, however it is spaced or commented'
MOD_READER = 'the module-declaration reader the createHash row stands on reads %s'
WRITE_READER = 'the property-write reader the no-write row stands on reads %s'

SETS = {
    'B': (B, [
        ('FB0-unmutated', [], 'pass', None),
        ('FB-W1', mine['W1-scan-without-recursion-alone'][2], 'killed', [N1_ROW]),
        ('FB-W2', mine['W2-filter-narrowed-to-ts'][2], 'killed', [N1_ROW]),
        ('FB-W5', mine['W5-filter-drops-the-x-forms'][2], 'killed', [N1_ROW]),
        ('FB-W6', mine['W6-test-exclusion-broadened-to-any-test-substring'][2], 'killed', [N1_ROW]),
        ('FB-W7', mine['W7-testkit-exclusion-broadened-to-any-depth'][2], 'killed', [N1_ROW]),
    ]),
    'N': (N, [
        ('FN0-unmutated', [], 'pass', None),
        ('FN-Y7', [r2.add_index("export * from 'node:crypto';\n")], 'killed', [F1_ROW]),
        ('FN-Y6', [r2.add_sha('Object.freeze = (value) => value;\n')], 'killed', [N3_ROW]),
        ('FN-V7', mine['V7-import-equals-require-with-a-space'][2], 'killed', [F1_ROW]),
        ('FN-V9', mine['V9-literal-dynamic-import-of-node-crypto-with-a-space'][2], 'killed', [IMPORT_ROW]),
        ('FN-Y5b', r1_edits('Y5b-computed-import-newline'), 'killed', [IMPORT_ROW]),
        ('FN-Y5c', r1_edits('Y5c-computed-import-comment'), 'killed', [IMPORT_ROW]),
        ('FN-U4', mine['U4-array-destructuring-write'][2], 'killed', [N3_ROW]),
        ('FN-U5', mine['U5-object-destructuring-write'][2], 'killed', [N3_ROW]),
        ('FN-Q1', [r2.e(PURITY, 'ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement) ? statement.moduleSpecifier',
                        'ts.isImportDeclaration(statement) ? statement.moduleSpecifier')], 'killed', None),
        ('FN-Q2', [r2.e(PURITY, 'ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)', 'ts.isPropertyAccessExpression(target)')],
         'killed', None),
    ]),
}


def tsc_support(tmp):
    out = os.path.join(tmp, 'out')
    shutil.rmtree(out, ignore_errors=True)
    proc = subprocess.run(['npx', 'tsc', '-p', 'packages/support/tsconfig.json', '--outDir', out, '--tsBuildInfoFile', os.path.join(out, '.tsbuildinfo')],
                          cwd=clone, capture_output=True, text=True, env=dict(os.environ, TMPDIR=tmp))
    shutil.rmtree(out, ignore_errors=True)
    return proc.returncode, proc.stdout.strip().splitlines()[:5]


def main():
    os.makedirs(tmpdir, exist_ok=True)
    git = lambda *args: subprocess.run(['git', '-C', clone, *args], capture_output=True, text=True, check=True).stdout
    assert git('status', '--porcelain') == ''
    results = {}
    for name, (fix, rows) in SETS.items():
        fix_undo = lane.apply(clone, fix)
        try:
            build = tsc_support(tmpdir)
            out_rows = []
            for rid, edits, expected, want in rows:
                undo = lane.apply(clone, edits)
                try:
                    res = lane.run(clone, [PURITY], tmpdir)
                finally:
                    lane.restore(undo)
                observed = 'error' if 'error' in res else ('survives' if res['exit'] == 0 else
                                                           ('killed' if res['failed'] > 0 or res['failedFiles'] else 'error'))
                if expected == 'pass' and observed == 'survives':
                    observed = 'pass'
                failing = r2.failing_set(res)
                if want is None and expected == 'killed':
                    ok = bool(failing) and all(t.startswith(('the module-declaration reader', 'the property-write reader')) for t in failing)
                else:
                    ok = (want is None and failing == []) or (want is not None and failing == sorted(want))
                out_rows.append({'id': rid, 'edits': edits, 'expected': expected, 'observed': observed, 'expectedFailing': want,
                                 'failing': failing, 'failingAsExpected': ok, 'passed': res.get('passed'), 'failedCount': res.get('failed'),
                                 'messages': [t['message'][:300] for t in res.get('failedTests', [])], 'load1': open('/proc/loadavg').read().split()[0]})
                print(name, rid, 'expected', expected, 'observed', observed, 'failingOk', ok, res.get('passed'), res.get('failed'), failing, flush=True)
        finally:
            lane.restore(fix_undo)
        results[name] = {'build': {'exit': build[0], 'firstLines': build[1]}, 'fix': fix, 'rows': out_rows}
        print(name, 'tsc -p packages/support with the fix', build, flush=True)
    status = git('status', '--porcelain')
    total = [r for s in results.values() for r in s['rows']]
    summary = {'rows': len(total), 'asExpected': sum(r['observed'] == r['expected'] and r['failingAsExpected'] for r in total),
               'unexpected': [r['id'] for r in total if not (r['observed'] == r['expected'] and r['failingAsExpected'])],
               'buildsExit': {k: v['build']['exit'] for k, v in results.items()}}
    json.dump({'commit': git('rev-parse', 'HEAD').strip(), 'summary': summary, 'statusAfter': status, 'sets': results}, open(out_path, 'w'), indent=1)
    print('summary', summary, 'status after', repr(status))


if __name__ == '__main__':
    main()
