#!/usr/bin/env python3
"""Does this review's proposed property-write row (N3) pass on the reviewed tree, kill Y6, and build?

Usage: fix_check3.py <clone at 5995aa3c with node_modules and every dist/ built> <out.json> <tmpdir>
The row text is read from fix-n-writes.ts.txt beside this script and inserted before the forbidden-token test.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rev_mutants as rm  # noqa: E402

ANCHOR = "  it('names none of the forbidden tokens it shares with the owner-act drafter in any source', () => {\n"
FIX = rm.e(rm.PURITY, ANCHOR, open(os.path.join(HERE, 'fix-n-writes.ts.txt')).read() + ANCHOR)
Y6 = {row[0]: row for row in rm.ROWS}['Y6-allowed-global-member-replaced'][2]
ROWS = [('FW0-fixed-unmutated', [FIX], 'pass'), ('FW-Y6', [FIX, *Y6], 'killed')]


def main():
    clone, out_path, tmpdir = sys.argv[1:4]
    git = lambda *a: subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True).stdout
    assert git('status', '--porcelain') == ''
    rows = []
    for rid, edits, expected in ROWS:
        undo = rm.apply(clone, edits)
        try:
            res = rm.run(clone, [rm.PURITY], tmpdir)
        finally:
            rm.restore(undo)
        observed = 'error' if 'error' in res else ('survives' if res['exit'] == 0 else ('killed' if res['failed'] > 0 or res['failedFiles'] else 'error'))
        observed = 'pass' if expected == 'pass' and observed == 'survives' else observed
        rows.append({'id': rid, 'edits': edits, 'expected': expected, 'observed': observed, **res})
        print(rid, 'expected', expected, 'observed', observed, res.get('passed'), res.get('failed'),
              [(t['name'][-80:], t['message'].split('\n')[0][:160]) for t in res.get('failedTests', [])], flush=True)
    undo = rm.apply(clone, [FIX])
    try:
        build = subprocess.run(['npx', 'tsc', '-b', 'packages/support'], cwd=clone, capture_output=True, text=True, env=dict(os.environ, TMPDIR=tmpdir))
    finally:
        rm.restore(undo)
    rebuild = subprocess.run(['npx', 'tsc', '-b', 'packages/support'], cwd=clone, capture_output=True, text=True, env=dict(os.environ, TMPDIR=tmpdir))
    out = {'commit': git('rev-parse', 'HEAD').strip(), 'rows': rows, 'buildWithFix': build.returncode, 'buildOut': (build.stdout + build.stderr)[-600:],
           'rebuildAfter': rebuild.returncode, 'statusAfter': git('status', '--porcelain')}
    json.dump(out, open(out_path, 'w'), indent=1)
    print('build with fix', build.returncode, out['buildOut'][-300:], 'rebuild', rebuild.returncode, 'status after', repr(out['statusAfter']))


if __name__ == '__main__':
    main()
