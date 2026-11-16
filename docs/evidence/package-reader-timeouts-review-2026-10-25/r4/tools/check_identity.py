#!/usr/bin/env python3
"""Round-4 identity checks for PR 520: frozen diffs, re-derived diffs, main overlap."""
import hashlib, subprocess, sys

S = '/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad'
C = S + '/rev-520d/clone'
BASE, R3, HEAD, MAIN = 'df6046a153fe130202abdf6bd3045a79ba143879', 'e7f3c71e', 'd6b04c5f03978b2a8fbc87afc61c725d91eca0f4', 'a088f1caf061c1a2062527ce8521c9b64c3c7fd1'


def git(*a):
    return subprocess.run(['git', '-C', C, *a], check=True, capture_output=True).stdout


def sha(b):
    return hashlib.sha256(b).hexdigest()


frozen = {
    'r4-review.diff': ('b7d11dbc9a20dd707e14ae58ed6ddb21001820f1aea260bd5e08c304ef980dc3', git('diff', BASE, HEAD)),
    'r4-delta.diff': ('4ce87af134fe3d426db6eae40deded585e4e439e5a468ecc0a1f51445230588b', git('diff', R3, HEAD)),
}
for name, (want, derived) in frozen.items():
    data = open(f'{S}/lead/b413/{name}', 'rb').read()
    print(f'{name}: frozen sha256 {sha(data)} brief-match {sha(data) == want}; '
          f'derived sha256 {sha(derived)} byte-equal {derived == data}')

for label, a in (('review', BASE), ('delta', R3)):
    ns = git('diff', '--numstat', a, HEAD).decode().splitlines()
    add = sum(int(l.split('\t')[0]) for l in ns)
    rem = sum(int(l.split('\t')[1]) for l in ns)
    print(f'{label} numstat: {len(ns)} files, +{add}/-{rem}')
    for l in ns:
        print('   ', l)

subject = set(git('diff', '--name-only', BASE, HEAD).decode().split('\n')) - {''}
mainch = set(git('diff', '--name-only', BASE, MAIN).decode().split('\n')) - {''}
print(f'subject paths {len(subject)}; main changed paths {BASE[:8]}..{MAIN[:8]}: {len(mainch)}; '
      f'intersection {sorted(subject & mainch)}')
print('merge-base head main:', git('merge-base', HEAD, MAIN).decode().strip())
print('main changes under packages/polaris-generation-consent/:',
      sorted(p for p in mainch if p.startswith('packages/polaris-generation-consent/')))
print('main changes any vitest.config:', sorted(p for p in mainch if 'vitest.config' in p))
print('main changes scripts/measure_* or size_*:', sorted(p for p in mainch if p.startswith('scripts/measure_') or p.startswith('scripts/size_vitest')))
# paths changed R3..HEAD over the whole tree
print('R3..HEAD whole-tree name-status:')
print(git('diff', '--name-status', R3, HEAD).decode())
for rev in (R3, HEAD):
    b = git('show', f'{rev}:scripts/measure_vitest_test_durations.py')
    print(f'measure script at {rev[:8]}: {sha(b)}  {len(b.splitlines())} lines')
