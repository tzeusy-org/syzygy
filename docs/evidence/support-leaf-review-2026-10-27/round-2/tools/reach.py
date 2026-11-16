#!/usr/bin/env python3
"""Static relative-import reachability inside one commit: which of <targets> does each of <roots> reach through
`from './x.js'` / `import './x.js'` / workspace `@syzygy/<pkg>` (to that package's src/index.ts)? Usage: reach.py <repo> <commit> <targets,comma> <root>..."""
import posixpath
import re
import subprocess
import sys

repo, commit, targets, roots = sys.argv[1], sys.argv[2], sys.argv[3].split(','), sys.argv[4:]
g = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True).stdout
names = set(n for n in g('ls-tree', '-r', '--name-only', commit).split('\n') if n)
SPEC = re.compile(r"""(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]""")
WS = {}
for n in names:
    m = re.match(r'^(packages|apps)/([^/]+)/package\.json$', n)
    if m:
        import json
        WS[json.loads(g('show', f'{commit}:{n}'))['name']] = f'{m.group(1)}/{m.group(2)}'


def resolve(frm, spec):
    if spec.startswith('.'):
        p = posixpath.normpath(posixpath.join(posixpath.dirname(frm), spec))
        for cand in (p[:-3] + '.ts' if p.endswith('.js') else p, p + '.ts', p + '/index.ts'):
            if cand in names:
                return cand
        return None
    m = re.match(r'^(@syzygy/[a-z0-9-]+)(/[a-z0-9-]+)?$', spec)
    if m and m.group(1) in WS:
        sub = (m.group(2) or '/index')[1:]
        cand = f'{WS[m.group(1)]}/src/{sub}.ts'
        return cand if cand in names else None
    return None


for root in roots:
    seen, stack, parent = {root}, [root], {}
    while stack:
        f = stack.pop()
        for spec in SPEC.findall(g('show', f'{commit}:{f}')):
            r = resolve(f, spec)
            if r and r not in seen:
                seen.add(r); parent[r] = f; stack.append(r)
    for t in targets:
        if t in seen:
            path, x = [t], t
            while x in parent:
                x = parent[x]; path.append(x)
            print(f'{root} REACHES {t} via ' + ' <- '.join(path))
        else:
            print(f'{root} does not reach {t} ({len(seen)} files reached)')
