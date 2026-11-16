#!/usr/bin/env python3
"""rev-520c identity checks over the PR 520 round-3 subject.
usage: python3 -I check_identity.py CLONE FROZEN_REVIEW_DIFF FROZEN_DELTA_DIFF OUTDIR
Read-only against CLONE (git show / git diff only). Writes the re-derived diffs into OUTDIR. Prints one line per check."""
import hashlib, json, os, re, subprocess, sys

clone, frozen_review, frozen_delta, outdir = sys.argv[1:5]
BASE = 'df6046a153fe130202abdf6bd3045a79ba143879'
R2 = 'dc60c5bc'
FIX = '82565b2f'
HEAD = 'e7f3c71ef84f93cbdeef26db54fbdc63e05bc164'
MAIN = '3ec69299'
MEASURE, SIZE = 'scripts/measure_vitest_test_durations.py', 'scripts/size_vitest_test_timeouts.py'
F = 'packages/polaris-generation-consent/src/package-reader.test.ts'
E = 'docs/evidence/syzygy-bpyt-4-13'
sha = lambda b: hashlib.sha256(b).hexdigest()


def git(*a, text=False):
    return subprocess.run(['git', *a], cwd=clone, capture_output=True, text=text, check=True).stdout


def say(k, v):
    print(f'{k}: {v}')


say('HEAD resolves', git('rev-parse', 'HEAD', text=True).strip())
say('merge-base(HEAD, base)', git('merge-base', HEAD, BASE, text=True).strip())
try:
    say('merge-base(HEAD, main 3ec69299)', git('merge-base', HEAD, MAIN, text=True).strip())
except subprocess.CalledProcessError as e:
    say('merge-base(HEAD, main 3ec69299)', f'error {e.returncode}')

review = git('diff', BASE, HEAD)
open(os.path.join(outdir, 'rederived-review.diff'), 'wb').write(review)
say('re-derived git diff df6046a1 e7f3c71e sha256', sha(review))
say('frozen r3-review.diff sha256', sha(open(frozen_review, 'rb').read()))
say('review diff byte-equal', review == open(frozen_review, 'rb').read())
paths = git('diff', '--name-only', BASE, HEAD, text=True).split()
say('subject paths', len(paths))
for p in paths:
    print('  ' + p)

delta = git('diff', R2, HEAD, '--', *paths)
open(os.path.join(outdir, 'rederived-delta.diff'), 'wb').write(delta)
say('re-derived git diff dc60c5bc e7f3c71e -- <15 paths> sha256', sha(delta))
say('frozen r3-delta.diff sha256', sha(open(frozen_delta, 'rb').read()))
say('delta diff byte-equal', delta == open(frozen_delta, 'rb').read())
ns = git('diff', '--numstat', R2, HEAD, '--', *paths, text=True).strip().split('\n')
say('delta numstat', ns)
add = sum(int(l.split('\t')[0]) for l in ns)
rem = sum(int(l.split('\t')[1]) for l in ns)
say('delta +/-', (add, rem))
# whole-tree delta, to see whether dc60c5bc..e7f3c71e touches anything outside the subject paths
say('dc60c5bc..e7f3c71e all changed paths', git('diff', '--name-only', R2, HEAD, text=True).split())

# main changed since base vs subject paths
try:
    mc = git('diff', '--name-only', BASE, MAIN, text=True).split()
    say('main changed files since base', len(mc))
    say('overlap with subject paths', sorted(set(mc) & set(paths)))
except subprocess.CalledProcessError as e:
    say('main diff', f'error {e.returncode}')

for rev in (R2, FIX, HEAD):
    say(f'{MEASURE} sha256 at {rev[:8]}', sha(git('show', f'{rev}:{MEASURE}')))
say('fix 82565b2f script == head script', git('show', f'{FIX}:{MEASURE}') == git('show', f'{HEAD}:{MEASURE}'))
say('82565b2f..e7f3c71e changed paths', git('diff', '--name-only', FIX, HEAD, text=True).split())
say('dc60c5bc..82565b2f changed paths', git('diff', '--name-only', R2, FIX, text=True).split())
for rev in (R2, HEAD):
    say(f'{SIZE} sha256 at {rev[:8]}', sha(git('show', f'{rev}:{SIZE}')))
say(f'{F} sha256 at dc60c5bc / head', (sha(git('show', f'{R2}:{F}')), sha(git('show', f'{HEAD}:{F}'))))
say('test file byte-equal dc60c5bc vs head', git('show', f'{R2}:{F}') == git('show', f'{HEAD}:{F}'))


def timeouts(text):
    lines, out = text.split('\n'), []
    for i, l in enumerate(lines):
        m = re.fullmatch(r'(\s*)\}, (\d+_000)\);', l)
        if not m:
            continue
        ind = m.group(1)
        for j in range(i - 1, -1, -1):
            o = re.match(re.escape(ind) + r"(it|test|describe|beforeAll|beforeEach|afterAll|afterEach)(\.\w+)?\((['\"`])(.*?)\3", lines[j])
            if o and lines[j].startswith(ind) and not lines[j].startswith(ind + ' '):
                out.append((o.group(1), o.group(4), m.group(2)))
                break
        else:
            out.append(('?', '?', m.group(2)))
    return out


th = timeouts(git('show', f'{HEAD}:{F}').decode())
tb = timeouts(git('show', f'{BASE}:{F}').decode())
t2 = timeouts(git('show', f'{R2}:{F}').decode())
say('timeouts at base / dc60c5bc / head', (len(tb), len(t2), len(th)))
say('timeouts equal dc60c5bc vs head', t2 == th)
say('timeout values', sorted(int(t[2].replace('_', '')) for t in th))
# second method: count of every `, N_000)` occurrence in the file
src = git('show', f'{HEAD}:{F}').decode()
say('second method: re.findall(r", \\d+_000\\)") count at head', len(re.findall(r', \d+_000\)', src)))

# evidence directory: which files changed since dc60c5bc
say('evidence files at head', len([p for p in git('ls-tree', '-r', '--name-only', HEAD, E + '/', text=True).split('\n') if p]))
say('evidence files changed dc60c5bc..head', git('diff', '--name-only', R2, HEAD, '--', E, text=True).split())
