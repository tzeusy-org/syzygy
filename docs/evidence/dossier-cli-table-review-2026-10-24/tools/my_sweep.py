"""Reviewer's own AC1 sweep with patterns independent of the lane's: any `[x + 1]` / `[++x]` read, any option literal compared or
searched (=== '--', includes('--', indexOf('--', filter(... '--'), process.argv reads, and any for/while loop header. Population: every
non-test .ts directly under apps/syzygy/src and packages/polaris-dossier/src. Usage: my_sweep.py <tree>"""
import os, re, sys, json
tree = sys.argv[1]
P = {
  'next-any': r'\[\s*\+\+\w+\s*\]|\[\s*\w+\s*\+\s*1\s*\]|\[\s*\w+\+\+\s*\]',
  'option-literal-compare': r"""(===|!==)\s*['"]-{1,2}[A-Za-z]|['"]-{1,2}[A-Za-z][\w-]*['"]\s*(===|!==)""",
  'option-literal-search': r"""\b(includes|indexOf|find|filter|some|startsWith)\(\s*\(?\s*(\w+\s*\)?\s*=>\s*\w+\s*===\s*)?['"]-""",
  'process-argv': r'process\.argv',
  'loop-header': r'^\s*(for|while)\s*\(',
}
files = hits = 0
out = []
for root in ['apps/syzygy/src', 'packages/polaris-dossier/src']:
    for name in sorted(os.listdir(os.path.join(tree, root))):
        if not name.endswith('.ts') or name.endswith('.test.ts'): continue
        files += 1
        for n, line in enumerate(open(os.path.join(tree, root, name)), 1):
            for k, p in P.items():
                if re.search(p, line):
                    out.append((k, f'{root}/{name}:{n}', line.strip()[:150]))
print(files, 'files', len(out), 'hits')
from collections import Counter
print(Counter(k for k, *_ in out))
for k, loc, t in out:
    if k != 'loop-header': print(k, loc, t)
