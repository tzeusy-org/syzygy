#!/usr/bin/env python3
"""rev-520b identity checks over the PR 520 round-2 subject. usage: python3 -I check_identity.py CLONE
Read-only: uses `git show`/`git diff` only. Prints one line per check."""
import hashlib, json, re, subprocess, sys

clone = sys.argv[1]
BASE, R1, HEAD, BEFORE = 'df6046a153fe130202abdf6bd3045a79ba143879', '3e563ec4', 'dc60c5bcb6ae6f1f31beee3aa0f6117adff5d6cf', 'ce322e1a'
F = 'packages/polaris-generation-consent/src/package-reader.test.ts'
KIT = 'packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts'
E = 'docs/evidence/syzygy-bpyt-4-13'
MEASURE, SIZE = 'scripts/measure_vitest_test_durations.py', 'scripts/size_vitest_test_timeouts.py'
def git(*a, text=True): return subprocess.run(['git', *a], cwd=clone, capture_output=True, text=text, check=True).stdout
def show(rev, path): return git('show', f'{rev}:{path}', text=False)
sha = lambda b: hashlib.sha256(b).hexdigest()
def say(k, v): print(f'{k}: {v}')

# 1. the test file: comment lines only between R1 and HEAD
head, r1, before = (show(r, F).decode() for r in (HEAD, R1, BEFORE))
is_comment = lambda l: l.lstrip().startswith('//')
nc = lambda t: [l for l in t.split('\n') if not is_comment(l)]
say('test file sha256 at ce322e1a / 3e563ec4 / dc60c5bc', ' / '.join(sha(t.encode()) for t in (before, r1, head)))
say('non-comment lines equal 3e563ec4 vs dc60c5bc', nc(r1) == nc(head))
say('non-comment line count', (len(nc(r1)), len(nc(head))))
import difflib
ops = [o for o in difflib.SequenceMatcher(a=r1.split('\n'), b=head.split('\n'), autojunk=False).get_opcodes() if o[0] != 'equal']
changed = [l for o in ops for l in r1.split('\n')[o[1]:o[2]] + head.split('\n')[o[3]:o[4]]]
say('changed hunks / changed lines / all comment lines', (len(ops), len(changed), all(is_comment(l) for l in changed)))
# timeouts: (enclosing it title, timeout) per `}, N_000);` closer
def timeouts(text):
    lines, out = text.split('\n'), []
    for i, l in enumerate(lines):
        m = re.fullmatch(r'(\s*)\}, (\d+_000)\);', l)
        if not m: continue
        ind = m.group(1)
        for j in range(i - 1, -1, -1):
            o = re.match(re.escape(ind) + r"(it|test|describe|beforeAll|beforeEach|afterAll|afterEach)(\.\w+)?\((['\"`])(.*?)\3", lines[j])
            if o and lines[j].startswith(ind) and not lines[j].startswith(ind + ' '):
                out.append((o.group(1), o.group(4), m.group(2))); break
        else: out.append(('?', '?', m.group(2)))
    return out
t1, th = timeouts(r1), timeouts(head)
say('timeouts at 3e563ec4 / dc60c5bc', (len(t1), len(th)))
say('timeouts equal (opener, title, value, order)', t1 == th)
say('openers', sorted(set(t[0] for t in th)))
say('values', sorted(int(t[2].replace('_', '')) for t in th))
# PR line 5: remove the 7-line comment, closers back to `});` -> ce322e1a bytes
hl = head.split('\n')
start = next(i for i, l in enumerate(hl) if l.startswith('// Explicit timeouts (syzygy-bpyt.4.13)'))
end = start
while hl[end].startswith('//'): end += 1
say('comment block lines', end - start)
blank_after = hl[end] == ''
rev = hl[:start] + hl[end + (1 if blank_after else 0):]
rev = [re.sub(r'^(\s*)\}, \d+_000\);$', r'\1});', l) for l in rev]
say('reversed head == ce322e1a bytes (blank line after comment dropped: %s)' % blank_after, '\n'.join(rev) == before)
say('testkit sha256 ce322e1a / dc60c5bc', (sha(show(BEFORE, KIT)), sha(show(HEAD, KIT))))

