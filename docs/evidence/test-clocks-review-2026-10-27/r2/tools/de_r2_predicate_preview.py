#!/usr/bin/env python3
"""rev-532b: preview each de_r2_mutants.py mutant against a Python transcription of the kept text row's predicate
(packages/cap1-system/src/daemon-entry-unchanged.system.test.ts:245-260 at 9e00252a). Reviewer tool, not authority; the
real outcomes come from de_r2_mutants.py running vitest. usage: python3 -I de_r2_predicate_preview.py TREE MUTANTS_TOOL"""
import os, sys
tree, tool = os.path.abspath(sys.argv[1]), sys.argv[2]
src = open(tool, encoding='utf8').read()
sys.argv = [tool, tree, 'x', 'y', '/dev/null']
ns = {}
exec(compile(src[: src.index('def build():')], tool, 'exec'), ns)
def predicate(text):
    lines = text.split('\n')
    blocks = []
    for opening in ["  if (argv[0] === 'dossier') {", "  if (argv[0] === 'polaris') {"]:
        o = lines.index(opening) if opening in lines else -1
        c = -1
        if o != -1:
            c = next((i for i in range(o + 1, len(lines)) if lines[i] == '  }'), -1)
        blocks.append((o, c))
    d = lines.index('  let parsed = parseCli(process.argv.slice(2), process.env);') if '  let parsed = parseCli(process.argv.slice(2), process.env);' in lines else -1
    for o, c in blocks:
        if not o > -1: return f'fail: open {o}'
        if not c > o: return f'fail: close {c} <= open {o}'
        if not d > c: return f'fail: daemon {d} <= close {c}'
    naming = [i for i, t in enumerate(lines) if 'three-surface-poc-app' in t]
    if not naming: return 'fail: no naming line'
    out = [lines[i] for i in naming if not any(o < i < c for o, c in blocks)]
    return 'pass' if not out else f'fail: outside {out}'
base = open(os.path.join(tree, ns['MAIN']), encoding='utf8').read()
for m in ns['MUTANTS']:
    if m is None: print('control', predicate(base)); continue
    n = base.count(m['old'])
    print(m['id'], m['kind'], f'old x{n}', predicate(base.replace(m['old'], m['new'])) if n == 1 else 'SKIP')
