#!/usr/bin/env python3
"""Are the round-1 evidence commits code-identical to the code commit, and what does the last merge bring?

Usage: evidence_commits.py <repo>
"""
import subprocess
import sys

repo = sys.argv[1]
CODE = 'bcd39b4e88a3da042f26899d439c074b020e1f4c'
HEAD = '6dcf94906b2989345f5b03dfeaa2d64c56632886'
BASE = '3ec6929951080613b3c5cb7205fe303c5449be58'
PATHS = ['apps', 'packages', 'scripts', 'vitest.config.ts', 'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.base.json']
EV = 'docs/evidence/chrome-singleton-leak-2026-10-22/'
git = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True, check=True).stdout
for c in ['3fad24d4', '0410e3cd', '42baf076', '9cfa7cd0', 'b15f1a91', '6dcf9490']:
    changed = [p for p in git('diff', '--name-only', CODE, c, '--', *PATHS).split('\n') if p]
    anc = subprocess.run(['git', '-C', repo, 'merge-base', '--is-ancestor', c, HEAD]).returncode == 0
    print(f'{c}: files under code paths differing from {CODE[:8]}: {len(changed)}; ancestor of head: {anc}')
    if c == '6dcf9490':
        mainside = [p for p in git('diff', '--name-only', 'df6046a153fe130202abdf6bd3045a79ba143879', BASE, '--', *PATHS).split('\n') if p]
        print(f'   of those, also changed by main df6046a1..3ec69299: {len(set(changed) & set(mainside))}; not: {sorted(set(changed) - set(mainside))}')
for a, b in [('df6046a153fe130202abdf6bd3045a79ba143879', 'b15f1a9137b1e9478b3c2646862c418795fa31d8'), (BASE, HEAD)]:
    files = [p for p in git('diff', '--name-only', a, b).split('\n') if p]
    outside = [p for p in files if not p.startswith(EV)]
    print(f'diff {a[:8]}..{b[:8]}: {len(files)} files, outside the evidence directory {len(outside)}: {outside}')
print('df6046a1 is the main merged in 6c0edb52:', git('rev-parse', '6c0edb52^2').strip())
