#!/usr/bin/env python3
"""Census of the strict UTF-8 decoders for syzygy-bpyt.6.3 stack 2: which are copies of one helper, which are not.

Usage: utf8-census.py <git repo> <commit> <out.json>
       utf8-census.py --selftest

Population: every tracked .ts, .mjs and .cjs file under packages/, apps/ and scripts/ at the commit, read from the commit
(never the worktree), tests included and counted apart. In it, every `new TextDecoder(` construction is classified by its
options (read from the argument text) and by its shape:
  helper      a function declaration `function f(b: Uint8Array): string | undefined` whose whole body is
              `try { return <decoder>.decode(b); } catch { return undefined; }`, with the decoder either the
              construction itself or a constant bound to one. The copies this change replaces.
  const       a constant bound to a construction (a strict decoder reused by its module, or a local)
  inline      a construction used in the expression that decodes
`equivalent` marks a construction whose options are exactly `fatal: true` (the helper's decoder, BOM dropped); the helper
shape with other options is listed apart and is not a copy. Method two counts constructions per file with `git grep -c -F`
and the per-file counts must equal method one's. Exit status 1 when they disagree.
"""
import json
import re
import subprocess
import sys

ROOTS = ('packages/', 'apps/', 'scripts/')
EXT = ('.ts', '.mjs', '.cjs')
CONSTRUCT = re.compile(r'new\s+TextDecoder\s*\(')
HELPER = re.compile(
    r'function\s+(?P<name>\w+)\s*\(\s*(?P<arg>\w+)\s*:\s*Uint8Array\s*\)\s*:\s*string\s*\|\s*undefined\s*\{'
    r'\s*try\s*\{\s*return\s+(?P<dec>[^;]+?)\.decode\(\s*(?P=arg)\s*\)\s*;\s*\}'
    r'\s*catch\s*(?:\([^)]*\))?\s*\{\s*return\s+undefined\s*;\s*\}\s*\}'
)
BOUND_BEFORE = re.compile(r'const\s+(?P<name>\w+)\s*(?::\s*[^=]+)?=\s*$')


def git(repo, *args):
    return subprocess.run(['git', '-C', repo, *args], capture_output=True, check=True).stdout


def call_args(text, open_paren):
    """The argument text of the call whose `(` is at `open_paren`, by balanced scan."""
    depth = 0
    for i in range(open_paren, len(text)):
        if text[i] == '(':
            depth += 1
        elif text[i] == ')':
            depth -= 1
            if depth == 0:
                return text[open_paren + 1:i]
    return text[open_paren + 1:]


def options(args):
    fatal = re.search(r'fatal\s*:\s*(true|false)', args)
    ignore = re.search(r'ignoreBOM\s*:\s*(true|false)', args)
    return {'fatal': fatal.group(1) if fatal else None, 'ignoreBOM': ignore.group(1) if ignore else None}


def is_equivalent(opts):
    return opts['fatal'] == 'true' and opts['ignoreBOM'] in (None, 'false')


def classify(text):
    """Every construction in one file: line, options, shape, helper name when any."""
    helpers = [(m.start(), m.end(), m) for m in HELPER.finditer(text)]
    rows = []
    for m in CONSTRUCT.finditer(text):
        line = text.count('\n', 0, m.start()) + 1
        args = call_args(text, m.end() - 1)
        opts = options(args)
        decodes_at_once = re.match(r'\s*\.decode\s*\(', text[m.end() + len(args) + 1:m.end() + len(args) + 24]) is not None
        shape, name = 'inline', None
        inside = [h for h in helpers if h[0] <= m.start() < h[1]]
        if inside:
            shape, name = 'helper', inside[0][2].group('name')
        else:
            c = None if decodes_at_once else BOUND_BEFORE.search(text[max(0, m.start() - 80):m.start()])
            if c:
                shape, name = 'const', c.group('name')
        rows.append({'line': line, 'options': opts, 'equivalent': is_equivalent(opts), 'shape': shape, 'name': name})
    # a constant read by a helper: the helper's decoder is that constant
    for h in helpers:
        dec = h[2].group('dec').strip()
        if not dec.startswith('new '):
            for r in rows:
                if r['shape'] == 'const' and r['name'] == dec:
                    r['shape'], r['name'] = 'helper', h[2].group('name')
    helper_defs = [{'line': text.count('\n', 0, s) + 1, 'name': m.group('name'), 'decoder': m.group('dec').strip()[:80]} for s, _, m in helpers]
    return rows, helper_defs


