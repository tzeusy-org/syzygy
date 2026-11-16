#!/usr/bin/env python3
"""Census of strict TextDecoder constructions, my own method (round 2 of PR 534).
Usage: python3 -I strict_sites.py <repo> <commit> <out.json>

Population: every blob in `git ls-tree -r -z <commit>` under packages/, apps/ or scripts/ whose name ends .ts,
.tsx, .mts, .cts, .js, .mjs or .cjs. A construction is `new` + whitespace + optional `globalThis.`/`util.` +
`TextDecoder` + optional whitespace + `(`, whose line does not start (after spaces) with `//` or `*`. Its argument
text runs to the matching close paren. Strict: the argument text has `fatal` `:` `true` and no `ignoreBOM`.
Test: the basename contains `.test.` or `.spec.`. Second method: `git grep -n -E` of the same construction form,
whose (path, line) set must equal the first method's."""
import json
import re
import subprocess
import sys

repo, commit, out = sys.argv[1:4]
EXT = ('.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs')
CONS = re.compile(r'new\s+(?:globalThis\.|util\.)?TextDecoder\s*\(')


def git(*args):
    return subprocess.run(['git', '-C', repo, *args], check=True, capture_output=True).stdout


entries = []
for rec in git('ls-tree', '-r', '-z', commit).split(b'\0'):
    if not rec:
        continue
    meta, path = rec.split(b'\t', 1)
    mode, typ, oid = meta.split()
    p = path.decode('utf-8')
    if typ == b'blob' and p.split('/')[0] in ('packages', 'apps', 'scripts') and p.endswith(EXT):
        entries.append((p, oid.decode()))

sites = []
for p, oid in entries:
    text = git('cat-file', 'blob', oid).decode('utf-8')
    line_starts = [0] + [m.end() for m in re.finditer('\n', text)]
    for m in CONS.finditer(text):
        # line number of the match
        lo, hi = 0, len(line_starts) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if line_starts[mid] <= m.start():
                lo = mid
            else:
                hi = mid - 1
        line_no = lo + 1
        line_text = text[line_starts[lo]:text.find('\n', line_starts[lo]) if text.find('\n', line_starts[lo]) != -1 else len(text)]
        if line_text.lstrip().startswith(('//', '*')):
            continue
        depth, i = 1, m.end()
        while i < len(text) and depth:
            depth += {'(': 1, ')': -1}.get(text[i], 0)
            i += 1
        args = text[m.end():i - 1]
        strict = re.search(r'fatal\s*:\s*true', args) is not None and 'ignoreBOM' not in args
        base = p.rsplit('/', 1)[-1]
        sites.append({'path': p, 'line': line_no, 'args': ' '.join(args.split()), 'strict': strict,
                      'test': '.test.' in base or '.spec.' in base})

grep = git('grep', '-n', '-E', r'new[[:space:]]+(globalThis\.|util\.)?TextDecoder[[:space:]]*\(', commit, '--',
           'packages', 'apps', 'scripts').decode('utf-8')
grep_set = set()
for ln in grep.splitlines():
    _, p, n, rest = ln.split(':', 3)
    if not p.endswith(EXT) or rest.lstrip().startswith(('//', '*')):
        continue
    grep_set.add((p, int(n)))
mine_set = {(s['path'], s['line']) for s in sites}
prod_strict = [s for s in sites if s['strict'] and not s['test'] and s['path'] != 'packages/support/src/decode-utf8.ts']
result = {
    'commit': commit,
    'population': len(entries),
    'constructions': len(sites),
    'filesWithAConstruction': len({s['path'] for s in sites}),
    'grepLinesAgree': mine_set == grep_set,
    'grepOnly': sorted(grep_set - mine_set),
    'mineOnly': sorted(mine_set - grep_set),
    'productionConstructions': sum(1 for s in sites if not s['test']),
    'productionStrictOutsideHelper': len(prod_strict),
    'productionStrictOutsideHelperSites': [{'path': s['path'], 'line': s['line']} for s in prod_strict],
    'sites': sites,
}
json.dump(result, open(out, 'w'), indent=1)
print(json.dumps({k: v for k, v in result.items() if k not in ('sites', 'productionStrictOutsideHelperSites')}))
