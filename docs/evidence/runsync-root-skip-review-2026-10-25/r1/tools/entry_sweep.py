#!/usr/bin/env python3
"""rev-525 sweep: which tracked test files reach the daemon entry (apps/syzygy main), and how.

usage: python3 -I entry_sweep.py TREE COMMIT

Population: every tracked *.test.ts / *.test.mjs / *.test.js and packages/cap1-system/src/harness.ts at COMMIT, read from git.
A file is a hit if it names apps/syzygy/(src|dist)/main, calls daemonEntry( or startDaemon(. For each hit it prints whether the
file also carries '--port' or SYZYGY_PORT, and its line count of each."""
import re, subprocess, sys

tree, commit = sys.argv[1], sys.argv[2]
names = [n for n in subprocess.run(['git', 'ls-tree', '-r', '-z', '--name-only', commit], cwd=tree, capture_output=True, check=True)
         .stdout.decode().split('\0') if re.search(r'\.test\.(ts|mjs|js)$', n) or n == 'packages/cap1-system/src/harness.ts']
HIT = re.compile(r'apps/syzygy/(src|dist)/main|daemonEntry\(|startDaemon\(')
print(f'{commit[:8]}: {len(names)} files in the population')
for n in names:
    text = subprocess.run(['git', 'show', f'{commit}:{n}'], cwd=tree, capture_output=True, check=True).stdout.decode()
    hits = [i for i, l in enumerate(text.split('\n'), 1) if HIT.search(l)]
    if hits:
        print(f"{n}: entry lines {hits[:6]}{'…' if len(hits) > 6 else ''}; '--port' lines {text.count(chr(39) + '--port' + chr(39))}; "
              f"SYZYGY_PORT lines {sum('SYZYGY_PORT' in l for l in text.split(chr(10)))}")
