#!/usr/bin/env python3
"""Which PR code files sit under a test that pins or forbids a file's imports.

Usage: guard-coverage.py <clone> <rev> [<rev> ...]

Reads git objects only. For each rev, the PR code paths are
`git diff --name-only eb8fb6cb <rev> -- apps packages scripts`. The guard
population is the ten import-reading tests found by import-guard-sweep.py
(signals S1-S4, plus S5 in a test); each guard's covered files are computed
from the guard's own declaration as read at that rev:

  G1 capture-test-artifact-main.test.ts   ALLOWED_IMPORTS, 3 files, exact allowlists
  G2 owner-act-drafter.test.ts            exact set, 1 file
  G3 support-purity.test.ts               non-test .ts under packages/support/src
  G4 subpath-imports.test.ts              the two subpath modules and apps/syzygy/src/main.ts
  G5 test-artifact-verification-live-source.test.ts  the closure of the live test
  G6 polaris-dossier cli.test.ts          non-test .ts under packages/polaris-dossier/src
  G7 polaris-dossier git-object-reader.test.ts  that one module
  G8 work-items.test.ts                   work-items.ts
  G9 watch-mode.test.ts                   REOBSERVATION_SOURCES as listed
  G10 sync-child-process-guard.test.ts    every test file and its module graph (child_process only)

For G1 and G2 the file's actual specifiers are compared with the pinned list
(a re-implementation of the guard's predicate, for a negative control at
663061c4). G10's population is reported as membership only.
"""
import posixpath
import re
import subprocess
import sys
from collections import deque

clone = sys.argv[1]
SPEC = re.compile(r"""(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)['"]([^'"\n]+)['"]""", re.M)
WORKSPACE = {
    '@syzygy/cap1-core': 'packages/cap1-core/src/index.ts',
    '@syzygy/support': 'packages/support/src/index.ts',
}


def git(*args):
    p = subprocess.run(['git', '-C', clone, *args], capture_output=True)
    return p.stdout.decode() if p.returncode == 0 else None


def show(rev, path):
    return git('show', f'{rev}:{path}')


def tree(rev):
    return [p for p in git('ls-tree', '-r', '-z', '--name-only', rev).split('\0') if p]


def specifiers(text):
    return sorted(set(SPEC.findall(text)))


def closure(rev, seed):
    seen = {seed}
    queue = deque([seed])
    while queue:
        here = queue.popleft()
        text = show(rev, here)
        if text is None:
            continue
        for spec in SPEC.findall(text):
            target = WORKSPACE.get(spec)
            if target is None and spec.startswith('.'):
                target = re.sub(r'\.js$', '.ts', posixpath.normpath(posixpath.join(posixpath.dirname(here), spec)))
            if target and target not in seen:
                seen.add(target)
                queue.append(target)
    return seen


def test_graph(rev, paths):
    """Every test file plus the relative and @syzygy/* modules it reaches (G10's population, approximated)."""
    tests = [p for p in paths if re.search(r'\.test\.[mc]?ts$', p) and (p.startswith('apps/') or p.startswith('packages/'))]
    aliases = {}
    for p in paths:
        m = re.match(r'(apps|packages)/([^/]+)/package\.json$', p)
        if m:
            name = re.search(r'"name"\s*:\s*"([^"]+)"', show(rev, p) or '')
            if name:
                aliases[name.group(1)] = f'{m.group(1)}/{m.group(2)}/src/index.ts'
    seen = set(tests)
    queue = deque(tests)
    while queue:
        here = queue.popleft()
        text = show(rev, here)
        if text is None:
            continue
        for spec in SPEC.findall(text):
            target = aliases.get(spec)
            if target is None and spec.startswith('.'):
                target = re.sub(r'\.js$', '.ts', posixpath.normpath(posixpath.join(posixpath.dirname(here), spec)))
            if target and target not in seen:
                seen.add(target)
                queue.append(target)
    return seen


for rev in sys.argv[2:]:
    paths = tree(rev)
    pr = sorted(p for p in (git('diff', '--name-only', '-z', 'eb8fb6cb', rev, '--', 'apps', 'packages', 'scripts') or '').split('\0') if p)
    print(f'== {rev}: PR code paths {len(pr)}')
    guards = {}
    g1 = show(rev, 'apps/three-surface-poc/src/capture-test-artifact-main.test.ts')
    allowed = {
        'apps/three-surface-poc/src/capture-test-artifact-main.ts': ['node:child_process', 'node:path', 'node:url', '@syzygy/three-surface-poc-core', './capture-test-artifact.js'],
        'apps/three-surface-poc/src/capture-test-artifact.ts': ['@syzygy/three-surface-poc-core'],
        'packages/three-surface-poc-core/src/test-artifact-verification.ts': ['node:crypto', 'node:fs', 'node:path'],
    }
    # Confirm the pinned lists are the ones the guard declares at this rev.
    declared = re.search(r"\[CORE_SOURCE\]:\s*\[([^\]]*)\]", g1 or '')
    print('   G1 declared CORE_SOURCE list:', declared.group(1) if declared else None)
    guards['G1'] = set(allowed)
    for f, allow in allowed.items():
        extra = [s for s in specifiers(show(rev, f) or '') if s not in allow]
        print(f'   G1 {f}: specifiers outside the allowlist {extra}')
    g2 = 'packages/three-surface-poc-core/src/owner-act-drafter.ts'
    guards['G2'] = {g2}
    print(f"   G2 {g2}: specifiers {specifiers(show(rev, g2) or '')} (pinned ['@syzygy/cap1-core', '@syzygy/support'])")
    guards['G3'] = {p for p in paths if p.startswith('packages/support/src/') and p.endswith('.ts') and not p.endswith('.test.ts')}
    guards['G4'] = {'packages/polaris-dossier/src/argv.ts', 'packages/polaris-dossier/src/state-directory.ts', 'apps/syzygy/src/main.ts'}
    guards['G5'] = closure(rev, 'packages/three-surface-poc-core/src/test-artifact-verification.live.test.ts')
    guards['G6'] = {p for p in paths if p.startswith('packages/polaris-dossier/src/') and p.count('/') == 3 and p.endswith('.ts') and not p.endswith('.test.ts')}
    guards['G7'] = {'packages/polaris-dossier/src/git-object-reader.ts'}
    guards['G8'] = {'packages/three-surface-poc-core/src/work-items.ts'}
    wm = show(rev, 'apps/three-surface-poc/src/watch-mode.test.ts') or ''
    block = re.search(r'REOBSERVATION_SOURCES\s*=\s*\[(.*?)\]\s*as const', wm, re.S)
    guards['G9'] = set(re.findall(r"'([^']+)'", block.group(1))) if block else set()
    guards['G10'] = test_graph(rev, paths)
    for gid, covered in guards.items():
        hit = sorted(set(pr) & covered)
        print(f'   {gid}: covers {len(covered)} files; PR code paths covered {len(hit)} {hit}')
