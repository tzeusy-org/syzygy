#!/usr/bin/env python3
"""Apply round 1's three F1 fragments to the prior head's test file and compare with the reviewed head's.

Usage: fragments.py <clone>. Reads git blobs only. Prints each fragment's occurrence count in the prior file, then a
line diff of (prior + fragments) against head, so every head change outside the three fragments is visible.
"""
import difflib
import subprocess
import sys

CLONE = sys.argv[1]
PATH = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
PRIOR, HEAD = 'f7bbb93a005b45c2866d8a9993afbca44cd1a34f', '7459cc7585205e270f90173737c6d59786af650a'

# Copied from round 1's raw, F1 "Proposed fix", lines 333-336.
FRAGMENTS = [
    ("function runSync(args: readonly string[], cwd: string): {",
     "function runSync(args: readonly string[], cwd: string, portEnv: Record<string, string> = { SYZYGY_PORT: '0' }): {"),
    ("env: { ...ENV, SYZYGY_PORT: '0' }", "env: { ...ENV, ...portEnv }"),
    ("path.join(root, '.syzygy', 'x')], dir)).toEqual({", "path.join(root, '.syzygy', 'x')], dir, {})).toEqual({"),
]


def blob(commit: str) -> str:
    return subprocess.run(['git', '-C', CLONE, 'show', f'{commit}:{PATH}'], check=True, capture_output=True,
                          text=True).stdout


prior, head = blob(PRIOR), blob(HEAD)
patched = prior
for index, (old, new) in enumerate(FRAGMENTS, 1):
    print(f'fragment {index}: old occurs {prior.count(old)} in prior, {patched.count(old)} before apply; '
          f'new occurs {head.count(new)} in head; old occurs {head.count(old)} in head')
    patched = patched.replace(old, new, 1)
diff = list(difflib.unified_diff(patched.splitlines(), head.splitlines(), 'prior+fragments', 'head', n=0, lineterm=''))
print(f'prior lines {len(prior.splitlines())}, head lines {len(head.splitlines())}, patched lines {len(patched.splitlines())}')
print('residual diff (prior+fragments -> head):')
print('\n'.join(diff) if diff else '(none)')
