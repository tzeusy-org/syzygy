#!/usr/bin/env python3
"""rev-525 sweep: every chmod / mode literal in the tracked files of packages/cap1-system at a commit.

usage: python3 -I mode_sweep.py TREE COMMIT

Reads blobs from git (never the worktree). Reports, per tracked file, each line that calls chmod (any spelling: chmodSync,
chmod, fchmod, fs.chmod, promises.chmod) or carries a mode literal 0o000/0o0+/0000/'000'/"000", plus every skipIf and
getuid line. The denominator is the tracked-file count printed first."""
import re, subprocess, sys

tree, commit = sys.argv[1], sys.argv[2]
names = subprocess.run(['git', 'ls-tree', '-r', '-z', '--name-only', commit, '--', 'packages/cap1-system'], cwd=tree,
                       capture_output=True, check=True).stdout.decode().split('\0')
names = [n for n in names if n]
CHMOD = re.compile(r'\bf?chmod(Sync)?\s*\(')
MODE000 = re.compile(r"\b0o0+\b|\b0000\b|['\"]000['\"]")
SKIP = re.compile(r'skipIf|getuid|\.skip\(|it\.skip|describe\.skip')
print(f'commit {commit}: {len(names)} tracked files under packages/cap1-system')
totals = {'chmod': 0, 'mode000': 0, 'skip': 0}
for name in names:
    text = subprocess.run(['git', 'show', f'{commit}:{name}'], cwd=tree, capture_output=True, check=True).stdout.decode()
    for number, line in enumerate(text.split('\n'), 1):
        kinds = [k for k, rx in (('chmod', CHMOD), ('mode000', MODE000), ('skip', SKIP)) if rx.search(line)]
        for k in kinds: totals[k] += 1
        if kinds: print(f"{name}:{number}: [{','.join(kinds)}] {line.strip()[:150]}")
print('totals (lines)', totals)
