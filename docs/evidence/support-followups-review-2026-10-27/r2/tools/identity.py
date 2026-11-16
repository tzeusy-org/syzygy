#!/usr/bin/env python3
"""Round-2 identity checks for PR #538. Usage: identity.py <clone> <subject-diff> <main-ref>

Reads git objects only. Prints one line per check, then a summary line.
"""
import hashlib
import subprocess
import sys

clone, subject, main_ref = sys.argv[1], sys.argv[2], sys.argv[3]


def git(*args, text=True):
    out = subprocess.run(['git', '-C', clone, *args], check=True, capture_output=True)
    return out.stdout.decode() if text else out.stdout


def sha(b):
    return hashlib.sha256(b).hexdigest()


def tree_rows(rev):
    raw = git('ls-tree', '-r', '-z', '--full-tree', rev, text=False)
    rows = {}
    for entry in raw.split(b'\0'):
        if not entry:
            continue
        meta, path = entry.split(b'\t', 1)
        mode, kind, obj = meta.decode().split(' ')
        rows[path.decode()] = (mode, kind, obj)
    return rows


checks = []


def check(name, ok, detail):
    checks.append(ok)
    print(f"{'ok  ' if ok else 'FAIL'} {name}: {detail}")


expect = {
    'subject': 'dfe5317ed5d34a7ef0e8fcb91f9c367187cefa32152a8ff47c81ef8848f3f674',
    'code': '866b2c1f2fcc8c4ce0e654eaff815543e504d2f9f73691ecd1f08187ece34673',
    'whole': '4f447dfc7cd6d89f5c255e20d60aae6555d8b197ad86a73ce48aeb3d8ac0f19e',
}
subject_bytes = open(subject, 'rb').read()
check('subject file sha256', sha(subject_bytes) == expect['subject'], sha(subject_bytes))
d = git('diff', '4b9a4be0', '7d408fd9', text=False)
check('git diff 4b9a4be0 7d408fd9 sha256', sha(d) == expect['subject'], sha(d))
check('subject file == git diff bytes', d == subject_bytes, f'{len(d)} bytes vs {len(subject_bytes)}')
d = git('diff', '4b9a4be0', 'c7ed9ef2', text=False)
check('git diff 4b9a4be0 c7ed9ef2 sha256', sha(d) == expect['code'], sha(d))
d = git('diff', 'eb8fb6cb', '7d408fd9', text=False)
check('git diff eb8fb6cb 7d408fd9 sha256', sha(d) == expect['whole'], sha(d))
for rng in (('4b9a4be0', '7d408fd9'), ('4b9a4be0', 'c7ed9ef2'), ('eb8fb6cb', '7d408fd9')):
    print('     shortstat', *rng, git('diff', '--shortstat', *rng).strip())

parents = git('log', '-1', '--format=%P', '4b9a4be0').split()
check('4b9a4be0 parents', [p[:8] for p in parents] == ['663061c4', 'eb8fb6cb'], ' '.join(parents))
merged = subprocess.run(['git', '-C', clone, 'merge-tree', '--write-tree', parents[0], parents[1]],
                        capture_output=True)
merged_tree = merged.stdout.decode().split('\n')[0]
check('git merge-tree exit', merged.returncode == 0, f'exit={merged.returncode} tree={merged_tree}')
commit_tree = git('rev-parse', '4b9a4be0^{tree}').strip()
check('merge-tree tree == 4b9a4be0 tree (object id)', merged_tree == commit_tree, commit_tree)
a, b = tree_rows(merged_tree), tree_rows('4b9a4be0')
only_a = sorted(set(a) - set(b))
only_b = sorted(set(b) - set(a))
differ = sorted(p for p in set(a) & set(b) if a[p] != b[p])
check('path-for-path (ls-tree -r -z)', not (only_a or only_b or differ),
      f'paths={len(a)}/{len(b)} onlyMergeTree={len(only_a)} onlyCommit={len(only_b)} differ={len(differ)}')

