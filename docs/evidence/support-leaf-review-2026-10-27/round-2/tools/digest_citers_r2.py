#!/usr/bin/env python3
"""Is any file the subject changes cited by digest? For every path changed between <base> and <head> that exists at <base>:
the sha256 of its base blob and its git blob id, each searched as any 12..64-hex prefix among the standalone lowercase hex
tokens of every tracked file at <scan> (one or more commits). Hits are grouped by the citer's top directory.
Usage: digest_citers_r2.py <repo> <base> <head> <scan commit>..."""
import hashlib
import json
import re
import subprocess
import sys

repo, base, head, scans = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
g = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, check=True).stdout
changed = [n for n in g('diff', '--name-only', '-z', base, head).decode().split('\0') if n]
ids = {}
for p in changed:
    r = subprocess.run(['git', '-C', repo, 'rev-parse', '--verify', '-q', f'{base}:{p}'], capture_output=True, text=True)
    if r.returncode:
        continue
    ids[p] = {'sha256': hashlib.sha256(g('cat-file', 'blob', f'{base}:{p}')).hexdigest(), 'blob': r.stdout.strip()}
HEX = re.compile(rb'(?<![0-9a-fA-F])[0-9a-f]{12,64}(?![0-9a-fA-F])')
out = {'base': base, 'head': head, 'changedPaths': len(changed), 'changedPathsExistingAtBase': len(ids), 'scans': []}
for scan in scans:
    names = [n for n in g('ls-tree', '-r', '-z', '--name-only', scan).decode().split('\0') if n]
    blobs = g('cat-file', '--batch', ) if False else None
    tokens = {}
    batch = subprocess.run(['git', '-C', repo, 'cat-file', '--batch'], input=''.join(f'{scan}:{n}\n' for n in names).encode(), capture_output=True, check=True).stdout
    pos = 0
    for n in names:
        nl = batch.index(b'\n', pos)
        header = batch[pos:nl].split()
        size = int(header[2]) if len(header) == 3 else 0
        data = batch[nl + 1:nl + 1 + size]
        pos = nl + 1 + size + 1
        for m in HEX.finditer(data):
            tokens.setdefault(m.group(0).decode(), set()).add(n)
    hits = []
    for p, d in ids.items():
        for kind, full in d.items():
            for length in range(12, len(full) + 1):
                tok = full[:length]
                if tok in tokens:
                    hits.append({'file': p, 'kind': kind, 'prefixLength': length, 'citers': sorted(tokens[tok])})
    by_top = {}
    for h in hits:
        for c in h['citers']:
            top = c.split('/')[0] if '/' in c else c
            top = '/'.join(c.split('/')[:2]) if top in ('.syzygy', 'docs') else top
            by_top[top] = by_top.get(top, 0) + 1
    out['scans'].append({'scan': scan, 'trackedFiles': len(names), 'distinctHexTokens': len(tokens), 'hits': len(hits),
                         'citerHitsByTop': dict(sorted(by_top.items())), 'hitRows': hits})
print(json.dumps(out, indent=1))
