#!/usr/bin/env python3
"""Do the fixes this review proposes (F1, N1, N2) kill the survivors they name, and does the fixed test still pass and build?

Usage: fix_check.py <clone at 5995aa3c with node_modules> <out.json> <tmpdir> <absent|present>

The fix texts are read from the fix-*.ts.txt files beside this script; the mutant edits are rev_mutants.py's rows by id.
Each row applies every fix plus one mutant, runs vitest, and restores; a last step builds packages/support with the fixes
applied (tsc -b) and restores. Records `git status --porcelain` after (expected empty).
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rev_mutants as rm  # noqa: E402

PURITY = rm.PURITY
fix = lambda name: open(os.path.join(HERE, name)).read()
OLD_SOURCES = ("const SOURCES = readdirSync(SRC, { recursive: true, encoding: 'utf8' })\n"
               "  .filter((name) => /\\.[cm]?[jt]sx?$/u.test(name) && !name.endsWith('.test.ts') && name !== 'purity.testkit.ts').sort();\n")
OLD_IMPORT = "import { readdirSync, readFileSync } from 'node:fs';\n"
NEW_IMPORT = ("import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';\n"
              "import { tmpdir } from 'node:os';\nimport { dirname, join } from 'node:path';\nimport { pathToFileURL } from 'node:url';\n")
ID_END = '  return [...names].sort();\n}\n'
FORBIDDEN_TEST = "  it('names none of the forbidden tokens it shares with the owner-act drafter in any source', () => {\n"
LIST_DESCRIBE = "describe('the forbidden-token list both guards stand on', () => {\n"
SPEC_TEST = "  it('names no module but node:crypto and a module beside it in any literal specifier of any source', () => {\n"


def fixes():
    """One edit of the test file carrying all three fixes."""
    text_edits = [
        (OLD_IMPORT, NEW_IMPORT),
        (OLD_SOURCES, fix('fix-n-sources.ts.txt')),
        (ID_END, ID_END + fix('fix-f1-function.ts.txt')),
        (SPEC_TEST, fix('fix-n-sources-row.ts.txt') + SPEC_TEST),
        (FORBIDDEN_TEST, fix('fix-f1-test.ts.txt') + FORBIDDEN_TEST),
        (LIST_DESCRIBE, LIST_DESCRIBE + fix('fix-n-literal.ts.txt')),
    ]
    return text_edits


def fixed_text(original):
    text = original
    for old, new in fixes():
        assert text.count(old) == 1, old
        text = text.replace(old, new)
    return text


BY_ID = {row[0]: row for row in rm.ROWS}
ROWS = [
    ('FX0-fixed-test-unmutated', [PURITY], [], 'pass'),
    *[(f'FX-{rid}', BY_ID[rid][1], BY_ID[rid][2], 'killed') for rid in [
        'Y7-export-star-from-node-crypto', 'Y9-export-star-as-allowed-name', 'Y10-string-named-re-export',
        'Y11-string-named-import-called-at-import', 'Y12-namespace-import-re-exported', 'Y14-drafter-takes-randomness-through-support',
        'K4-shared-Date-token-weakened-plus-DK1']],
    # T1 against the fixed test: the scan made non-recursive again, with no subdirectory module present.
    ('FX-T1-scan-without-recursion', [PURITY], 'T1', 'killed'),
    # The kills the PR already has must stay kills under the fixed test.
    *[(f'FX-{rid}', BY_ID[rid][1], BY_ID[rid][2], 'killed') for rid in ['Y1-reflect-get-globalThis-env', 'Y8-export-star-from-node-fs']],
]


def main():
    clone, out_path, tmpdir, dist = sys.argv[1:5]
    os.makedirs(tmpdir, exist_ok=True)
    git = lambda *a: subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True).stdout
    assert git('status', '--porcelain') == ''
    test_path = os.path.join(clone, PURITY)
    original = open(test_path).read()
    fixed = fixed_text(original)
    rows = []
    for rid, tests, edits, expected in ROWS:
        load = open('/proc/loadavg').read().split()[:3]
        open(test_path, 'w').write(fixed if edits != 'T1' else fixed.replace(
            "readdirSync(dir, { recursive: true, encoding: 'utf8' })", "readdirSync(dir, { encoding: 'utf8' })", 1))
        undo = []
        try:
            undo = rm.apply(clone, [] if edits == 'T1' else edits)
            res = rm.run(clone, tests, tmpdir)
        finally:
            rm.restore(undo)
            open(test_path, 'w').write(original)
        observed = 'error' if 'error' in res else ('survives' if res['exit'] == 0 else
                                                   ('killed' if res['failed'] > 0 or res['failedFiles'] else 'error'))
        if expected == 'pass' and observed == 'survives':
            observed = 'pass'
        rows.append({'id': rid, 'tests': tests, 'expected': expected, 'observed': observed, 'loadavg': load, **res})
        print(rid, 'expected', expected, 'observed', observed, res.get('passed'), res.get('failed'),
              [(t['name'], t['message'].split('\n')[0][:140]) for t in res.get('failedTests', [])], flush=True)
    open(test_path, 'w').write(fixed)
    try:
        build = subprocess.run(['npx', 'tsc', '-b', 'packages/support'], cwd=clone, capture_output=True, text=True,
                               env=dict(os.environ, TMPDIR=tmpdir))
    finally:
        open(test_path, 'w').write(original)
    rebuild = subprocess.run(['npx', 'tsc', '-b', 'packages/support'], cwd=clone, capture_output=True, text=True,
                             env=dict(os.environ, TMPDIR=tmpdir)) if dist == 'present' else None
    summary = {'rows': len(rows), 'asExpected': sum(r['observed'] == r['expected'] for r in rows),
               'unexpected': [r['id'] for r in rows if r['observed'] != r['expected']]}
    out = {'commit': git('rev-parse', 'HEAD').strip(), 'dist': dist, 'fixedTestSha256': __import__('hashlib').sha256(fixed.encode()).hexdigest(),
           'fixes': [{'old': o, 'new': n} for o, n in fixes()], 'summary': summary,
           'buildWithFixes': {'exit': build.returncode, 'out': (build.stdout + build.stderr)[-800:]},
           'rebuildAfter': None if rebuild is None else rebuild.returncode, 'statusAfter': git('status', '--porcelain'), 'rows': rows}
    json.dump(out, open(out_path, 'w'), indent=1)
    print('summary', summary, 'build with fixes', build.returncode, (build.stdout + build.stderr)[-300:], 'status after', repr(out['statusAfter']))


if __name__ == '__main__':
    main()
