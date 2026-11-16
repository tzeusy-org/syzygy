"""Import closure of the mask, the active-content scan and the seven test files at a commit, intersected with the paths main
changed since a base, plus the PR's own paths. Usage (from the clone root): python3 -I import-closure.py <commit> <base> <main> <pr head>
Resolution: relative specifiers (.js -> .ts/.tsx/.mts, or /index.ts), and @syzygy/<name>[/<sub>] to the workspace package's
src/<sub or index>.ts, read from git at <commit>. Config that every vitest run reads is listed separately."""
import json, re, subprocess, sys, posixpath

commit, base, main, head = sys.argv[1:5]
def git(*a):
    return subprocess.run(['git', *a], capture_output=True, text=True, check=True).stdout
tracked = set(git('ls-tree', '-r', '--name-only', commit).split('\n'))
pkgs = {}
for p in tracked:
    if re.fullmatch(r'(packages|apps)/[^/]+/package\.json', p):
        pkgs[json.loads(git('show', f'{commit}:{p}'))['name']] = posixpath.dirname(p)
SPEC = re.compile(r"""(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]""")
def resolve(src, spec):
    if spec.startswith('.'):
        stem = posixpath.normpath(posixpath.join(posixpath.dirname(src), spec))
        stem = re.sub(r'\.(m?js|jsx)$', '', stem)
        for c in (stem + '.ts', stem + '.tsx', stem + '.mts', stem + '/index.ts', stem):
            if c in tracked: return c
        return None
    m = re.fullmatch(r'(@syzygy/[^/]+)(?:/(.+))?', spec)
    if m and m.group(1) in pkgs:
        d = pkgs[m.group(1)]
        for c in (f'{d}/src/{m.group(2) or "index"}.ts', f'{d}/src/{m.group(2) or "index"}/index.ts'):
            if c in tracked: return c
    return None
roots = ['packages/three-surface-poc-core/src/markdown-code-context.ts', 'packages/three-surface-poc-core/src/git-object-reader.ts',
         'packages/three-surface-poc-core/src/markdown-code-context.test.ts', 'packages/three-surface-poc-core/src/content-classification.test.ts',
         'packages/three-surface-poc-core/src/git-object-reader.test.ts', 'apps/three-surface-poc/src/fence-rules.test.ts',
         'apps/three-surface-poc/src/verbatim-route.test.ts', 'apps/three-surface-poc/src/polaris-generation/public-source-screening.test.ts',
         'packages/polaris-dossier/src/screen.test.ts']
seen, todo = set(), list(roots)
while todo:
    f = todo.pop()
    if f in seen: continue
    seen.add(f)
    for spec in SPEC.findall(git('show', f'{commit}:{f}')):
        r = resolve(f, spec)
        if r and r not in seen: todo.append(r)
main_changed = [p for p in git('diff', '--name-only', base, main).split('\n') if p]
pr_paths = [p for p in git('diff', '--name-only', base, head).split('\n') if p]
config = [p for p in main_changed if re.fullmatch(r'(vitest\.(config|setup)\.ts|package(-lock)?\.json|tsconfig[^/]*\.json|(packages|apps)/[^/]+/(package\.json|tsconfig[^/]*\.json|vitest\.config\.ts))', p)]
print('closure files at', commit, len(seen))
print('main changed since', base, len(main_changed), '; PR paths', len(pr_paths))
print('shared with PR paths:', sorted(set(main_changed) & set(pr_paths)))
print('main-changed files in the closure:', sorted(set(main_changed) & seen))
print('main-changed config files every run reads:', sorted(config))
