#!/usr/bin/env python3
"""rev-535: subject identity checks for PR 535 against git objects.

Usage: python3 -I identity.py <repo> <subject-diff-file> <main-ref>
"""
import hashlib
import subprocess
import sys

repo, subject, main = sys.argv[1:4]
BASE, CODE, EV = '546f1ff066e2ffef749c757cdb4621336039113b', '01df68eab9ef3f9b6f556c6aa00f28c70ba6e5f1', '9ebfa92d301de633b7c40a3f2276219330016d33'


def git(*a, text=True):
    return subprocess.run(['git', '-C', repo, *a], capture_output=True, text=text, check=True).stdout


def sha(b):
    return hashlib.sha256(b).hexdigest()


print('subject file sha256', sha(open(subject, 'rb').read()))
print('git diff BASE EV sha256', sha(git('diff', BASE, EV, text=False)), git('diff', '--shortstat', BASE, EV).strip())
print('git diff BASE CODE sha256', sha(git('diff', BASE, CODE, text=False)), git('diff', '--shortstat', BASE, CODE).strip())
print('subject file == git diff BASE EV:', open(subject, 'rb').read() == git('diff', BASE, EV, text=False))
print('merge-base(EV, main)', git('merge-base', EV, main).strip(), '| EV parent', git('rev-parse', EV + '^').strip(),
      '| CODE parent', git('rev-parse', CODE + '^').strip())
code = git('diff', '--name-only', BASE, CODE).split()
print('code diff files', len(code), code)
print('non-test files in code diff', [p for p in code if not p.endswith('.test.ts')])
ev = git('diff', '--name-only', CODE, EV).split()
print('evidence commit paths', len(ev), 'all under docs/evidence/syzygy-bpyt-7-14/:', all(p.startswith('docs/evidence/syzygy-bpyt-7-14/') for p in ev))
sub = set(git('diff', '--name-only', BASE, EV).split())
ch = set(git('diff', '--name-only', BASE, main).split())
print('main', git('rev-parse', main).strip(), 'paths changed since BASE', len(ch), 'overlap with subject', sorted(ch & sub))
print('main first-parent commits since BASE:', git('log', '--oneline', '--first-parent', f'{BASE}..{main}').strip().split('\n'))
print('main code paths changed since BASE:', sorted(p for p in ch if p.startswith(('apps/', 'packages/', 'scripts/')) or '/' not in p))
frozen = [p for p in sub if p.startswith(('docs/evidence/syzygy-bpyt-7-3/', 'docs/evidence/http-host-review-2026-10-27/'))]
print('subject paths under the frozen PR 529 evidence:', frozen)
