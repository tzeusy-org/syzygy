#!/usr/bin/env python3
"""Reviewer's extra rule-6 mutants (rev-509) over test-model-fixture.ts, run against its test file alone.

Usage: my_mutants.py <clone> <out.json> <private-tmpdir under /tmp/r509->
Each mutant replaces one fragment (must occur exactly once), runs the test file under TMPDIR=<private>,
and restores the bytes (sha256 checked). Killed = the test file exits non-zero.
"""
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys

CLONE, OUT, TMP = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
assert str(TMP).startswith('/tmp/r509-'), TMP
SRC = CLONE / 'apps/three-surface-poc/src/test-model-fixture.ts'
TEST = 'apps/three-surface-poc/src/test-model-fixture.test.ts'
FIXED = '/tmp/r509-9'
MUTANTS = [
    ('fixed-directory-not-tmpdir', 'the sweep reads one fixed directory instead of the run TMPDIR',
     'removeFixturesOfDeadProcesses(directory: string = tmpdir())', f"removeFixturesOfDeadProcesses(directory: string = '{FIXED}')"),
    ('only-eperm-means-alive', 'any kill error but EPERM counts as dead (an out-of-range pid is swept)',
     "return (error as NodeJS.ErrnoException).code !== 'ESRCH';", "return (error as NodeJS.ErrnoException).code === 'EPERM';"),
    ('removal-not-recursive', 'removal drops recursive, so a directory is never removed (error swallowed)',
     'rmSync(join(directory, name), { recursive: true, force: true });', 'rmSync(join(directory, name), { force: true });'),
    ('copies-unmatched', 'only template names are swept',
     '(?:template-)?p(\\d+)-/;', 'template-p(\\d+)-/;'),
]
original = SRC.read_bytes()
digest = hashlib.sha256(original).hexdigest()
commit = subprocess.run(['git', '-C', str(CLONE), 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()


def run():
    shutil.rmtree(TMP, ignore_errors=True)
    TMP.mkdir(parents=True)
    shutil.rmtree(FIXED, ignore_errors=True)
    os.mkdir(FIXED)
    proc = subprocess.run(['npx', 'vitest', 'run', TEST, '--project', '@syzygy/three-surface-poc-app'], cwd=CLONE,
                          env={**os.environ, 'TMPDIR': str(TMP)}, capture_output=True, text=True)
    lines = [l.strip() for l in (proc.stdout + proc.stderr).splitlines() if ('Tests ' in l and ('passed' in l or 'failed' in l)) or l.strip().startswith('FAIL') or l.strip().startswith('×')]
    return proc.returncode, lines[:12]


results = []
try:
    code, lines = run()
    control = {'exit': code, 'lines': lines}
    assert code == 0, control
    for ident, meaning, old, new in MUTANTS:
        text = original.decode()
        if text.count(old) != 1:
            results.append({'id': ident, 'old': old, 'new': new, 'outcome': f'FRAGMENT-COUNT-{text.count(old)}'})
            continue
        SRC.write_text(text.replace(old, new, 1))
        try:
            code, lines = run()
        finally:
            SRC.write_bytes(original)
        results.append({'id': ident, 'meaning': meaning, 'old': old, 'new': new, 'exit': code, 'outcome': 'killed' if code else 'SURVIVED', 'lines': lines})
finally:
    SRC.write_bytes(original)
    shutil.rmtree(TMP, ignore_errors=True)
    shutil.rmtree(FIXED, ignore_errors=True)
assert hashlib.sha256(SRC.read_bytes()).hexdigest() == digest
OUT.write_text(json.dumps({'tool': 'my_mutants.py', 'treeCommit': commit, 'helperSha256': digest, 'control': control, 'results': results}, indent=1) + '\n')
print(json.dumps({'control': control, 'results': [{k: r.get(k) for k in ('id', 'outcome', 'exit', 'lines')} for r in results]}, indent=1))
