#!/usr/bin/env python3
"""Does any committed row pin that the S10 driver bundle carries the guard, and does this review's proposed row (N4) do so?

Usage: fix_check2.py <clone at 5995aa3c with node_modules> <out.json> <tmpdir>

G0 removes the guard plugin from bundleDriver alone (the lane's M5 without M2). FG0 applies the proposed fix (an aliases
parameter on bundleDriver and one row that bundles the driver with an alias outside the sources); FG1 applies the fix and
removes the plugin. The fix row text is read from fix-n-guard-row.ts.txt beside this script.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rev_mutants as rm  # noqa: E402

TEST = rm.NO_EGRESS
SIG_OLD = 'async function bundleDriver(outfile: string): Promise<void> {\n'
SIG_NEW = 'async function bundleDriver(outfile: string, aliases: Record<string, string> = workspaceAliases()): Promise<void> {\n'
ALIAS_OLD = '    alias: workspaceAliases(),\n    plugins: [sourcesOnly(SOURCE_ROOT)],\n'
ALIAS_NEW = '    alias: aliases,\n    plugins: [sourcesOnly(SOURCE_ROOT)],\n'
ANCHOR = "  it('fails the bundle when an @syzygy specifier resolves outside them', async () => {\n"
GUARD = '    plugins: [sourcesOnly(SOURCE_ROOT)],\n  });\n}\n'
NO_GUARD = '    plugins: [],\n  });\n}\n'
fix_edits = [rm.e(TEST, SIG_OLD, SIG_NEW), rm.e(TEST, ALIAS_OLD, ALIAS_NEW),
             rm.e(TEST, ANCHOR, open(os.path.join(HERE, 'fix-n-guard-row.ts.txt')).read() + ANCHOR)]


def apply_all(clone, edits):
    """Edits applied in order to one file's current text (rm.apply reads each edit against the text before it)."""
    path = os.path.join(clone, TEST)
    original = open(path).read()
    text = original
    for ed in edits:
        assert text.count(ed['old']) == 1, ed['old']
        text = text.replace(ed['old'], ed['new'])
    open(path, 'w').write(text)
    return original


ROWS = [
    ('G0-guard-removed-alone', [rm.e(TEST, GUARD, NO_GUARD)], 'survives'),
    ('FG0-fixed-unmutated', fix_edits, 'pass'),
    ('FG1-fixed-guard-removed', fix_edits + [rm.e(TEST, GUARD, NO_GUARD)], 'killed'),
]


def main():
    clone, out_path, tmpdir = sys.argv[1:4]
    os.makedirs(tmpdir, exist_ok=True)
    git = lambda *a: subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True).stdout
    assert git('status', '--porcelain') == ''
    rows = []
    for rid, edits, expected in ROWS:
        load = open('/proc/loadavg').read().split()[:3]
        original = apply_all(clone, edits)
        try:
            res = rm.run(clone, [TEST], tmpdir)
        finally:
            open(os.path.join(clone, TEST), 'w').write(original)
        observed = 'error' if 'error' in res else ('survives' if res['exit'] == 0 else
                                                   ('killed' if res['failed'] > 0 or res['failedFiles'] else 'error'))
        if expected == 'pass' and observed == 'survives':
            observed = 'pass'
        rows.append({'id': rid, 'edits': edits, 'expected': expected, 'observed': observed, 'loadavg': load, **res})
        print(rid, 'expected', expected, 'observed', observed, res.get('passed'), res.get('failed'), res.get('pending'),
              [(t['name'][-90:], t['message'].split('\n')[0][:200]) for t in res.get('failedTests', [])],
              [m[:200] for m in res.get('fileMessages', [])], flush=True)
    summary = {'rows': len(rows), 'asExpected': sum(r['observed'] == r['expected'] for r in rows),
               'unexpected': [r['id'] for r in rows if r['observed'] != r['expected']]}
    json.dump({'commit': git('rev-parse', 'HEAD').strip(), 'summary': summary, 'statusAfter': git('status', '--porcelain'), 'rows': rows},
              open(out_path, 'w'), indent=1)
    print('summary', summary, 'status after', repr(git('status', '--porcelain')))


if __name__ == '__main__':
    main()