def census(repo, commit):
    names = [n for n in git(repo, 'ls-tree', '-r', '-z', '--name-only', commit).decode().split('\0') if n.startswith(ROOTS) and n.endswith(EXT)]
    files, total, per_file = [], 0, {}
    by_shape, by_options = {}, {}
    helper_files = []
    for n in names:
        text = git(repo, 'show', f'{commit}:{n}').decode('utf-8')
        rows, defs = classify(text)
        if not rows and not defs:
            continue
        test = n.endswith(('.test.ts', '.testkit.ts'))
        per_file[n] = len(rows)
        total += len(rows)
        for r in rows:
            key = ('test ' if test else '') + r['shape']
            by_shape[key] = by_shape.get(key, 0) + 1
            okey = ('test ' if test else '') + f"fatal={r['options']['fatal']} ignoreBOM={r['options']['ignoreBOM']}"
            by_options[okey] = by_options.get(okey, 0) + 1
        files.append({'path': n, 'test': test, 'constructions': rows, 'helperDefinitions': defs})
        for d in defs:
            helper_files.append({'path': n, **d, 'equivalentToDecodeUtf8': all(r['equivalent'] for r in rows if r['shape'] == 'helper')})
    # method two: constructions per file by git grep -c -F
    out = subprocess.run(['git', '-C', repo, 'grep', '-c', '-F', '-e', 'new TextDecoder(', commit, '--', 'packages', 'apps', 'scripts'], capture_output=True, text=True).stdout
    two = {}
    for l in out.splitlines():
        path, n = l.rsplit(':', 1)
        path = path.split(':', 1)[1]
        if path.endswith(EXT):
            two[path] = int(n)
    agree = {k: v for k, v in per_file.items() if v} == two
    return {
        'commit': commit,
        'population': f'{len(names)} tracked .ts/.mjs/.cjs files under packages/, apps/ and scripts/',
        'filesWithAConstruction': len([f for f in files if f['constructions']]),
        'constructions': total,
        'byShape': dict(sorted(by_shape.items())),
        'byOptions': dict(sorted(by_options.items())),
        'helperDefinitions': helper_files,
        'secondMethod': 'git grep -c -F "new TextDecoder(" per file; file set and per-file counts equal to method one',
        'methodsAgree': agree,
        'files': files,
    }


def selftest():
    cases = {
        'helper-inline': ("function decode(bytes: Uint8Array): string | undefined {\n  try {\n    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);\n  } catch {\n    return undefined;\n  }\n}\n", 'helper', True),
        'helper-const': ("const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true });\n\nfunction decodeUtf8(bytes: Uint8Array): string | undefined {\n  try {\n    return STRICT_UTF8.decode(bytes);\n  } catch {\n    return undefined;\n  }\n}\n", 'helper', True),
        'helper-ignore-bom': ("function d(b: Uint8Array): string | undefined {\n  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(b); } catch { return undefined; }\n}\n", 'helper', False),
        'inline-in-try': ("let t: string;\ntry {\n  t = new TextDecoder('utf-8', { fatal: true }).decode(x);\n} catch {\n  return refuse();\n}\n", 'inline', True),
        'lenient': ("const s = new TextDecoder().decode(x);\n", 'inline', False),
        'const-not-helper': ("const decoder = new TextDecoder('utf-8', { fatal: true });\nconst h = decoder.decode(a);\n", 'const', True),
        'fatal-false': ("function d(b: Uint8Array): string | undefined {\n  try { return new TextDecoder('utf-8', { fatal: false }).decode(b); } catch { return undefined; }\n}\n", 'helper', False),
    }
    bad = []
    for name, (text, shape, equivalent) in cases.items():
        rows, _ = classify(text)
        got = (rows[0]['shape'], rows[0]['equivalent']) if rows else None
        if got != (shape, equivalent):
            bad.append({'case': name, 'expected': [shape, equivalent], 'got': got})
    print(json.dumps({'selftest': 'shape and equivalence of seven fixtures', 'cases': len(cases), 'failed': bad}))
    sys.exit(1 if bad else 0)


def main():
    if '--selftest' in sys.argv:
        selftest()
    repo, commit, out = sys.argv[1:4]
    result = census(repo, commit)
    json.dump(result, open(out, 'w'), indent=1)
    open(out, 'a').write('\n')
    print(f"{result['constructions']} constructions in {result['filesWithAConstruction']} files; helpers {len(result['helperDefinitions'])}; methods agree {result['methodsAgree']}")
    sys.exit(0 if result['methodsAgree'] else 1)


if __name__ == '__main__':
    main()
