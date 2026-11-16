#!/usr/bin/env python3
"""Subject identity checks for round 3 of PR 522: delta scope and main overlap."""
import subprocess, sys, json

CLONE = sys.argv[1]
BASE = 'a088f1caf061c1a2062527ce8521c9b64c3c7fd1'
R2 = 'ef7996b5'
HEAD = '367dbb7ba341d9af23570b949add5f8bf14faa1a'
MAIN = '8ff50172b127cba676ff32ce62c12c91b2b0d924'
PREFIX = 'docs/evidence/scratch-prefix-census-2026-10-23/'


def names(a, b):
    out = subprocess.run(['git', '-C', CLONE, 'diff', '-z', '--name-only', a, b],
                         check=True, capture_output=True).stdout.decode()
    return [p for p in out.split('\0') if p]


subject = names(BASE, HEAD)
delta = names(R2, HEAD)
main = names(BASE, MAIN)
res = {
    'subjectPaths': len(subject),
    'subjectOutsidePrefix': [p for p in subject if not p.startswith(PREFIX)],
    'deltaPaths': delta,
    'deltaOutsidePrefix': [p for p in delta if not p.startswith(PREFIX)],
    'mainChangedPaths': len(main),
    'mainUnderPrefix': [p for p in main if p.startswith(PREFIX)],
    'mainIntersectSubject': sorted(set(main) & set(subject)),
}
print(json.dumps(res, indent=1))
