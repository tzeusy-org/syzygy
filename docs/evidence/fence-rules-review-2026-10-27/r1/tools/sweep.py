#!/usr/bin/env python3
"""Reviewer's own fence-reader sweep for PR 533 (R-GP-IMPL-FENCE-RULES-1).

Usage: sweep.py <repo> <commit>
Population: tracked .ts files under packages/*/src and apps/*/src at <commit> (git ls-tree -r -z).
Two predicates, Python re, re.I, per line:
  lane:  `{3}|~{3}|fenc                               (the lane's predicate, re-run)
  wide:  the lane's, plus a backtick or tilde followed by a {3 quantifier (`{3 / ~{3 / \\x60{3 / \\u0060{3),
         '`'.repeat, \\x60, \\u0060, "code block", "codeblock", "code span", "backtick", "tilde", "info string"
Prints JSON: population counts, per-predicate files/line hits, production files (not *.test.ts) per predicate, and the
production files the wide predicate adds.
"""
import json
import re
import subprocess
import sys

LANE = re.compile(r'`{3}|~{3}|fenc', re.I)
WIDE = re.compile(r'`{3}|~{3}|fenc|[`~]\\?\{3|\\x60|\\u0060|\'`\'\.repeat|"`"\.repeat|code ?block|code span|backtick|tilde|info string', re.I)


def main():
    repo, commit = sys.argv[1:3]
    raw = subprocess.run(['git', '-C', repo, 'ls-tree', '-r', '-z', '--name-only', commit], check=True, capture_output=True).stdout
    paths = [p.decode('utf8') for p in raw.split(b'\0') if p]
    pop = [p for p in paths if re.match(r'^(packages|apps)/[^/]+/src/.*\.ts$', p)]
    out = {'commit': commit, 'population': len(pop), 'nonTest': sum(not p.endswith('.test.ts') for p in pop)}
    for name, rx in (('lane', LANE), ('wide', WIDE)):
        files, hits = {}, 0
        for p in pop:
            text = subprocess.run(['git', '-C', repo, 'show', f'{commit}:{p}'], check=True, capture_output=True).stdout.decode('utf8')
            n = sum(1 for line in text.split('\n') if rx.search(line))
            if n:
                files[p] = n
                hits += n
        out[name] = {'files': len(files), 'lineHits': hits, 'productionFiles': {p: n for p, n in sorted(files.items()) if not p.endswith('.test.ts')}}
    out['wideAddsProduction'] = sorted(set(out['wide']['productionFiles']) - set(out['lane']['productionFiles']))
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
