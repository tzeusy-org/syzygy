#!/usr/bin/env python3
"""Write the verification record of this evidence directory from the gate logs and the files themselves.

Usage: make_verification.py <worktree> <gate-governance.log> <exit> <gate-quotations.log> <exit> <gate-authority-sweep.log> <exit> <out.json>

Reads the three gate logs as written by `python3 scripts/check_governance.py`, `python3 scripts/check_quotations.py` and
`npx vitest run apps/three-surface-poc/src/polaris-authority-sweep.test.ts`, takes their summary lines verbatim, hashes every
file of the evidence directory, and names HEAD of <worktree>, which must have a clean tracked tree. The gates are valid for that
commit only; the record that this script writes is the one commit after it.
"""
import hashlib
import json
import pathlib
import re
import subprocess
import sys

WT = pathlib.Path(sys.argv[1]).resolve()
GOV, QUOT, SWEEP = (pathlib.Path(p) for p in (sys.argv[2], sys.argv[4], sys.argv[6]))
EXITS = {'check_governance': int(sys.argv[3]), 'check_quotations': int(sys.argv[5]), 'authoritySweep': int(sys.argv[7])}
OUT = pathlib.Path(sys.argv[8]).resolve()
HERE = pathlib.Path(__file__).resolve().parent
git = lambda *a: subprocess.run(['git', *a], cwd=WT, capture_output=True, text=True, check=True).stdout.strip()
assert git('status', '--porcelain', '--untracked-files=no') == '', 'the tracked tree must be clean'
lines = lambda p, pattern: [l.strip() for l in p.read_text().splitlines() if re.search(pattern, l)]
record = {
    'subject': 'docs/evidence/scratch-prefix-census-2026-10-23/', 'gatesRanAtCommit': git('rev-parse', 'HEAD'),
    'censusRunCommit': json.loads((HERE / 'census-2026-10-24.json').read_text())['subject']['treeCommit'],
    'gates': {'check_governance': {'command': 'python3 scripts/check_governance.py', 'exit': EXITS['check_governance'], 'summary': lines(GOV, r'\d+ OK, \d+ WARN, \d+ FAIL')},
              'check_quotations': {'command': 'python3 scripts/check_quotations.py', 'exit': EXITS['check_quotations'], 'summary': lines(QUOT, r'^(OK|FAIL)\s+QC-1\b')},
              'authoritySweep': {'command': 'TMPDIR=<short private> npx vitest run apps/three-surface-poc/src/polaris-authority-sweep.test.ts', 'exit': EXITS['authoritySweep'], 'summary': lines(SWEEP, r'^\s*(Test Files|Tests)\s')}},
    'rule6': {name: json.loads((HERE / f).read_text())['holds'] for name, f in (('trace-selftest', 'trace-selftest-2026-10-23.json'), ('assemble-selftest', 'assemble-selftest-2026-10-24.json'), ('static-selftest', 'static-selftest-2026-10-25.json'), ('input-checks', 'input-checks-2026-10-24.json'))},
    'fileSha256': {p.relative_to(HERE).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(HERE.rglob('*')) if p.is_file() and p.name != 'verification-2026-10-24.json'},
}
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({k: record[k] for k in ('gatesRanAtCommit', 'censusRunCommit', 'rule6')}))
