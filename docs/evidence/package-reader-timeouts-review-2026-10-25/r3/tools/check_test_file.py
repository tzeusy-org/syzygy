#!/usr/bin/env python3
"""rev-520c: the PR 520 test-file identity claim at the head, and the six duration records' script digest.
usage: python3 -I check_test_file.py CLONE. Read-only (git show)."""
import hashlib, json, re, subprocess, sys

clone = sys.argv[1]
HEAD, R2, BEFORE, R0 = 'e7f3c71ef84f93cbdeef26db54fbdc63e05bc164', 'dc60c5bc', 'ce322e1a', '3e563ec4'
F = 'packages/polaris-generation-consent/src/package-reader.test.ts'
KIT = 'packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts'
E = 'docs/evidence/syzygy-bpyt-4-13'
MEASURE = 'scripts/measure_vitest_test_durations.py'
def show(rev, path): return subprocess.run(['git', 'show', f'{rev}:{path}'], cwd=clone, capture_output=True, check=True).stdout
sha = lambda b: hashlib.sha256(b).hexdigest()
def say(k, v): print(f'{k}: {v}')

head = show(HEAD, F).decode()
hl = head.split('\n')
start = next(i for i, l in enumerate(hl) if l.startswith('// Explicit timeouts (syzygy-bpyt.4.13)'))
end = start
while hl[end].startswith('//'): end += 1
say('comment block lines at head', end - start)
blank_after = hl[end] == ''
rev = hl[:start] + hl[end + (1 if blank_after else 0):]
closers = sum(1 for l in rev if re.fullmatch(r'\s*\}, \d+_000\);', l))
rev = [re.sub(r'^(\s*)\}, \d+_000\);$', r'\1});', l) for l in rev]
say('closers turned back', closers)
say('reversed head == ce322e1a bytes', '\n'.join(rev) == show(BEFORE, F).decode())
say('testkit sha256 at ce322e1a / head, equal', (sha(show(BEFORE, KIT))[:8], sha(show(HEAD, KIT))[:8], show(BEFORE, KIT) == show(HEAD, KIT)))
r0 = sha(show(R0, MEASURE))
say('measure script at 3e563ec4', r0)
for name in ('before-alone', 'before-full-1', 'before-full-2', 'before-profile', 'after-alone', 'after-full'):
    d = json.loads(show(HEAD, f'{E}/{name}.json'))
    say(f'  {name}.json names the 3e563ec4 script', (d['script']['sha256'] == r0, d['subject']['commit'][:8], len(d['runs'])))
