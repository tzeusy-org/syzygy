#!/usr/bin/env python3
"""Compare every built dist/ file of two clones, excluding test outputs (`.test.`), testkits, source maps and tsbuildinfo.
Usage: dist_compare.py <clone A> <clone B>"""
import os
import sys

def files(clone):
    out = {}
    for root in ['packages', 'apps']:
        for pkg in sorted(os.listdir(os.path.join(clone, root))):
            d = os.path.join(clone, root, pkg, 'dist')
            for dp, _, fs in os.walk(d):
                for f in fs:
                    rel = os.path.relpath(os.path.join(dp, f), clone)
                    if '.test.' in rel or 'testkit' in rel or rel.endswith(('.map', '.tsbuildinfo')):
                        continue
                    out[rel] = open(os.path.join(dp, f), 'rb').read()
    return out

a, b = files(sys.argv[1]), files(sys.argv[2])
common = sorted(set(a) & set(b))
print('A files', len(a), 'B files', len(b), 'common', len(common), 'identical', sum(a[k] == b[k] for k in common),
      'differ', [k for k in common if a[k] != b[k]], 'A only', sorted(set(a) - set(b)), 'B only', sorted(set(b) - set(a)))
