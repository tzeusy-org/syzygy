#!/usr/bin/env python3
"""Compare each reviewer-derived digest (derive-coreutils.sh output) with the literal typed in the test file at a commit.
Usage: compare-literals.py <clone> <commit> <derive-out.txt>. Prints one row per literal and a total; exit 1 on any mismatch."""
import subprocess, sys
clone, commit, path = sys.argv[1:4]
FILES = {'C3': 'packages/three-surface-poc-core/src/model.test.ts', 'C11': 'packages/polaris-generation-core/src/dossier-evaluation.test.ts',
         'R3': 'packages/polaris-generation-core/src/dossier-profile.test.ts', 'R9': 'apps/three-surface-poc/src/polaris-generation/durable-lifecycle.test.ts'}
bad = 0; n = 0
for line in open(path):
    pid, key, digest = line.split()
    text = subprocess.run(['git', 'show', f'{commit}:{FILES[pid]}'], cwd=clone, capture_output=True, text=True, check=True).stdout
    count = text.count(f"'{digest}'")
    n += 1; bad += count != 1
    print(('ok ' if count == 1 else 'BAD'), pid, key, 'occurrences-as-quoted-literal=', count)
print(f'literals={n} matched-exactly-once={n-bad} mismatched={bad}')
sys.exit(1 if bad else 0)
