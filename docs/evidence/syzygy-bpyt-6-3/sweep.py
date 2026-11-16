#!/usr/bin/env python3
"""Count the helper copies syzygy-bpyt.6.3 replaces, at one commit, from the committed bytes.

Usage: sweep.py <repo> <commit> [--selftest]

Method (Python `re`, never ugrep; the second method is `git grep -F -c` at the same commit):
  population  every file `git ls-tree -r` lists at <commit> under packages/<pkg>/src/ or apps/<app>/src/ whose name ends .ts,
              less test files: *.test.ts, *.browser.test.ts, *.testkit.ts, and any file whose basename begins `test-`
              (test support). The count of files and lines in the population is printed with every figure.
  sha256 site `createHash('sha256')` (single or double quotes, spaces allowed), at every occurrence.
  replaceable a site whose `.update(...)` has one argument, or two when the second is 'utf8', and is followed at once by
              `.digest('hex')`. The argument is found by a balanced scan that skips strings and template literals.
  local copy  a `function sha256` or `const sha256 =` definition, and the same for `deepFreeze`. An arrow helper under another name
              (`digest`, `hex`) is a replaceable site, counted there.
  importers   files that import `@syzygy/support`, by package.
Every site is listed with its file and line; nothing is summarised without the rows behind it.
"""
import hashlib
import json
import re
import subprocess
import sys

TEST_FILE = re.compile(r'\.(test|browser\.test)\.ts$|\.testkit\.ts$|(^|/)test-[^/]*\.ts$')
POPULATION = re.compile(r'^(packages|apps)/[^/]+/src/.*\.ts$')
SHA256_SITE = re.compile(r"""createHash\(\s*['"]sha256['"]\s*\)""")
LOCAL_DEF = re.compile(r'^\s*(?:export\s+)?(?:(?:function)\s+(sha256|deepFreeze)\b|const\s+(sha256|deepFreeze)\s*(?::|=))', re.M)
SUPPORT_IMPORT = re.compile(r"""from\s+['"]@syzygy/support['"]""")


def skip_string(text, i):
    quote = text[i]
    i += 1
    while i < len(text):
        c = text[i]
        if c == '\\':
            i += 2
            continue
        if c == quote:
            return i + 1
        if quote == '`' and c == '$' and text[i + 1:i + 2] == '{':
            i = skip_balanced(text, i + 1, '{', '}')
            continue
        i += 1
    raise ValueError('unterminated string')


def skip_balanced(text, i, open_, close):
    assert text[i] == open_
    depth = 0
    while i < len(text):
        c = text[i]
        if c in '\'"`':
            i = skip_string(text, i)
            continue
        if c == open_:
            depth += 1
        elif c == close:
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    raise ValueError('unbalanced')


def top_level_arguments(args):
    parts, depth, start, i = [], 0, 0, 0
    while i < len(args):
        c = args[i]
        if c in '\'"`':
            i = skip_string(args, i)
            continue
        if c in '([{':
            depth += 1
        elif c in ')]}':
            depth -= 1
        elif c == ',' and depth == 0:
            parts.append(args[start:i])
            start = i + 1
        i += 1
    parts.append(args[start:])
    return [p.strip() for p in parts]


def site_form(text, at):
    """'replaceable' or a short description of why the site is another form."""
    after = text[at:]
    m = SHA256_SITE.match(after)
    rest = after[m.end():]
    if not rest.startswith('.update('):
        return 'no .update( directly after the constructor'
    open_at = len('.update(') - 1
    close = skip_balanced(rest, open_at, '(', ')')
    args = top_level_arguments(rest[open_at + 1:close - 1])
    tail = rest[close:]
    if tail.startswith('.update('):
        return 'more than one update'
    if not tail.startswith(".digest('hex')"):
        return 'digest is not hex' if tail.startswith('.digest(') else 'no digest at once'
    if len(args) == 1 or (len(args) == 2 and args[1] == "'utf8'"):
        return 'replaceable'
    return 'update takes another encoding'


