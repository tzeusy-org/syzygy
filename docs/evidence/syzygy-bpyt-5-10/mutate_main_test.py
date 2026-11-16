#!/usr/bin/env python3
"""Rule-6 run for the syzygy-bpyt.5.10 changes to main.test.ts.

Usage: mutate_main_test.py <out.json>   (run from the worktree root, with TMPDIR short)

Each mutant rewrites one fragment of a tracked file in place, runs
apps/three-surface-poc/src/main.test.ts, records the vitest outcome, and restores
the file with `git checkout`. The control (no edit) must pass; every mutant must
fail. The record stores each mutant's file, old and new fragment, the exit
status, and the failing test names, plus the HEAD commit the run used.
"""
import json
import pathlib
import re
import subprocess
import sys

TEST = 'apps/three-surface-poc/src/main.test.ts'
MAIN = 'apps/three-surface-poc/src/poc-main.ts'
ROUTE = 'apps/three-surface-poc/src/verbatim-route.ts'
out = pathlib.Path(sys.argv[1]).resolve()

DEFAULTS_END = "    fake.signal('SIGINT');\n    await run;\n  }, TEST_TIMEOUT_MS);\n\n  it('attaches the Enter console"
MUTANTS = [
    ('N3-wait-ms-40000 (the reviewer mutant)', TEST, 'const WAIT_MS = 10_000;', 'const WAIT_MS = 40_000;'),
    ('N3-test-timeout-lowered', TEST, 'const TEST_TIMEOUT_MS = 30_000;', 'const TEST_TIMEOUT_MS = 15_000;'),
    ('N3-waiting-test-omits-timeout', TEST, DEFAULTS_END, DEFAULTS_END.replace('  }, TEST_TIMEOUT_MS);', '  });')),
    ('N3-started-charge-removed', TEST, '  if (boundMs === WAIT_MS) chargeWait();', '  if (boundMs === WAIT_MS) undefined;'),
    ('N3-started-bound-raised-past-timeout', TEST, 'boundMs: number = WAIT_MS', 'boundMs: number = 4 * WAIT_MS'),
    ('N4-verbatim-reader-root (poc-main.ts)', MAIN, 'gitBlobReaderFor(repoRoot)', "gitBlobReaderFor('/observer/syzygy')"),
    ('N4-verbatim-reader-returns-nothing (poc-main.ts)', MAIN, 'verbatimRouteReader(current, gitBlobReaderFor(repoRoot))', 'verbatimRouteReader(current, () => undefined)'),
    ('N4-verbatim-reader-asked-for-wrong-object (verbatim-route.ts)', ROUTE, 'readBlob(source.anchor.objectId);', 'readBlob(source.anchor.objectId.slice(1));'),
]


def git(*args: str) -> str:
    return subprocess.run(['git', *args], capture_output=True, text=True, check=True).stdout.strip()


def run_suite() -> dict:
    proc = subprocess.run(['npx', 'vitest', 'run', TEST, '--reporter=json'], capture_output=True, text=True)
    text = proc.stdout
    report = json.loads(text[text.index('{'):])
    failed = [f"{a.get('ancestorTitles', [''])[0]} > {a['title']}" for f in report['testResults'] for a in f['assertionResults'] if a['status'] == 'failed']
    return {'exit': proc.returncode, 'passed': report['numPassedTests'], 'failed': report['numFailedTests'], 'failedTests': failed}


assert git('status', '--porcelain', '--', TEST, MAIN, ROUTE) == '', 'tracked files must be clean at the commit under test'
record = {'head': git('rev-parse', 'HEAD'), 'control': run_suite(), 'mutants': []}
assert record['control']['exit'] == 0, record['control']
for name, path, old, new in MUTANTS:
    target = pathlib.Path(path)
    text = target.read_text()
    assert text.count(old) == 1, (name, text.count(old))
    try:
        target.write_text(text.replace(old, new))
        result = run_suite()
    finally:
        subprocess.run(['git', 'checkout', '--', path], check=True)
    record['mutants'].append({'id': name, 'file': path, 'old': old, 'new': new, 'killed': result['exit'] != 0, **result})
assert git('status', '--porcelain', '--', TEST, MAIN, ROUTE) == ''
record['allKilled'] = all(m['killed'] for m in record['mutants'])
out.write_text(json.dumps(record, indent=2) + '\n')
print(f"control exit {record['control']['exit']}; killed {sum(m['killed'] for m in record['mutants'])} of {len(record['mutants'])}")
