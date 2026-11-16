#!/usr/bin/env python3
"""syzygy-bpyt.6.14: the forms the guards are known to pass, run against the test each one evades, so the residuals the PR
discloses are measured rather than asserted. Reuses mutants.py's apply, restore and run.

R1: code built from a string by `Function`, reached as `Object['constructor']['constructor']`: the one identifier is `Object`,
    and the string names no forbidden token.
R2: `import (value)` with a space and a computed specifier: `value` is on the list, and neither the reader nor the forbidden
    `import(` token reads a call with a space before its parenthesis.
Both need deliberate evasion (review's job, as the round-2 review says of RP6 and E9). The PR 545 round-1 review
(R-GP-IMPL-SUPPORT-LEAF-GUARDS-1) observed four more, read by id from reviewer-r1-fragments.json: Y3 (R1 reaching
`process.env.HOME`), Y5b and Y5c (R2 with a newline or a comment between `import` and its parenthesis), and Z7 (its N5: an
unscoped workspace with no entry, which the guard's `@syzygy/` filter never reads). Usage: residuals.py <clone> <out.json> <tmpdir>
"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mutants as m  # noqa: E402

SHA = 'packages/support/src/sha256.ts'
HASH_IMPORT = "import { createHash } from 'node:crypto';\n"
ROWS = [
    ('R1-function-constructor-through-object-brackets', m.PURITY,
     [m.edit(SHA, HASH_IMPORT, HASH_IMPORT + "Object['constructor']['constructor'](\"return globalThis['proc' + 'ess']['env']['HOME']\")();\n")], 'survives'),
    ('R2-dynamic-import-with-a-space-of-an-allowed-name', m.PURITY,
     [m.edit(SHA, HASH_IMPORT, HASH_IMPORT + "const value = 'node:f' + 's';\nvoid import (value);\n")], 'survives'),
    *[(rid, test, 'reviewer-r1', 'survives') for rid, test in [
        ('Y3-R1-escalated-to-the-environment', m.PURITY), ('Y5b-computed-import-newline', m.PURITY),
        ('Y5c-computed-import-comment', m.PURITY), ('Z7-unscoped-workspace-with-no-entry', m.NO_EGRESS)]],
]


def main():
    clone, out_path, tmpdir = sys.argv[1:4]
    os.makedirs(tmpdir, exist_ok=True)
    git = lambda *args: subprocess.run(['git', '-C', clone, *args], capture_output=True, text=True, check=True).stdout
    assert git('status', '--porcelain') == ''
    fragments_r1, record_r1 = m.reviewer_r1_fragments(clone)
    rows = []
    for rid, test, edits, expected in ROWS:
        if edits == 'reviewer-r1':
            edits = fragments_r1[rid]
        undo = m.apply(clone, edits)
        try:
            res = m.run(clone, test, tmpdir)
        finally:
            m.restore(undo)
        observed = 'error' if 'error' in res else ('survives' if res['exit'] == 0 else ('killed' if res['failed'] > 0 or res['failedFiles'] else 'error'))
        rows.append({'id': rid, 'test': test, 'edits': edits, 'expected': expected, 'observed': observed, **res})
        print(rid, 'expected', expected, 'observed', observed, res.get('passed'), res.get('failed'), flush=True)
    json.dump({'commit': git('rev-parse', 'HEAD').strip(), 'reviewerR1Record': record_r1, 'statusAfter': git('status', '--porcelain'), 'rows': rows},
              open(out_path, 'w'), indent=1)


if __name__ == '__main__':
    main()
