#!/usr/bin/env python3
"""Names stored but never loaded, per function scope and at module level (closures counted as loads of the enclosing scope), by
the ast. A second method beside grep for the round-4 dead-line question. usage: dead_names.py FILE..."""
import ast, sys


def scope_report(tree):
    out = []
    scopes = [('<module>', tree)] + [(n.name, n) for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.Lambda)) and hasattr(n, 'name')]
    for name, node in scopes:
        own = [n for n in ast.walk(node)]
        stores = {}
        for n in own:
            if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store): stores.setdefault(n.id, n.lineno)
        loads = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load)}
        # a store is dead only if no Load of that id exists anywhere after its line in this scope's subtree
        for ident, line in sorted(stores.items(), key=lambda kv: kv[1]):
            later = [n for n in own if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load) and n.id == ident]
            if not later and (name != '<module>' or ident not in loads):
                out.append((name, ident, line))
    return out


for path in sys.argv[1:]:
    tree = ast.parse(open(path, encoding='utf8').read())
    dead = sorted(set(scope_report(tree)), key=lambda t: t[2])
    print(f'{path}: {len(dead)} stored-never-loaded names: {dead}')
