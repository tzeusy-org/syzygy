"""rev-540: sweep tracked apps/ and packages/ sources (.ts .mts .cts .tsx .js .mjs .cjs) at a commit for module loads the
guard's walk cannot follow: import( with a non-literal first argument, createRequire, and require( calls. Prints counts per
class, split into test files (*.test.*, *.testkit.*, test-*.ts) and other files, with each other-file hit.
Usage: python3 -I sweep_dynamic.py <tree> <commit>
"""
import re, subprocess, sys
tree, commit = sys.argv[1:3]
files = [p for p in subprocess.run(['git', '-C', tree, 'ls-tree', '-r', '--name-only', '-z', commit, '--', 'apps', 'packages'], capture_output=True, text=True, check=True).stdout.split('\0')
         if re.search(r'\.(ts|mts|cts|tsx|js|mjs|cjs)$', p) and '/dist/' not in p]
DYN = re.compile(r"\bimport\(\s*(?!['\"`])")
LIT = re.compile(r"\bimport\(\s*['\"`]")
CR = re.compile(r"\bcreateRequire\b")
RQ = re.compile(r"(?<![\w.])require\(")
counts = {}
hits = []
for p in files:
    text = subprocess.run(['git', '-C', tree, 'show', f'{commit}:{p}'], capture_output=True, text=True, check=True).stdout
    kind = 'test' if re.search(r'(\.test\.|\.testkit\.|/test-[^/]*$|\.browser\.test|\.live\.test)', p) else 'other'
    for name, rx in (('import(non-literal)', DYN), ('import(literal)', LIT), ('createRequire', CR), ('require(', RQ)):
        n = len(rx.findall(text))
        if n:
            counts[(name, kind)] = counts.get((name, kind), 0) + n
            if kind == 'other' and name != 'import(literal)':
                for i, line in enumerate(text.splitlines(), 1):
                    if rx.search(line): hits.append(f'{p}:{i}: {line.strip()[:110]}')
print('files swept:', len(files))
for k in sorted(counts): print(k, counts[k])
print('other-file hits (non-literal import, createRequire, require):')
for h in hits: print('  ', h)
