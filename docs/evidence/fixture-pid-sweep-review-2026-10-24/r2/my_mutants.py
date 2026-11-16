#!/usr/bin/env python3
"""Reviewer's rule-6 run (R-GP-IMPL-FIXTURE-PID-SWEEP-2) over the reviewed bytes, in a scratch clone.

Usage: my_mutants.py <clone> <out.json> <private-tmpdir>

Each mutant is (id, meaning, edits, expected) where edits are (file, old, new) and every old
fragment must occur exactly once. The two test files run alone under the private TMPDIR. A
mutant is `killed` only when the run exits non-zero AND at least one failing test's name contains
one of the `expected` substrings, so a load timeout elsewhere cannot score a kill. Files are
restored byte for byte after each mutant and checked by sha256 at the end.
"""
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys

WT, OUT, TMP = (pathlib.Path(a).resolve() for a in sys.argv[1:4])
assert str(TMP).startswith('/tmp/r509b-'), 'private TMPDIR only'
FD = 'apps/three-surface-poc/src/fixture-directories.ts'
GS = 'apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts'
TESTS = ['apps/three-surface-poc/src/fixture-directories.test.ts', 'apps/three-surface-poc/src/test-model-fixture.test.ts']
DECIDE = 'if (owner === null || owner[2] !== namespace || ownerMayBeAlive(Number(owner[1]))) continue;'
GUARD = 'if (stat.isDirectory() && (user === undefined || stat.uid === user)) rmSync('
MUTANTS = [
    ('namespace-ignored', "the lane's foreign-namespace-swept fragment: a dead pid of another namespace is removed",
     [(FD, DECIDE, 'if (owner === null || ownerMayBeAlive(Number(owner[1]))) continue;')],
     ['belong to another PID namespace']),
    ('uid-guard-dropped', "the lane's uid-guard-dropped fragment: another user's directory is entered and removed",
     [(FD, GUARD, 'if (stat.isDirectory()) rmSync(')],
     ['belongs to another user']),
    ('is-directory-guard-dropped', "the lane's is-directory-guard-dropped fragment: a file or symlink at a dead-pid name is removed",
     [(FD, GUARD, 'if (user === undefined || stat.uid === user) rmSync(')],
     ['follows no symlink and removes no file']),
    ('uid-compare-inverted', 'reviewer: the uid comparison is inverted, so only other users\' directories go',
     [(FD, 'stat.uid === user)', 'stat.uid !== user)')],
     ['removes the copy and the template of a process that is gone']),
    ('no-uid-means-keep', 'reviewer: where the system has no user ids nothing is removed',
     [(FD, '(user === undefined || stat.uid === user)', '(user !== undefined && stat.uid === user)')],
     ['checks no user where the system has no user ids']),
    ('global-setup-sweeps-cwd', 'reviewer: the global setup sweeps the working directory instead of the temp directory',
     [(GS, '  removeFixturesOfDeadProcesses();\n', '  removeFixturesOfDeadProcesses(process.cwd());\n')],
     ['sweeps the temp directory the process runs under', 'asks the operating system for the temp directory']),
    ('namespace-prefix-match', 'reviewer: the namespace is compared by prefix, so n40 matches n4026531836',
     [(FD, 'owner[2] !== namespace', '!namespace.startsWith(owner[2])')],
     ['belong to another PID namespace']),
]


def sh(*a):
    return subprocess.run(a, cwd=WT, capture_output=True, text=True, check=True).stdout.strip()


commit = sh('git', 'rev-parse', 'HEAD')
assert sh('git', 'status', '--porcelain') == '', 'the clone must be clean'
files = sorted({f for _, _, e, _ in MUTANTS for f, _, _ in e})
originals = {f: (WT / f).read_bytes() for f in files}
digests = {f: hashlib.sha256(b).hexdigest() for f, b in originals.items()}
report = WT.parent / 'my-mutants-report.json'
command = ['npx', 'vitest', 'run', *TESTS, '--project', '@syzygy/three-surface-poc-app', '--reporter=json', f'--outputFile={report}']


def vitest():
    shutil.rmtree(TMP, ignore_errors=True)
    TMP.mkdir()
    report.unlink(missing_ok=True)
    proc = subprocess.run(command, cwd=WT, capture_output=True, text=True, env={**os.environ, 'TMPDIR': str(TMP)}, timeout=900)
    data = json.loads(report.read_text()) if report.exists() else {'testResults': []}
    cases = [a for s in data['testResults'] for a in s['assertionResults']]
    failing = [{'test': a['fullName'], 'firstErrorLine': (a['failureMessages'][0].splitlines() or [''])[0] if a['failureMessages'] else ''}
               for a in cases if a['status'] == 'failed']
    left = sorted(p.name for p in TMP.iterdir() if p.name.startswith('syzygy-poc-surface-fixture-'))
    return proc.returncode, len(cases), failing, left


results = []
try:
    code, total, failing, left = vitest()
    control = {'exit': code, 'testsRun': total, 'failing': failing, 'fixtureEntriesLeft': left}
    print('control', code, total, len(failing), left, flush=True)
    assert code == 0 and total == 19 and not failing and not left
    for mid, meaning, edits, expected in MUTANTS:
        counts = [originals[f].decode().count(old) for f, old, _ in edits]
        record = {'id': mid, 'meaning': meaning, 'edits': [{'file': f, 'old': o, 'new': n} for f, o, n in edits], 'expectedKiller': expected}
        if counts != [1] * len(edits):
            results.append(record | {'outcome': f'FRAGMENT-COUNT-{counts}'})
            print(mid, results[-1]['outcome'], flush=True)
            continue
        try:
            for f, old, new in edits:
                (WT / f).write_text((WT / f).read_text().replace(old, new, 1))
            code, total, failing, left = vitest()
        finally:
            for f in {f for f, _, _ in edits}:
                (WT / f).write_bytes(originals[f])
        hit = [x['test'] for x in failing if any(e in x['test'] for e in expected)]
        outcome = 'killed' if code != 0 and hit else 'SURVIVED'
        results.append(record | {'exit': code, 'testsRun': total, 'failing': failing, 'expectedKillerFailed': hit, 'outcome': outcome})
        print(mid, outcome, code, len(failing), hit, flush=True)
finally:
    for f, b in originals.items():
        (WT / f).write_bytes(b)
    shutil.rmtree(TMP, ignore_errors=True)
    report.unlink(missing_ok=True)
restored = {f: hashlib.sha256((WT / f).read_bytes()).hexdigest() == d for f, d in digests.items()}
assert all(restored.values()), restored
OUT.write_text(json.dumps({'tool': 'my_mutants.py', 'treeCommit': commit, 'sha256AtCommit': digests, 'restoredByteForByte': restored,
                           'command': ' '.join(command[:7]), 'control': control, 'mutants': len(MUTANTS),
                           'killed': sum(r['outcome'] == 'killed' for r in results), 'results': results}, indent=1) + '\n')
print('survivors:', [r['id'] for r in results if r['outcome'] != 'killed'])
