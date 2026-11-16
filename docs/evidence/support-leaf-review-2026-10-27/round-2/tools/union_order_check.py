#!/usr/bin/env python3
"""Is the package.json resolution of the merge the union of both sides' intent, in a workable build order?
Usage: union_order_check.py <repo> <merge> <ours> <theirs> <base>
For build, build:poc and typecheck: the project list at each of the four commits; the union check (set equality, no
duplicates, each side's order kept as a subsequence); and, per project in the merged list, every workspace package it
imports in its own non-test src (by `from '@syzygy/<x>'`), its package.json dependencies and its tsconfig references,
with whether each imported workspace package appears earlier in the list and is referenced by tsconfig."""
import json
import re
import subprocess
import sys

repo, merge, ours, theirs, base = sys.argv[1:6]
g = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True, check=True).stdout
SCRIPTS = ('build', 'build:poc', 'typecheck')


def lists(commit):
    s = json.loads(g('show', f'{commit}:package.json'))['scripts']
    return {k: [w for w in s[k].split() if '/' in w] for k in SCRIPTS}


def subseq(small, big):
    it = iter(big)
    return all(x in it for x in small)


L = {c: lists(c) for c in (merge, ours, theirs, base)}
union = {}
for k in SCRIPTS:
    m, o, t = L[merge][k], L[ours][k], L[theirs][k]
    union[k] = {'merge': m, 'setEqualsUnion': set(m) == set(o) | set(t), 'noDuplicates': len(m) == len(set(m)),
                'oursOrderKept': subseq(o, m), 'theirsOrderKept': subseq(t, m),
                'addedByOurs': sorted(set(o) - set(L[base][k])), 'addedByTheirs': sorted(set(t) - set(L[base][k])),
                'lostFromEitherSide': sorted((set(o) | set(t)) - set(m))}
name_of = {}
for proj in sorted(set(sum((L[merge][k] for k in SCRIPTS), []))):
    name_of[json.loads(g('show', f'{merge}:{proj}/package.json'))['name']] = proj
names = [n for n in g('ls-tree', '-r', '--name-only', merge).split('\n') if n]
graph = {}
for proj in sorted(name_of.values()):
    pj = json.loads(g('show', f'{merge}:{proj}/package.json'))
    deps = sorted(k for k in {**pj.get('dependencies', {}), **pj.get('devDependencies', {})} if k.startswith('@syzygy/'))
    ts = json.loads(re.sub(r'//[^\n]*', '', g('show', f'{merge}:{proj}/tsconfig.json')))
    refs = sorted(r['path'] for r in ts.get('references', []))
    imported = set()
    for n in names:
        if n.startswith(proj + '/src/') and n.endswith('.ts') and not re.search(r'\.(test|browser\.test)\.ts$|\.testkit\.ts$', n):
            for m in re.finditer(r"""from\s+['"](@syzygy/[a-z0-9-]+)""", g('show', f'{merge}:{n}')):
                imported.add(m.group(1))
    graph[proj] = {'name': pj['name'], 'imports': sorted(imported), 'dependencies': deps, 'references': refs}
import posixpath


def proj_ref_target(proj, ref):
    return posixpath.normpath(posixpath.join(proj, ref))


order = {}
for k in SCRIPTS:
    rows = []
    for i, proj in enumerate(L[merge][k]):
        for imp in graph[proj]['imports']:
            target = name_of.get(imp)
            rows.append({'project': proj, 'imports': imp, 'target': target,
                         'targetInList': (target in L[merge][k]) if target else None,
                         'targetEarlier': (target in L[merge][k] and L[merge][k].index(target) < i) if target else None,
                         'declaredDependency': imp in graph[proj]['dependencies'],
                         'tsconfigReference': any(proj_ref_target(proj, r) == target for r in graph[proj]['references']) if target else None})
    order[k] = rows
problems = {k: [r for r in order[k] if r['target'] and not (r['targetEarlier'] and r['declaredDependency'] and r['tsconfigReference'])] for k in SCRIPTS}
print(json.dumps({'union': union, 'graph': graph, 'edgesPerScript': {k: len(v) for k, v in order.items()}, 'edgesNotEarlierOrUndeclared': problems}, indent=1))
