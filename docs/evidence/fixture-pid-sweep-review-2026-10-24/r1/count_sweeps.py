#!/usr/bin/env python3
"""Count how many times one app-project run sweeps its TMPDIR (rev-509). Instrumented tree, restored after.

Usage: count_sweeps.py <clone> <private-tmpdir under /tmp/r509-> <log path>
"""
import collections
import hashlib
import os
import pathlib
import shutil
import subprocess
import sys

CLONE, TMP, LOG = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
assert str(TMP).startswith('/tmp/r509-'), TMP
SRC = CLONE / 'apps/three-surface-poc/src/test-model-fixture.ts'
original = SRC.read_bytes()
digest = hashlib.sha256(original).hexdigest()
text = original.decode()
IMPORT_OLD = "import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';"
IMPORT_NEW = "import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';"
HEAD_OLD = 'export function removeFixturesOfDeadProcesses(directory: string = tmpdir()): void {\n'
HEAD_NEW = HEAD_OLD + "  appendFileSync(process.env.REV509_SWEEP_LOG ?? '/dev/null', `${process.pid} ${directory}\\n`);\n"
assert text.count(IMPORT_OLD) == 1 and text.count(HEAD_OLD) == 1
shutil.rmtree(TMP, ignore_errors=True)
TMP.mkdir(parents=True)
LOG.unlink(missing_ok=True)
SRC.write_text(text.replace(IMPORT_OLD, IMPORT_NEW, 1).replace(HEAD_OLD, HEAD_NEW, 1))
try:
    proc = subprocess.run(['npx', 'vitest', 'run', '--project', '@syzygy/three-surface-poc-app', '--reporter=dot'], cwd=CLONE,
                          env={**os.environ, 'TMPDIR': str(TMP), 'REV509_SWEEP_LOG': str(LOG)}, capture_output=True, text=True)
finally:
    SRC.write_bytes(original)
assert hashlib.sha256(SRC.read_bytes()).hexdigest() == digest
rows = [line.split(' ', 1) for line in LOG.read_text().splitlines()] if LOG.exists() else []
by_dir = collections.Counter('run TMPDIR' if d == str(TMP) else 'other (unit-test private dirs)' for _, d in rows)
pids = {p for p, d in rows if d == str(TMP)}
print('exit', proc.returncode)
print([l for l in proc.stdout.splitlines() if 'Test Files' in l or 'Tests ' in l])
print('sweep calls by directory:', dict(by_dir))
print('distinct processes sweeping the run TMPDIR:', len(pids))
print('fixture entries left:', sorted(p.name for p in TMP.iterdir() if p.name.startswith('syzygy-poc-surface-fixture-')))
