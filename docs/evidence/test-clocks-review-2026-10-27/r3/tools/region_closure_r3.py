#!/usr/bin/env python3
"""rev-532c (round 3): the static import closure of each module under a CPU-bounded region, at a commit, and which of its
files differ from each separation's tree. Reviewer tool, not authority. Follows relative imports and the @syzygy/support
alias (the one workspace import the three modules reach), from `git show` bytes; type-only imports are included (an
over-approximation).

usage: python3 -I region_closure_r3.py TREE EV SEP_TREE... > OUT.json
"""
import json, os, re, subprocess, sys
tree, ev, seps = sys.argv[1], sys.argv[2], sys.argv[3:]
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True).stdout
ROOTS = {'EDGE_TRIM_CPU_MS': 'packages/polaris-generation-core/src/dossier-profile.ts', 'HOSTILE_LINE_CPU_MS': 'packages/polaris-generation-core/src/excerpt.ts',
         'TAG_SCAN_CPU_MS': 'packages/three-surface-poc-core/src/test-artifact-verification.ts', 'ATTRIBUTE_SCAN_CPU_MS': 'packages/three-surface-poc-core/src/test-artifact-verification.ts'}
ALIAS = {'@syzygy/support': 'packages/support/src/index.ts'}
SPEC = re.compile(r"""(?:from|import)\s*\(?\s*['"]([^'"]+)['"]""")
def closure(root):
    seen, todo = set(), [root]
    while todo:
        f = todo.pop()
        if f in seen: continue
        seen.add(f)
        for s in SPEC.findall(git('show', f'{ev}:{f}')):
            if s.startswith('.'):
                todo.append(os.path.normpath(os.path.join(os.path.dirname(f), s)).replace('.js', '.ts'))
            elif s in ALIAS: todo.append(ALIAS[s])
            elif s.startswith('@syzygy/'): seen.add('UNFOLLOWED ' + s)
    return sorted(seen)
out = {}
for bound, root in ROOTS.items():
    files = closure(root)
    out[bound] = {'root': root, 'closure': files, 'differs': {s: [f for f in files if not f.startswith('UNFOLLOWED') and git('diff', '--name-only', s, ev, '--', f).strip()] for s in seps}}
print(json.dumps(out, indent=1))
