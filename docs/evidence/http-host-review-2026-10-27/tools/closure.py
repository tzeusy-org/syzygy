#!/usr/bin/env python3
"""Static import closure of an entry module, over source .ts files, following
relative and @syzygy/* imports (static and dynamic string-literal imports).

Usage: closure.py <tree> <entry.ts> [<entry.ts>...]
Prints the workspace packages the closure enters, and its file count per package.
"""
import json
import os
import re
import sys

tree = sys.argv[1]
entries = sys.argv[2:]
IMPORT = re.compile(r"""(?:^|\s)(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|^import\s+['"]([^'"]+)['"]""", re.M | re.S)

pkgs = {}
for top in ('packages', 'apps'):
    for name in os.listdir(os.path.join(tree, top)):
        pj = os.path.join(tree, top, name, 'package.json')
        if os.path.exists(pj):
            data = json.load(open(pj))
            pkgs[data['name']] = (os.path.join(top, name), data.get('exports', {}))


def resolve_pkg(spec):
    for name, (root, exports) in pkgs.items():
        if spec == name or spec.startswith(name + '/'):
            sub = '.' + spec[len(name):]
            target = exports.get(sub) if isinstance(exports, dict) else None
            if isinstance(target, dict):
                target = target.get('import') or target.get('default')
            if target is None:
                return None
            src = target.replace('./dist/', 'src/').replace('.js', '.ts')
            return os.path.join(root, src)
    return None


seen = set()
stack = list(entries)
while stack:
    f = stack.pop()
    if f in seen or not os.path.exists(os.path.join(tree, f)):
        continue
    seen.add(f)
    text = open(os.path.join(tree, f), encoding='utf-8').read()
    for m in IMPORT.finditer(text):
        spec = m.group(1) or m.group(2) or m.group(3)
        if spec.startswith('.'):
            cand = os.path.normpath(os.path.join(os.path.dirname(f), spec))
            if cand.endswith('.js'):
                cand = cand[:-3] + '.ts'
            stack.append(cand)
        elif spec.startswith('@syzygy/'):
            r = resolve_pkg(spec)
            if r:
                stack.append(r)
            else:
                print('unresolved', spec, 'in', f)

count = {}
for f in seen:
    key = '/'.join(f.split('/')[:2])
    count[key] = count.get(key, 0) + 1
print(json.dumps(dict(sorted(count.items())), indent=1))
print('files', len(seen))
