#!/usr/bin/env python3
"""Round 3: read W5, W6 and W7's edits out of round 2's tools/r2_mutants.py and out of the lane's committed tools/mutants.py
(at a given commit), by AST, never by retyping, and compare them. Each edit is (path, old, new) with module-level string
constants resolved. Also counts each `old` in the purity test file at that commit (it must occur exactly once).

Usage: fragments_r3.py <clone> <commit> <r2_mutants.py> <out.json>
"""
import ast, hashlib, json, subprocess, sys

clone, commit, r2_path, out = sys.argv[1:5]
IDS = ('W5-', 'W6-', 'W7-')


def consts(tree):
    env = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            try:
                env[node.targets[0].id] = ast.literal_eval(node.value)
            except Exception:
                pass
    return env


def val(node, env):
    if isinstance(node, ast.Name):
        return env[node.id]
    return ast.literal_eval(node)


def rows(source, fn_names, fallback=None):
    tree = ast.parse(source)
    # r2_mutants.py takes PURITY from the lane's module (`PURITY, ... = lane.PURITY, ...`): resolve a missing name from the
    # lane's own constants.
    env = {**(fallback or {}), **consts(tree)}
    found = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Tuple) and node.elts and isinstance(node.elts[0], ast.Constant) \
                and isinstance(node.elts[0].value, str) and node.elts[0].value.startswith(IDS):
            rid = node.elts[0].value
            edits = []
            for sub in ast.walk(node):
                if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name) and sub.func.id in fn_names:
                    edits.append({'path': val(sub.args[0], env), 'old': val(sub.args[1], env), 'new': val(sub.args[2], env)})
            tail = [ast.unparse(e) for e in node.elts[1:]]
            found[rid] = {'edits': edits, 'tupleOtherFields': tail}
    return found


r2_src = open(r2_path, encoding='utf8').read()
lane_src = subprocess.run(['git', '-C', clone, 'show', f'{commit}:docs/evidence/syzygy-bpyt-6-14/tools/mutants.py'],
                          check=True, capture_output=True, text=True).stdout
r2 = {k: v for k, v in rows(r2_src, {'e'}, consts(ast.parse(lane_src))).items() if not k.startswith('W5V12')}
lane = rows(lane_src, {'edit'})
purity = subprocess.run(['git', '-C', clone, 'show', f'{commit}:packages/support/src/support-purity.test.ts'],
                        check=True, capture_output=True, text=True).stdout
res = {'commit': commit, 'r2Sha256': hashlib.sha256(r2_src.encode()).hexdigest(),
       'laneMutantsSha256': hashlib.sha256(lane_src.encode()).hexdigest(), 'rows': {}}
for rid in sorted(set(r2) | set(lane)):
    a, b = r2.get(rid), lane.get(rid)
    res['rows'][rid] = {
        'inR2': a is not None, 'inLane': b is not None,
        'editsEqual': a is not None and b is not None and a['edits'] == b['edits'],
        'edits': (b or a)['edits'],
        'oldCountInPurity': [purity.count(e['old']) for e in (b or a)['edits']],
        'laneOtherFields': b and b['tupleOtherFields'],
        'r2OtherFields': a and a['tupleOtherFields'],
    }
json.dump(res, open(out, 'w'), indent=2)
print(json.dumps(res, indent=2))
