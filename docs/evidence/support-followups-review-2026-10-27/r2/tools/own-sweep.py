#!/usr/bin/env python3
"""Reviewer's own sweep of createHash('sha256') sites and local sha256/deepFreeze definitions (PR #538, round 2).

Usage: own-sweep.py <clone> <commit> [<commit> ...]

Independent of sweep.py and population-audit.py (it imports neither):
  population   tracked `(apps|packages)/<pkg>/src/**.ts` at the commit, less `*.test.ts`, `*.browser.test.ts`,
               `*.testkit.ts` (the strict test class). Within it, `test-*.ts` basenames form the test-support class.
  name rule    the population less every `test-*.ts` basename.
  reach rule   the name rule plus each `test-*.ts` file that some name-rule file imports or re-exports, found by
               resolving every static specifier (`from '<x>'`, `import '<x>'`, `import('<x>')`) relative to the importer,
               `.js` -> `.ts`, and `<dir>` -> `<dir>/index.ts`. One level, as the #530 rule states.
  site         `createHash(` + optional space + a quoted `sha256` in ', " or ` quotes.
  definition   a declaration whose bound name is `sha256` or `deepFreeze`: function, const, let or var, exported or not,
               and an `export { x as sha256 }` rename.
Second method per commit: `git grep -c -F "createHash('sha256')"` over the reach-rule files.
"""
import posixpath
import re
import subprocess
import sys

clone = sys.argv[1]
POP = re.compile(r'^(apps|packages)/[^/]+/src/.+\.ts$')
STRICT = re.compile(r'\.test\.ts$|\.browser\.test\.ts$|\.testkit\.ts$')
SUPPORT = re.compile(r'(^|/)test-[^/]*\.ts$')
SPEC = re.compile(r"""(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)['"]([^'"\n]+)['"]""", re.M)
SITE = re.compile(r"""createHash\(\s*(['"`])sha256\1""")
DEF = re.compile(r"""(?:^|[\s;{(])(?:function\s*\*?\s*|(?:const|let|var)\s+)(sha256|deepFreeze)\b|\bas\s+(sha256|deepFreeze)\b""")


def git(*args, inp=None):
    return subprocess.run(['git', '-C', clone, *args], input=inp, capture_output=True, check=True).stdout


def texts(commit, names):
    out = git('cat-file', '--batch', inp=''.join(f'{commit}:{n}\n' for n in names).encode())
    res, pos = {}, 0
    for n in names:
        header_end = out.index(b'\n', pos)
        size = int(out[pos:header_end].split()[2])
        res[n] = out[header_end + 1:header_end + 1 + size].decode('utf-8', 'replace')
        pos = header_end + 1 + size + 1
    return res


def strip_comments(text):
    # Drop // and /* */ comments outside strings, so a site named in a comment is not a site.
    out, i, n = [], 0, len(text)
    while i < n:
        c = text[i]
        if c in '\'"`':
            j = i + 1
            while j < n and text[j] != c:
                j += 2 if text[j] == '\\' else 1
            out.append(text[i:j + 1]); i = j + 1
        elif text.startswith('//', i):
            j = text.find('\n', i); i = n if j < 0 else j
        elif text.startswith('/*', i):
            j = text.find('*/', i + 2); i = n if j < 0 else j + 2
        else:
            out.append(c); i += 1
    return ''.join(out)


for commit in sys.argv[2:]:
    names = [n for n in git('ls-tree', '-r', '-z', '--name-only', commit).decode().split('\0') if n]
    pop = sorted(n for n in names if POP.match(n) and not STRICT.search(n))
    body = texts(commit, pop)
    support_class = {n for n in pop if SUPPORT.search(n)}
    name_rule = [n for n in pop if n not in support_class]
    reached = set()
    for n in name_rule:
        for spec in SPEC.findall(body[n]):
            if not spec.startswith('.'):
                continue
            t = posixpath.normpath(posixpath.join(posixpath.dirname(n), spec))
            for cand in (re.sub(r'\.js$', '.ts', t), t + '.ts', t + '/index.ts'):
                if cand in support_class:
                    reached.add(cand)
    reach_rule = sorted(set(name_rule) | reached)

    def census(files):
        sites, defs = [], []
        for f in files:
            code = strip_comments(body[f])
            sites += [f] * len(SITE.findall(code))
            for m in DEF.finditer(code):
                defs.append((f, m.group(1) or m.group(2)))
        return sites, defs

    print(f'== {commit}: population {len(pop)} (test-support class {len(support_class)}), name rule {len(name_rule)}, reach rule {len(reach_rule)}')
    print('   test-support files reached:', sorted(reached))
    for label, files in (('name rule', name_rule), ('reach rule', reach_rule)):
        sites, defs = census(files)
        sha = [d for d in defs if d[1] == 'sha256']
        dfz = [d for d in defs if d[1] == 'deepFreeze']
        print(f'   {label}: files={len(files)} sites={len(sites)} sha256Defs={len(sha)} deepFreezeDefs={len(dfz)}')
        print('     sites in', sorted(set(sites)))
        print('     defs', sorted(defs))
    # Second method: git grep -c -F over the reach-rule files.
    grep = subprocess.run(['git', '-C', clone, 'grep', '-c', '-F', "createHash('sha256')", commit, '--', *reach_rule], capture_output=True)
    rows = [l for l in grep.stdout.decode().splitlines() if l]
    total = sum(int(l.rsplit(':', 1)[1]) for l in rows)
    print(f'   second method git grep -c -F over the reach rule: files={len(rows)} sites={total}')
