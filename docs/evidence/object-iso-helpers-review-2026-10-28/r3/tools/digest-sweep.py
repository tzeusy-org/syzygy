#!/usr/bin/env python3
"""Round-3 reviewer re-derivation of digest-citers-repair2.json for PR #548: sha256 and git blob id (full and first twelve) of
AGENTS.md and authority-artifact-fields.test.ts at 4d92ac95 and at the head; cited by any tracked file at the head outside
docs/evidence/syzygy-bpyt-6-3-iso/? Method one: Python, case-folded, over every blob from `git cat-file --batch`; method two:
`git grep -F -i -l` per needle. Usage: digest-sweep.py <clone at the head>"""
import hashlib, json, subprocess, sys

repo = sys.argv[1]
git = lambda *a, **k: subprocess.run(['git', '-C', repo, *a], capture_output=True, check=True, **k).stdout
FILES = ['AGENTS.md', 'packages/three-surface-poc-core/src/authority-artifact-fields.test.ts']
EXCL = 'docs/evidence/syzygy-bpyt-6-3-iso/'
digests, needles = [], set()
for at in ('4d92ac95', 'HEAD'):
    for p in FILES:
        b = git('show', f'{at}:{p}')
        s, blob = hashlib.sha256(b).hexdigest(), git('rev-parse', f'{at}:{p}').decode().strip()
        digests.append({'path': p, 'at': at, 'sha256': s, 'gitBlob': blob})
        needles |= {s, s[:12], blob, blob[:12]}
paths = [p for p in git('ls-files', '-z').decode().split('\0') if p and not p.startswith(EXCL)]
inp = ''.join(f'HEAD:{p}\n' for p in paths).encode()
data = subprocess.run(['git', '-C', repo, 'cat-file', '--batch'], input=inp, capture_output=True, check=True).stdout
hits1, pos, i = {}, 0, 0
while pos < len(data):
    nl = data.index(b'\n', pos)
    hdr = data[pos:nl].split()
    if hdr[-1] == b'missing':
        pos = nl + 1; i += 1; continue
    size = int(hdr[2]); body = data[nl + 1:nl + 1 + size].lower(); pos = nl + 1 + size + 1
    for n in needles:
        if n.encode() in body:
            hits1.setdefault(n, []).append(paths[i])
    i += 1
hits2 = {}
for n in needles:
    r = subprocess.run(['git', '-C', repo, 'grep', '-F', '-i', '-l', n, 'HEAD', '--', '.', f':(exclude){EXCL}'], capture_output=True, text=True)
    fs = [l.split(':', 1)[1] for l in r.stdout.splitlines()]
    if fs:
        hits2[n] = fs
print(json.dumps({'head': git('rev-parse', 'HEAD').decode().strip(), 'population': len(paths), 'blobsRead': i, 'needles': len(needles), 'digests': digests,
                  'method1Hits': hits1, 'method2Hits': hits2, 'methodsAgree': {k: sorted(v) for k, v in hits1.items()} == {k: sorted(v) for k, v in hits2.items()}}, indent=1))