# The repair commits touch what?
for rng in (('4b9a4be0', 'c7ed9ef2'), ('c7ed9ef2', '7d408fd9')):
    names = git('diff', '--name-only', '-z', *rng).split('\0')
    names = [n for n in names if n]
    print(f'     paths {rng[0]}..{rng[1]} ({len(names)}):')
    for n in names:
        print('       ', n)
code_after = [n for n in git('diff', '--name-only', '-z', 'c7ed9ef2', '7d408fd9').split('\0')
              if n and n.split('/')[0] in ('apps', 'packages', 'scripts')]
check('no apps/packages/scripts path after c7ed9ef2', not code_after, f'{len(code_after)} paths')
root_after = [n for n in git('diff', '--name-only', '-z', '4b9a4be0', '7d408fd9').split('\0')
              if n and '/' not in n]
check('no root-level path in subject', not root_after, f'{root_after}')
code_subject = [n for n in git('diff', '--name-only', '-z', '4b9a4be0', '7d408fd9').split('\0')
                if n and n.split('/')[0] in ('apps', 'packages', 'scripts')]
check('subject code paths == [test-artifact-verification.ts]',
      code_subject == ['packages/three-surface-poc-core/src/test-artifact-verification.ts'], f'{code_subject}')

# The revert
path = 'packages/three-surface-poc-core/src/test-artifact-verification.ts'
blobs = {rev: git('rev-parse', f'{rev}:{path}').strip() for rev in ('f7477f52', '663061c4', '4b9a4be0', 'c7ed9ef2', '7d408fd9', main_ref)}
for rev, blob in blobs.items():
    print(f'     {path} at {rev}: {blob}')
check('revert blob == f7477f52 blob', blobs['c7ed9ef2'] == blobs['f7477f52'], blobs['c7ed9ef2'])
fb = git('show', f'f7477f52:{path}', text=False)
cb = git('show', f'c7ed9ef2:{path}', text=False)
check('revert bytes == f7477f52 bytes (second method)', fb == cb, f'sha256 {sha(cb)}')
check('revert blob unchanged at 7d408fd9', blobs['7d408fd9'] == blobs['c7ed9ef2'], blobs['7d408fd9'])
check(f'revert blob == {main_ref} blob', blobs[main_ref] == blobs['f7477f52'], blobs[main_ref])

# The whole PR's code delta over main: does it equal round 1's minus the reverted file?
r1 = sorted(n for n in git('diff', '--name-only', '-z', 'f7477f52', 'b214ef10', '--', 'apps', 'packages', 'scripts').split('\0') if n)
now = sorted(n for n in git('diff', '--name-only', '-z', 'eb8fb6cb', 'c7ed9ef2', '--', 'apps', 'packages', 'scripts').split('\0') if n)
check('own code paths over main == round-1 code paths minus the reverted file',
      now == sorted(set(r1) - {path}), f'round1={len(r1)} now={len(now)} removed={sorted(set(r1) - set(now))} added={sorted(set(now) - set(r1))}')
for p in now:
    x = git('rev-parse', f'b214ef10:{p}').strip()
    y = git('rev-parse', f'c7ed9ef2:{p}').strip()
    if x != y:
        check(f'kept code blob unchanged b214ef10->c7ed9ef2 {p}', False, f'{x} -> {y}')
check('every kept code blob unchanged b214ef10->c7ed9ef2', True, f'{len(now)} paths compared')
d = git('diff', 'eb8fb6cb', 'c7ed9ef2', '--', 'apps', 'packages', 'scripts', text=False)
print('     own code delta over main sha256', sha(d))
d = git('diff', 'eb8fb6cb', '4b9a4be0', '--', 'apps', 'packages', 'scripts', text=False)
check('merge own code delta over main == round-1 7eb6c896', sha(d) == '7eb6c896dd4f49ce23af62319d2407e5c286b4ad10dd27b2771b1c3bf2c70688', sha(d))

print(f'summary checks={len(checks)} ok={sum(checks)} fail={len(checks) - sum(checks)}')
sys.exit(0 if all(checks) else 1)
