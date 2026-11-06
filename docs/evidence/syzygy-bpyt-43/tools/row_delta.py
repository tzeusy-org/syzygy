#!/usr/bin/env python3
"""Rows added, changed and removed between two commits over the test files they differ in: a row is an it/test call; its
identity is its describe path plus title; its body is the text from its own line to the next row or describe line, less trailing blank and // comment lines (a comment above a row belongs to it, not to the row before). A row written once with it.each counts once. Evidence
tool for syzygy-bpyt.4.5, not authority.

usage: python3 -I row_delta.py REPO BASE HEAD
"""
import re, subprocess, sys
repo, base, head = sys.argv[1:4]
git = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True, check=True).stdout
files = [p for p in git('diff', '--name-only', base, head, '--', 'apps', 'packages').split('\n') if re.search(r'\.test\.(ts|mts)$', p)]
ROW = re.compile(r'^\s*(?:it|test)(?:\.each\(.*?\))?\(\s*([\'"`])(.*?)\1')
DESC = re.compile(r'^\s*describe(?:\.each\(.*?\))?\(\s*([\'"`])(.*?)\1')
def rows(text):
    out, stack, cur = {}, [], None
    lines = text.split('\n')
    for l in lines:
        d, r = DESC.match(l), ROW.match(l)
        indent = len(l) - len(l.lstrip())
        if d or r:
            cur = None
            stack = [(i, n) for i, n in stack if i < indent]
        if d: stack.append((indent, d.group(2)))
        elif r:
            cur = ' > '.join([n for _, n in stack] + [r.group(2)]); out[cur] = []
        if cur is not None: out[cur].append(l)
    def trim(v):
        while v and (not v[-1].strip() or v[-1].strip().startswith('//')): v = v[:-1]
        return '\n'.join(v)
    return {k: trim(v) for k, v in out.items()}
tot = {'+': 0, '~': 0, '-': 0}
for f in files:
    a = rows(git('show', f'{base}:{f}')); b = rows(git('show', f'{head}:{f}'))
    add, rem = sorted(set(b) - set(a)), sorted(set(a) - set(b))
    chg = sorted(k for k in set(a) & set(b) if a[k] != b[k])
    tot['+'] += len(add); tot['-'] += len(rem); tot['~'] += len(chg)
    print(f, '+', len(add), '~', len(chg), '-', len(rem))
    for k in add: print('   +', k[:150])
    for k in rem: print('   -', k[:150])
    for k in chg: print('   ~', k[:150])
print(f"Tests: +{tot['+']} ~{tot['~']} -{tot['-']}")
