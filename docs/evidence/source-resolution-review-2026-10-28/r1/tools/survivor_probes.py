#!/usr/bin/env python3
"""Show that the surviving clean-build and tsconfig mutants X3b, X4 and X8 change behaviour, outside the suite.

Usage: survivor_probes.py <checkout at 2f249d2c, deps installed> <scratch dir>
Each probe writes a mutated copy of scripts/clean_build.mjs beside the original (scripts/clean_build.r549-<id>.mjs, removed
afterwards), or mutates packages/support/tsconfig.json and restores it, and prints what the unmutated and mutated forms do.
"""
import json, os, shutil, subprocess, sys

checkout, scratch = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
original = open(os.path.join(checkout, 'scripts/clean_build.mjs')).read()


def config(refs):
    return {'compilerOptions': {'composite': True, 'target': 'ES2022', 'module': 'ES2022', 'moduleResolution': 'bundler', 'types': [],
                                'rootDir': 'src', 'outDir': 'dist', 'tsBuildInfoFile': 'dist/.tsbuildinfo'},
            'include': ['src'], 'references': [{'path': r} for r in refs]}


def tree(name, layout):
    root = os.path.join(scratch, name)
    shutil.rmtree(root, ignore_errors=True)
    for project, refs in layout.items():
        os.makedirs(os.path.join(root, project, 'src'))
        base = os.path.basename(project)
        open(os.path.join(root, project, 'src', f'{base}.ts'), 'w').write(f"export const {base} = '{base}';\n")
        open(os.path.join(root, project, 'tsconfig.json'), 'w').write(json.dumps(config(refs)))
        os.makedirs(os.path.join(root, project, 'dist'))
        open(os.path.join(root, project, 'dist', 'stale.js'), 'w').write('throw new Error("stale");\n')
    return root


def run(script, root, *args):
    r = subprocess.run(['node', script, *args], cwd=root, capture_output=True, text=True)
    left = sorted(os.path.relpath(os.path.join(d, f), root) for d, _, fs in os.walk(root) for f in fs if f == 'stale.js')
    return {'exit': r.returncode, 'stderr': next((l for l in r.stderr.splitlines() if l.startswith('Error')), ''), 'staleLeft': left}


def mutated(ident, old, new):
    assert original.count(old) == 1, ident
    path = os.path.join(checkout, f'scripts/clean_build.r549-{ident}.mjs')
    open(path, 'w').write(original.replace(old, new))
    return path


out = {}
script = os.path.join(checkout, 'scripts/clean_build.mjs')
# X3b: c -> b -> a, naming c. tsc -b builds all three; the mutant removes only c's and b's dist.
layout = {'packages/a': [], 'packages/b': ['../a'], 'packages/c': ['../b']}
x3b = mutated('X3b', '  for (const reference of config.references ?? []) visit(',
              '  if (projects.includes(project)) for (const reference of config.references ?? []) visit(')
out['X3b'] = {'unmutated': run(script, tree('x3b-u', layout), 'packages/c'), 'mutated': run(x3b, tree('x3b-m', layout), 'packages/c')}
# X8: a project with a tsconfig outside apps/ and packages/.
layout8 = {'packages/a': [], 'tools/x': []}
x8 = mutated('X8', 'if (!/^(?:apps|packages)\\/[^/]+$/u.test(project) || !existsSync(path))', 'if (!existsSync(path))')
out['X8'] = {'unmutated': run(script, tree('x8-u', layout8), 'tools/x'), 'mutated': run(x8, tree('x8-m', layout8), 'tools/x')}
for p in (x3b, x8):
    os.remove(p)
# X4: packages/support/tsconfig.json adds a test by `files`; what the support build emits.
tsconfig = os.path.join(checkout, 'packages/support/tsconfig.json')
before = open(tsconfig).read()
try:
    open(tsconfig, 'w').write(before.replace('"include": ["src"],', '"files": ["src/sha256.test.ts"],\n  "include": ["src"],', 1))
    r = subprocess.run(['node', script, 'packages/support'], cwd=checkout, capture_output=True, text=True)
    out['X4'] = {'buildExit': r.returncode, 'emittedTest': os.path.exists(os.path.join(checkout, 'packages/support/dist/sha256.test.js'))}
finally:
    open(tsconfig, 'w').write(before)
r = subprocess.run(['node', script, 'packages/support'], cwd=checkout, capture_output=True, text=True)
out['X4']['restoredBuildExit'] = r.returncode
out['X4']['emittedTestAfterRestore'] = os.path.exists(os.path.join(checkout, 'packages/support/dist/sha256.test.js'))
out['worktreeClean'] = subprocess.run(['git', '-C', checkout, 'status', '--porcelain'], capture_output=True, text=True).stdout == ''
print(json.dumps(out, indent=1))
