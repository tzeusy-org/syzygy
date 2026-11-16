#!/usr/bin/env python3
"""Every citation of a packages/cap1-daemon/src path in tracked files at a commit,
and whether each cited path resolves at that commit.

Usage: citations.py <repo> <commit>
Method 1: regex cap1-daemon/src/[A-Za-z0-9_.-]+ over every tracked text file, plus a
wrapped-form pass (a line ending in 'cap1-daemon/' or 'cap1-daemon/src/' or
'cap1-daemon/src' joined to the next line's leading token).
Method 2: for each file under cap1-daemon/src at the base commit, its basename near the
token 'cap1-daemon' (same or previous line), to catch 'cap1-daemon ... `server.ts`' forms.
"""
import re
import subprocess
import sys
from collections import defaultdict

repo, commit = sys.argv[1:3]
base = sys.argv[3] if len(sys.argv) > 3 else None


def git(*a):
    return subprocess.run(['git', '-C', repo, *a], capture_output=True, check=True).stdout


paths = [p.decode() for p in git('ls-tree', '-r', '-z', '--name-only', commit).split(b'\0') if p]
pset = set(paths)
dirs = {'/'.join(p.split('/')[:i]) for p in paths for i in range(1, p.count('/') + 1)}

# Batch-read blobs
proc = subprocess.run(['git', '-C', repo, 'cat-file', '--batch'], input=''.join(f'{commit}:{p}\n' for p in paths).encode(),
                      capture_output=True, check=True)
data = proc.stdout
i = 0
bodies = {}
for p in paths:
    nl = data.index(b'\n', i)
    header = data[i:nl].split()
    size = int(header[2])
    body = data[nl + 1: nl + 1 + size]
    i = nl + 1 + size + 1
    if b'\0' in body[:8000]:
        continue
    bodies[p] = body.decode('utf-8', 'replace')

TOK = re.compile(r'cap1-daemon/src/[A-Za-z0-9_.-]+')
cites = defaultdict(set)
files = set()
for p, text in bodies.items():
    for m in TOK.finditer(text):
        tok = m.group(0).rstrip('.')
        cites[tok].add(p)
        files.add(p)
    lines = text.split('\n')
    for a, b in zip(lines, lines[1:]):
        if re.search(r'cap1-daemon/?(src/?)?$', a.rstrip('`').rstrip()):
            head_tok = re.match(r'\s*[`>]*\s*([A-Za-z0-9_./-]+)', b)
            if head_tok:
                joined = re.search(r'cap1-daemon/?(src/?)?$', a.rstrip('`').rstrip()).group(0) + head_tok.group(1)
                joined = joined.replace('cap1-daemonsrc', 'cap1-daemon/src')
                cites['WRAPPED:' + joined].add(p)

print(f'tracked files {len(paths)}; text files read {len(bodies)}; files citing cap1-daemon/src/<name>: {len(files)}')
print(f'distinct cited tokens: {len(cites)}')
for tok in sorted(cites):
    raw = tok[len('WRAPPED:'):] if tok.startswith('WRAPPED:') else tok
    full = 'packages/' + raw[raw.index('cap1-daemon'):]
    ok = full in pset or full.rstrip('/') in dirs
    gov = sorted(f for f in cites[tok] if f.startswith(('.syzygy/', 'openspec/')))
    print(f'{"OK " if ok else "NO "} {tok}  files={len(cites[tok])} governed={gov}')

if base:
    bpaths = [p.decode() for p in git('ls-tree', '-r', '-z', '--name-only', base, 'packages/cap1-daemon/src').split(b'\0') if p]
    print(f'\nmethod 2: base cap1-daemon/src files {len(bpaths)}')
    for bp in bpaths:
        name = bp.rsplit('/', 1)[1]
        hits = []
        for p, text in bodies.items():
            lines = text.split('\n')
            for n, line in enumerate(lines):
                if name in line and ('cap1-daemon' in line or (n and 'cap1-daemon' in lines[n - 1])):
                    if f'cap1-daemon/src/{name}' not in line:
                        hits.append(f'{p}:{n + 1}')
        resolves = f'packages/cap1-daemon/src/{name}' in pset
        if hits:
            print(f'{name} resolves={resolves} near-cap1-daemon non-path mentions={len(hits)}: {hits[:8]}')