# 2. the six duration records name 0ef82cd0...
old_measure = sha(show(R1, MEASURE))
say('measure script sha256 at 3e563ec4 / dc60c5bc', (old_measure, sha(show(HEAD, MEASURE))))
for name in ('before-alone', 'before-full-1', 'before-full-2', 'before-profile', 'after-alone', 'after-full'):
    d = json.loads(show(HEAD, f'{E}/{name}.json'))
    say(f'  {name}.json script.sha256 == 3e563ec4 script', (d['script']['sha256'] == old_measure, d['subject']['commit'][:8], d['profile'], len(d['runs'])))
durs = [p for p in git('ls-tree', '-r', '--name-only', HEAD, E + '/').split('\n') if p.endswith('.json')]
say('evidence json files', len(durs))

# 3. timeout-sizing.json
ts = json.loads(show(HEAD, f'{E}/timeout-sizing.json'))
say('timeout-sizing script sha == head size script', ts['script']['sha256'] == sha(show(HEAD, SIZE)))
say('timeout-sizing subject', {k: ts['subject'][k] for k in ('commit', 'dirty')})
say('timeout-sizing subject fileSha256 == head test file / == file at subject commit', (ts['subject']['fileSha256'] == sha(head.encode()), ts['subject']['fileSha256'] == sha(show(ts['subject']['commit'], F))))
ins = ts.get('inputs')
if isinstance(ins, list):
    for i in ins:
        p = i.get('path') or i.get('file')
        say(f'  input {p}', i.get('sha256') == sha(show(HEAD, p)))
say('timeout-sizing top keys', sorted(ts))
say('timeout-sizing check', ts.get('check'))
r1ts = json.loads(show(R1, f'{E}/timeout-sizing.json'))
say('timeout-sizing tests/denominator/inputs equal to 3e563ec4 record', {k: ts.get(k) == r1ts.get(k) for k in ts if k not in ('script', 'subject')})

# 4. measure-restore-probes.json
mp = json.loads(show(HEAD, f'{E}/measure-restore-probes.json'))
say('probe tool sha == committed tool', mp['tool']['sha256'] == sha(show(HEAD, mp['tool']['path'])))
say('probe record commit', mp['commit'])
for s in mp['scripts']:
    say(f"  script {s['version']} at {s['commit'][:8]} sha matches git show", s['sha256'] == sha(show(s['commit'], s['path'])))
say('  new script sha == head script', mp['scripts'][1]['sha256'] == sha(show(HEAD, MEASURE)))
say('probe results', [(r['probe'], r['script'], r['exitCode'], bool(r['treeAfterExit']), len(r['survivors']), r['passes']) for r in mp['results']])
say('probe summary', mp['summary'])
say('48ee832a..dc60c5bc changes', git('diff', '--name-only', mp['commit'], HEAD).split())

# 5. sizing-check-mutants.json
sm = json.loads(show(HEAD, f'{E}/sizing-check-mutants.json'))
say('mutant tool sha == committed tool', sm['tool']['sha256'] == sha(show(HEAD, sm['tool']['path'])))
say('checkScript sha == head size script', sm['checkScript']['sha256'] == sha(show(HEAD, SIZE)))
say('mutants', [(r['id'], r['expectedExit'], r['exitCode'], r['asExpected']) for r in sm['results']])
say('allAsExpected', sm['allAsExpected'])
for r in sm['results']:
    if 'old' in r and isinstance(r['old'], str):
        src = show(HEAD, r['file']).decode()
        say(f"  {r['id']} old fragment occurs in head {r['file']}", src.count(r['old']))
