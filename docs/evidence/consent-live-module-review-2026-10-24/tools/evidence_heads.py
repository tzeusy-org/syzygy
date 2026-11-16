"""Print the identity fields of each evidence record (rules 6 and 11), without reading the bulk.

Usage: python3 -I evidence_heads.py <dir>
"""
import json
import os
import re
import sys

d = sys.argv[1]
HEX40 = re.compile(r'^[0-9a-f]{40}$')
HEX64 = re.compile(r'^[0-9a-f]{64}$')


def walk(o, path=''):
    """Yield (path, value) for scalar leaves whose key names a commit, sha, digest or subject."""
    if isinstance(o, dict):
        for k, v in o.items():
            p = f'{path}.{k}'
            if isinstance(v, (dict, list)):
                if k in ('worlds', 'answers', 'workspaceModules', 'modules', 'mismatches', 'results', 'rows'):
                    yield p, f'<{type(v).__name__} len={len(v)}>'
                    continue
                yield from walk(v, p)
            elif re.search(r'commit|sha|digest|subject|head|base|old|new|tree|clean', k, re.I):
                yield p, v
    elif isinstance(o, list):
        for i, v in enumerate(o[:3]):
            yield from walk(v, f'{path}[{i}]')


for name in sorted(os.listdir(d)):
    p = os.path.join(d, name)
    doc = json.load(open(p, encoding='utf8'))
    print('==', name, 'top-level keys:', list(doc.keys()) if isinstance(doc, dict) else type(doc).__name__)
    n = 0
    for path, v in walk(doc):
        s = v if not isinstance(v, str) else (v if len(v) < 120 else v[:117] + '...')
        flag = ''
        if isinstance(v, str) and HEX40.match(v):
            flag = ' [40-hex]'
        elif isinstance(v, str) and HEX64.match(v):
            flag = ' [64-hex]'
        print('  ', path, '=', repr(s), flag)
        n += 1
        if n > 40:
            print('   ...')
            break
