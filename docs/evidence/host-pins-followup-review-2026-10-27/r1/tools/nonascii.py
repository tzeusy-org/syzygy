#!/usr/bin/env python3
"""Non-ASCII sweep over every added and removed line of a diff, and over the three subject test files whole.

Usage: python3 -I nonascii.py <repo> <base> <head> <out.json>

Denominator: every '+'/'-' content line of `git diff <base> <head>` (file headers excluded), per file,
plus every line of each subject test file at <head>. A non-ASCII character is reported with its
code point, file and line text; U+00A0 is counted separately.
"""
import json
import subprocess
import sys

repo, base, head, out = sys.argv[1:5]
SUBJECT = ['packages/http-host/src/credentials.test.ts', 'apps/three-surface-poc/src/browser-origin.test.ts',
           'packages/cap1-daemon/src/server.test.ts']


def git(*args):
    return subprocess.run(['git', '-C', repo, *args], capture_output=True, check=True).stdout.decode('utf8')


diff = git('diff', base, head)
current, per_file, hits = None, {}, []
for line in diff.split('\n'):
    if line.startswith('diff --git '):
        current = line.split(' b/', 1)[1]
        per_file.setdefault(current, {'added': 0, 'removed': 0})
        continue
    if line.startswith('+++ ') or line.startswith('--- '):
        continue
    if line and line[0] in '+-' and current is not None:
        per_file[current]['added' if line[0] == '+' else 'removed'] += 1
        for ch in line[1:]:
            if ord(ch) > 127:
                hits.append({'file': current, 'sign': line[0], 'cp': f'U+{ord(ch):04X}', 'line': line[:160]})
whole = {}
for path in SUBJECT:
    text = git('show', f'{head}:{path}')
    cps = sorted({f'U+{ord(c):04X}' for c in text if ord(c) > 127})
    whole[path] = {'lines': text.count('\n'), 'nonAsciiCodePoints': cps, 'nbsp': text.count(' '),
                   'escapeU00a0': text.count('\\u00a0')}
code_lines = sum(v['added'] + v['removed'] for k, v in per_file.items() if k in SUBJECT)
code_hits = [h for h in hits if h['file'] in SUBJECT]
res = {'base': base, 'head': head, 'files': len(per_file),
       'changedLines': sum(v['added'] + v['removed'] for v in per_file.values()),
       'codeChangedLines': code_lines, 'codeNonAscii': code_hits, 'nonAsciiAll': len(hits),
       'nonAsciiByFile': {f: sum(h['file'] == f for h in hits) for f in per_file if any(h['file'] == f for h in hits)},
       'nbspInChangedLines': sum(h['cp'] == 'U+00A0' for h in hits), 'subjectWhole': whole}
json.dump(res, open(out, 'w'), indent=1, ensure_ascii=True)
print(json.dumps({k: v for k, v in res.items() if k != 'subjectWhole'}, ensure_ascii=True)[:1500])
for p, v in whole.items():
    print(p, v)
