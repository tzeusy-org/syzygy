#!/usr/bin/env python3
"""AC3 and the Tests line, by script.

Usage: compare_tests.py <repo> <vitest-list-base.txt> <vitest-list-head.txt>
1. Name sets from `npx vitest list` at base 3ec69299 and head 6dcf9490: added and removed names, by file.
2. Every line the subject diff removes from a test file, classified; a removed line that names a matcher or an
   expected value must pair with an added line that differs from it only by the profile argument.
3. The four `browser profile cleanup` cases, base versus head: the lines that differ inside each case.
"""
import difflib
import re
import subprocess
import sys
from collections import Counter

repo, base_list, head_list = sys.argv[1:4]
BASE, HEAD = '3ec6929951080613b3c5cb7205fe303c5449be58', '6dcf94906b2989345f5b03dfeaa2d64c56632886'


def names(path):
    lines = [l.rstrip('\n') for l in open(path, encoding='utf-8') if l.strip()]
    return lines


b, h = names(base_list), names(head_list)
bs, hs = Counter(b), Counter(h)
added = sorted((hs - bs).elements())
removed = sorted((bs - hs).elements())
print(f'== name sets: base {len(b)} lines ({len(bs)} distinct), head {len(h)} lines ({len(hs)} distinct); added {len(added)}, removed {len(removed)}')
by_file = Counter(n.split(' > ')[0] for n in added)
for f, c in by_file.items():
    print(f'  +{c} {f}')
for n in removed:
    print('  REMOVED', n[:160])
for n in added:
    print('  +', n[:200])

git = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True, check=True).stdout
tests = [p for p in git('diff', '--name-only', BASE, HEAD).split('\n') if re.search(r'\.test\.ts$', p)]
print(f'== test files changed: {len(tests)}', tests)
MATCHER = re.compile(r'\bexpect\(|\.to[A-Z]\w*\(|\.not\.|\bassert')
for p in tests:
    diff = git('diff', '-U0', BASE, HEAD, '--', p).split('\n')
    minus = [l[1:] for l in diff if l.startswith('-') and not l.startswith('---')]
    plus = [l[1:] for l in diff if l.startswith('+') and not l.startswith('+++')]
    print(f'  {p}: removed {len(minus)} added {len(plus)}')
    for l in minus:
        kind = 'import' if l.lstrip().startswith('import ') else ('names-a-matcher-or-expect' if MATCHER.search(l) else 'other')
        pair = ''
        if kind == 'names-a-matcher-or-expect':
            best = difflib.get_close_matches(l, plus, n=1, cutoff=0.5)
            if best:
                sm = difflib.SequenceMatcher(None, l, best[0])
                ops = [(t, l[i1:i2], best[0][j1:j2]) for t, i1, i2, j1, j2 in sm.get_opcodes() if t != 'equal']
                pair = f' -> paired with added line; changed spans: {ops}'
            else:
                pair = ' -> NO paired added line'
        print(f'    - [{kind}] {l.strip()[:140]}{pair}')

print('== the four browser profile cleanup cases, base versus head')
for commit in (BASE, HEAD):
    pass
src = {c: git('show', f'{c}:apps/three-surface-poc/src/cdp-browser.test.ts') for c in (BASE, HEAD)}


def cases(text):
    start = text.index("describe('browser profile cleanup'")
    end = text.find("\ndescribe(", start + 1)
    block = text[start:] if end < 0 else text[start:end]
    found = {}
    for m in re.finditer(r"\n  it\('([^']+)'", block):
        s = m.start()
        e = block.find("\n  it(", s + 1)
        e = block.find("\n});", s + 1) if e < 0 else e
        found[m.group(1)] = block[s:e].strip('\n').split('\n')
    return found


cb, ch = cases(src[BASE]), cases(src[HEAD])
print(f'  cases: base {len(cb)} head {len(ch)}; same names: {sorted(cb) == sorted(ch)}')
for name in cb:
    d = [l for l in difflib.unified_diff(cb[name], ch[name], lineterm='', n=0) if l[:1] in '+-' and not l.startswith(('+++', '---'))]
    print(f'  {name}:')
    for l in d:
        print('     ', l.strip()[:150])