def sweep(repo, commit):
    names = subprocess.run(['git', '-C', repo, 'ls-tree', '-r', '-z', '--name-only', commit], capture_output=True, check=True).stdout.decode().split('\0')
    names = sorted(n for n in names if n and POPULATION.match(n) and not TEST_FILE.search(n))
    blobs = subprocess.run(['git', '-C', repo, 'cat-file', '--batch'], input=''.join(f'{commit}:{n}\n' for n in names).encode(), capture_output=True, check=True).stdout
    texts, pos = {}, 0
    for n in names:
        header_end = blobs.index(b'\n', pos)
        _, kind, size = blobs[pos:header_end].decode().split()
        assert kind == 'blob'
        body = blobs[header_end + 1:header_end + 1 + int(size)]
        texts[n] = body.decode('utf-8')
        pos = header_end + 1 + int(size) + 1
    sites, defs, importers = [], [], {}
    for n, text in texts.items():
        for m in SHA256_SITE.finditer(text):
            sites.append({'file': n, 'line': text.count('\n', 0, m.start()) + 1, 'form': site_form(text, m.start())})
        for m in LOCAL_DEF.finditer(text):
            defs.append({'file': n, 'line': text.count('\n', 0, m.start()) + 1, 'name': m.group(1) or m.group(2)})
        if SUPPORT_IMPORT.search(text):
            importers.setdefault('/'.join(n.split('/')[:2]), []).append(n)
    by_form = {}
    for s in sites:
        by_form[s['form']] = by_form.get(s['form'], 0) + 1
    return {
        'commit': commit,
        'population': {'files': len(names), 'lines': sum(t.count('\n') for t in texts.values()),
                       'namesSha256': hashlib.sha256('\n'.join(names).encode()).hexdigest()},
        'sha256Sites': {'total': len(sites), 'byForm': dict(sorted(by_form.items())), 'rows': sites},
        'localCopies': {'total': len(defs), 'byName': {k: sum(1 for d in defs if d['name'] == k) for k in ('sha256', 'deepFreeze')}, 'rows': defs},
        'supportImporters': {pkg: len(files) for pkg, files in sorted(importers.items())},
    }


def second_method(repo, commit):
    """`git grep -F -c` over the same population (pathspecs exclude the test classes), for the two literal figures."""
    pathspec = ['--', 'packages/*/src/*.ts', 'packages/*/src/**/*.ts', 'apps/*/src/*.ts', 'apps/*/src/**/*.ts',
                ':(exclude,glob)**/*.test.ts', ':(exclude,glob)**/*.browser.test.ts', ':(exclude,glob)**/*.testkit.ts', ':(exclude,glob)**/test-*.ts']
    out = {}
    for label, literal in (('sha256-single-quoted', "createHash('sha256')"), ('deepFreeze-definitions', 'function deepFreeze')):
        run = subprocess.run(['git', '-C', repo, 'grep', '-F', '-c', literal, commit] + pathspec, capture_output=True, text=True)
        out[label] = sum(int(line.rsplit(':', 1)[1]) for line in run.stdout.splitlines() if line)
    return out


def selftest():
    cases = {
        "createHash('sha256').update(x).digest('hex')": 'replaceable',
        "createHash('sha256').update(x, 'utf8').digest('hex')": 'replaceable',
        "createHash('sha256').update(`a${(b)}c`).digest('hex')": 'replaceable',
        "createHash('sha256').update(x).digest()": 'digest is not hex',
        "createHash('sha256').update(a).update(b).digest('hex')": 'more than one update',
        "createHash('sha256').update(x, 'latin1').digest('hex')": 'update takes another encoding',
        "createHash('sha256').digest('hex')": 'no .update( directly after the constructor',
    }
    failures = {text: (site_form(text, 0), want) for text, want in cases.items() if site_form(text, 0) != want}
    return {'cases': len(cases), 'failures': failures}


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        result = selftest()
        print(json.dumps(result))
        sys.exit(1 if result['failures'] else 0)
    repo, commit = sys.argv[1], sys.argv[2]
    record = sweep(repo, commit)
    record['secondMethod'] = second_method(repo, commit)
    print(json.dumps(record, indent=1))
