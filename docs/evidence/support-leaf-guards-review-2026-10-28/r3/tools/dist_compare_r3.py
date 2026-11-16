#!/usr/bin/env python3
"""Round 3: build every dist/ from scratch at commit A and at commit B in one clone (`npm run typecheck`, the build), and
compare every emitted file by sha256, test outputs (`*.test.*`) reported apart from the rest.

Usage: dist_compare_r3.py <clone with node_modules> <A> <B> <tmpdir> <out.json>
"""
import hashlib, json, os, shutil, subprocess, sys

clone, A, B, tmpdir, out = sys.argv[1:6]
git = lambda *a: subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True).stdout


def dists():
    return sorted(f'{p}/{n}/dist' for p in ['apps', 'packages'] for n in os.listdir(os.path.join(clone, p))
                  if os.path.isdir(os.path.join(clone, p, n, 'dist')))


def build(commit):
    git('checkout', '-q', '--detach', commit)
    assert git('status', '--porcelain') == ''
    for d in dists():
        shutil.rmtree(os.path.join(clone, d))
    load = open('/proc/loadavg').read().split()[0]
    r = subprocess.run(['npm', 'run', 'typecheck'], cwd=clone, capture_output=True, text=True, env=dict(os.environ, TMPDIR=tmpdir))
    hashes = {}
    for d in dists():
        for root, _, files in os.walk(os.path.join(clone, d)):
            for f in files:
                p = os.path.join(root, f)
                rel = os.path.relpath(p, clone)
                if rel.endswith('.tsbuildinfo'):
                    continue
                hashes[rel] = hashlib.sha256(open(p, 'rb').read()).hexdigest()
    return {'commit': git('rev-parse', 'HEAD').strip(), 'exit': r.returncode, 'load1': load, 'distDirs': len(dists()), 'hashes': hashes}


a, b = build(A), build(B)
test = lambda p: '.test.' in os.path.basename(p)
common = sorted(set(a['hashes']) & set(b['hashes']))
res = {
    'A': {k: a[k] for k in ['commit', 'exit', 'load1', 'distDirs']}, 'B': {k: b[k] for k in ['commit', 'exit', 'load1', 'distDirs']},
    'nonTest': {'A': sum(not test(p) for p in a['hashes']), 'B': sum(not test(p) for p in b['hashes']),
                'identical': sum(not test(p) and a['hashes'][p] == b['hashes'][p] for p in common),
                'differ': [p for p in common if not test(p) and a['hashes'][p] != b['hashes'][p]],
                'onlyA': sorted(p for p in set(a['hashes']) - set(b['hashes']) if not test(p)),
                'onlyB': sorted(p for p in set(b['hashes']) - set(a['hashes']) if not test(p))},
    'test': {'A': sum(test(p) for p in a['hashes']), 'B': sum(test(p) for p in b['hashes']),
             'differ': [p for p in common if test(p) and a['hashes'][p] != b['hashes'][p]],
             'onlyA': sorted(p for p in set(a['hashes']) - set(b['hashes']) if test(p)),
             'onlyB': sorted(p for p in set(b['hashes']) - set(a['hashes']) if test(p))},
    'statusAfter': git('status', '--porcelain'),
}
json.dump(res, open(out, 'w'), indent=2)
print(json.dumps(res, indent=2))
