#!/usr/bin/env python3
"""Which vitest test files transitively import each mutated product module?

Usage: python3 -I importers.py <tree> <out.json>

Static import graph over tracked *.ts under packages/ and apps/: `import ... from '<s>'`,
`export ... from '<s>'`, bare `import '<s>'` and `import('<s>')`. Relative specifiers
resolve `.js` -> `.ts` (then `/index.ts`); `@syzygy/*` resolves by the root vitest.config.ts
alias table (copied here as literals). Test files are the root config's nine project globs.
Subprocess launches (a test spawning a built `dist/` binary) are not import edges and are
not seen.
"""
import json
import os
import re
import subprocess
import sys

tree, out = sys.argv[1:3]
ALIAS = {
    '@syzygy/support': 'packages/support/src/index.ts',
    '@syzygy/polaris-generation-core/live': 'packages/polaris-generation-core/src/live.ts',
    '@syzygy/polaris-generation-core': 'packages/polaris-generation-core/src/index.ts',
    '@syzygy/polaris-generation-consent/live': 'packages/polaris-generation-consent/src/live.ts',
    '@syzygy/polaris-generation-consent/testing': 'packages/polaris-generation-consent/src/testing.ts',
    '@syzygy/polaris-generation-consent': 'packages/polaris-generation-consent/src/index.ts',
    '@syzygy/polaris-dossier': 'packages/polaris-dossier/src/index.ts',
    '@syzygy/cap1-core/testing': 'packages/cap1-core/src/testing.ts',
    '@syzygy/cap1-core': 'packages/cap1-core/src/index.ts',
    '@syzygy/cap1-daemon': 'packages/cap1-daemon/src/index.ts',
    '@syzygy/http-host': 'packages/http-host/src/index.ts',
    '@syzygy/three-surface-poc-core': 'packages/three-surface-poc-core/src/index.ts',
}
PROJECT_PREFIXES = [
    'packages/support/src/', 'packages/polaris-generation-core/src/', 'packages/polaris-generation-consent/src/',
    'packages/polaris-dossier/src/', 'packages/cap1-conformance/src/', 'packages/cap1-daemon/src/',
    'packages/http-host/src/', 'packages/three-surface-poc-core/src/', 'apps/three-surface-poc/src/',
]
TARGETS = ['packages/http-host/src/credentials.ts', 'apps/three-surface-poc/src/browser-origin.ts',
           'packages/http-host/src/server.ts']
SPEC = re.compile(r"""(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)['"]([^'"\n]+)['"]""", re.M)

files = subprocess.run(['git', '-C', tree, 'ls-files', '-z', '--', 'packages', 'apps'], capture_output=True,
                       text=True, check=True).stdout.split('\0')
ts = {f for f in files if f.endswith('.ts') and '/dist/' not in f}


def resolve(src, spec):
    if spec in ALIAS:
        return ALIAS[spec]
    if not spec.startswith('.'):
        return None
    base = os.path.normpath(os.path.join(os.path.dirname(src), spec))
    for cand in (re.sub(r'\.js$', '.ts', base), base + '.ts', base + '/index.ts', base):
        if cand in ts:
            return cand
    return None


edges = {}
for f in ts:
    text = open(os.path.join(tree, f), encoding='utf8').read()
    edges[f] = {r for r in (resolve(f, s) for s in SPEC.findall(text)) if r}

tests = sorted(f for f in ts if f.endswith('.test.ts') and any(f.startswith(p) for p in PROJECT_PREFIXES))


def closure(start):
    seen, stack = set(), [start]
    while stack:
        cur = stack.pop()
        for nxt in edges.get(cur, ()):
            if nxt not in seen:
                seen.add(nxt)
                stack.append(nxt)
    return seen


reach = {t: closure(t) for t in tests}
result = {'tree': tree, 'tsFiles': len(ts), 'testFiles': len(tests),
          'importers': {target: sorted(t for t in tests if target in reach[t]) for target in TARGETS}}
json.dump(result, open(out, 'w'), indent=1)
for target, ts_ in result['importers'].items():
    print(target, len(ts_))
print('tsFiles', len(ts), 'testFiles', len(tests))
