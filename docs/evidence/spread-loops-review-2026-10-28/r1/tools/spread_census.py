"""Reviewer's own argument-spread census (R-GP-IMPL-SPREAD-LOOPS-1), second method.
Usage: spread_census.py <repo> <commit-a> <commit-b>. Reads blobs with git show (not the worktree).
Population: git ls-tree -r -z of each commit, *.ts/*.mts/*.tsx/*.js/*.mjs under packages/, apps/, scripts/, less *.test.* and *.d.ts.
Predicate (broader than spread_sweep.py): any call whose argument list holds a spread, i.e. an identifier or `)`/`]` followed by
`(` and, before the matching `)` on that line, a `...` token at argument position (after `(` or `,`). Multiset of (path, stripped line)."""
import collections, re, subprocess, sys
repo, a, b = sys.argv[1:4]
CALL_SPREAD = re.compile(r'[\w\)\]]\s*\((?:[^()]*,)?\s*\.\.\.')
def census(commit):
    out = subprocess.run(['git', '-C', repo, 'ls-tree', '-r', '-z', '--name-only', commit], capture_output=True, check=True).stdout.decode().split('\0')
    pop = [p for p in out if re.match(r'^(packages|apps|scripts)/', p) and p.endswith(('.ts', '.mts', '.tsx', '.js', '.mjs')) and not re.search(r'\.test\.|\.d\.ts$', p)]
    hits = collections.Counter()
    for p in pop:
        text = subprocess.run(['git', '-C', repo, 'show', f'{commit}:{p}'], capture_output=True, check=True).stdout.decode('utf8')
        for line in text.split('\n'):
            s = line.strip()
            if s.startswith('//') or s.startswith('*'):
                continue
            if CALL_SPREAD.search(line):
                hits[(p, s)] += 1
    return len(pop), hits
na, ha = census(a); nb, hb = census(b)
print('population', a, na, b, nb)
print('hits', a, sum(ha.values()), b, sum(hb.values()))
print('only in', a, sorted((ha - hb).items()))
print('only in', b, sorted((hb - ha).items()))
