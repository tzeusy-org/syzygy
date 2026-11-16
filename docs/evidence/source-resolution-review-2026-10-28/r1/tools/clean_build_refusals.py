#!/usr/bin/env python3
"""Probe scripts/clean_build.mjs's refusals and removal scope in scratch trees.

Usage: clean_build_refusals.py <checkout> <scratch dir>
Each case builds a fresh tree of one-file projects (packages/a, packages/b referencing a, packages/c), plants a sentinel
in every dist and one outside, runs the script from the tree root with the case's arguments, and records the exit status,
the stderr's first line, and which sentinels survived.
"""
import json, os, re, shutil, subprocess, sys

checkout, scratch = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
script = os.path.join(checkout, 'scripts/clean_build.mjs')


def config(refs, **extra):
    options = {'composite': True, 'target': 'ES2022', 'module': 'ES2022', 'moduleResolution': 'bundler', 'types': [],
               'rootDir': 'src', 'outDir': 'dist', 'tsBuildInfoFile': 'dist/.tsbuildinfo'}
    options.update(extra)
    return {'compilerOptions': options, 'include': ['src'], 'references': [{'path': r} for r in refs]}


def tree(name, mutate=None):
    root = os.path.join(scratch, name)
    shutil.rmtree(root, ignore_errors=True)
    projects = {'a': config([]), 'b': config(['../a']), 'c': config([])}
    if mutate:
        mutate(root, projects)
    for p, cfg in projects.items():
        os.makedirs(os.path.join(root, 'packages', p, 'src'), exist_ok=True)
        if not os.path.exists(os.path.join(root, 'packages', p, 'src', f'{p}.ts')):
            open(os.path.join(root, 'packages', p, 'src', f'{p}.ts'), 'w').write(f"export const {p} = '{p}';\n")
        if cfg is not None:
            open(os.path.join(root, 'packages', p, 'tsconfig.json'), 'w').write(json.dumps(cfg))
        os.makedirs(os.path.join(root, 'packages', p, 'dist'), exist_ok=True)
        open(os.path.join(root, 'packages', p, 'dist', 'SENTINEL'), 'w').write(p)
    os.makedirs(os.path.join(root, 'outside'), exist_ok=True)
    open(os.path.join(root, 'outside', 'SENTINEL'), 'w').write('outside')
    return root


def survivors(root):
    out = []
    for dirpath, _dirs, files in os.walk(root):
        for f in files:
            if f == 'SENTINEL':
                out.append(os.path.relpath(os.path.join(dirpath, f), root))
    return sorted(out)


def run(name, args, mutate=None, after=None):
    root = tree(name, mutate)
    if after:
        after(root)
    before = survivors(root)
    r = subprocess.run(['node', script, *args], cwd=root, capture_output=True, text=True)
    left = survivors(root)
    return {'case': name, 'args': args, 'exit': r.returncode, 'error': next((l.strip() for l in r.stderr.splitlines() if re.match(r'\s*Error', l)), ''), 'stdout': r.stdout.strip()[:300],
            'removed': sorted(set(before) - set(left)), 'kept': left}


cases = []
cases.append(run('outside-workspace', ['outside']))
cases.append(run('dotdot', ['packages/../outside']))
cases.append(run('dotdot-escape', ['packages/../../x']))
cases.append(run('missing-tsconfig', ['packages/b'], mutate=lambda root, p: p.__setitem__('a', None)))
cases.append(run('outdir-not-dist', ['packages/b'], mutate=lambda root, p: p['a']['compilerOptions'].__setitem__('outDir', 'out')))
cases.append(run('outdir-dot-slash-dist', ['packages/b'], mutate=lambda root, p: p['a']['compilerOptions'].__setitem__('outDir', './dist')))
def stale_declaration(root):
    os.makedirs(os.path.join(root, 'packages/a/types'), exist_ok=True)
    open(os.path.join(root, 'packages/a/types/SENTINEL'), 'w').write('stale declaration output')


cases.append(run('declarationDir-outside', ['packages/b'], mutate=lambda root, p: p['a']['compilerOptions'].update({'declaration': True, 'declarationDir': 'types'}), after=stale_declaration))
cases.append(run('cycle', ['packages/b'], mutate=lambda root, p: p['a'].__setitem__('references', [{'path': '../b'}])))
cases.append(run('trailing-slash', ['packages/b/']))
cases.append(run('dot-slash', ['./packages/b']))
cases.append(run('absolute', [os.path.join(scratch, 'absolute', 'packages', 'b')]))


def symlink_dist(root):
    target = os.path.join(root, 'outside', 'linked-dist')
    os.makedirs(target, exist_ok=True)
    open(os.path.join(target, 'SENTINEL'), 'w').write('linked')
    shutil.rmtree(os.path.join(root, 'packages', 'a', 'dist'))
    os.symlink(target, os.path.join(root, 'packages', 'a', 'dist'))


cases.append(run('symlinked-dist', ['packages/b'], after=symlink_dist))


def symlink_project(root):
    target = os.path.join(root, 'outside', 'proj')
    shutil.copytree(os.path.join(root, 'packages', 'c'), target)
    shutil.rmtree(os.path.join(root, 'packages', 'c'))
    os.symlink(target, os.path.join(root, 'packages', 'c'))


cases.append(run('symlinked-project', ['packages/c'], after=symlink_project))
cases.append(run('tsconfig-with-comment', ['packages/b'], after=lambda root: open(os.path.join(root, 'packages/a/tsconfig.json'), 'a').write('\n// trailing comment\n')))
for c in cases:
    print(json.dumps(c))
