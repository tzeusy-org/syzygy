#!/usr/bin/env python3
"""Run safety_probe.mjs against a dist built from the head with own-profile-check-follows-profile applied.

Usage: python3 -I mutant_dist_probe.py <worktree at the head> <safety_probe.mjs> <out.json> <private TMPDIR>
Shows that the surviving mutant is not equivalent: with it, case P1a (a symlinked profile answered as another
owner) removes the victim. Restores the source, rebuilds, and checks the source digest.
"""
import hashlib
import os
import pathlib
import shutil
import subprocess
import sys

wt, probe, out, tmp = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3], pathlib.Path(sys.argv[4])
src = wt / 'apps/three-surface-poc/src/cdp-browser.ts'
original = src.read_bytes()
digest = hashlib.sha256(original).hexdigest()
edits = [
    ("import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, statSync, type BigIntStats } from 'node:fs';",
     "import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, statSync, type BigIntStats } from 'node:fs';"),
    ("    if (!ownedByRunningUser(lstat(profile)) || !ownedByRunningUser(lstat(link))) return undefined;\n",
     "    if (!ownedByRunningUser(lstat(realpathSync(profile))) || !ownedByRunningUser(lstat(link))) return undefined;\n"),
]
build = lambda: subprocess.run(['npx', 'tsc', '-b', 'apps/three-surface-poc'], cwd=wt, capture_output=True, text=True)
text = original.decode()
for old, new in edits:
    assert text.count(old) == 1, old
    text = text.replace(old, new)
try:
    src.write_text(text)
    b = build()
    assert b.returncode == 0, b.stdout + b.stderr
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir()
    p = subprocess.run(['node', probe, str(wt / 'apps/three-surface-poc/dist/cdp-browser.js'), out, '0'],
                       env=dict(os.environ, TMPDIR=str(tmp)), capture_output=True, text=True)
    print(p.stdout[-1500:], p.stderr[-800:])
finally:
    src.write_bytes(original)
    rb = build()
    shutil.rmtree(tmp, ignore_errors=True)
print('restored', hashlib.sha256(src.read_bytes()).hexdigest() == digest, 'rebuilt exit', rb.returncode)
