#!/usr/bin/env python3
"""How long may TMPDIR be before Chrome will not launch, before and after the fix?

Usage: tmpdir_length_probe.py <worktree> <tree-commit> <out.json> <private-parent> <mode>

Chrome binds its process singleton's socket (a Unix socket, `sun_path` 108 bytes on Linux) at
`<temp directory>/.com.google.Chrome.<random>/SingletonSocket`, so TMPDIR may be at most 65 bytes long and
the launch dies with a signal beyond that. The fix leaves Chrome's temp directory alone (a first attempt that
pointed it at the profile cut the limit to 39 bytes and was dropped). This probe measures the limit, to show it
did not move: for each length it makes a directory of exactly that many bytes under <private-parent>, runs one
launch through `launch_close.mjs` with TMPDIR set to it, and records whether the launch succeeded and the first
line of the error otherwise. A close that throws the drain error (the documented retention under host load) is not a verdict on the
socket path: the launch is tried up to 3 times and, if every try ends so, the length is recorded as inconclusive because of load
and counted as neither launched nor failed.

<mode> is `head` (the tree as committed) or `base` (the call that removes the Chrome singleton directory
dropped from removeBrowserProfile, rebuilt, and restored and rebuilt afterwards: the `singleton-directory-kept`
mutant, the helper as it was) or `rejected` (Chrome launched with the profile as its temp directory, `env:
{ ...process.env, TMPDIR: profile }` added to the spawn options: the first approach, commit 0856f922, dropped
because it cut the limit). The lengths are fixed in LENGTHS; the record states the longest that launched and
the shortest that did not.
"""
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys

WT, COMMIT, OUT, PARENT, MODE = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]).resolve(), pathlib.Path(sys.argv[4]).resolve(), sys.argv[5]
assert MODE in ('head', 'base', 'rejected'), MODE
SRC = 'apps/three-surface-poc/src/cdp-browser.ts'
REMOVAL = '  if (singleton !== undefined) removeChromeSingletonDirectory(singleton);\n'
KEPT = '  if (singleton !== undefined) void singleton;\n'
SPAWN_OPTIONS = "{ stdio: ['ignore', 'ignore', 'pipe'], detached: true },"
SPAWN_WITH_PROFILE_TMPDIR = "{ stdio: ['ignore', 'ignore', 'pipe'], detached: true, env: { ...process.env, TMPDIR: profile } },"
LENGTHS = [30, 36, 38, 39, 40, 41, 42, 44, 50, 56, 62, 64, 65, 66, 67, 70, 80]
ATTEMPTS = 3
LOAD_SIGNATURE = 'drain did not verify'
HERE = pathlib.Path(__file__).resolve().parent
git = lambda *a: subprocess.run(['git', *a], cwd=WT, capture_output=True, text=True, check=True).stdout.strip()
assert git('rev-parse', 'HEAD') == git('rev-parse', COMMIT), 'the worktree must be at <tree-commit>'
assert git('status', '--porcelain', '--', 'apps', 'packages', 'vitest.config.ts') == '', 'the tree must be committed'
build = lambda: subprocess.run(['npx', 'tsc', '-b', 'apps/three-surface-poc'], cwd=WT, capture_output=True, text=True)

shutil.rmtree(PARENT, ignore_errors=True)
PARENT.mkdir(parents=True)
original = (WT / SRC).read_text()
digest = hashlib.sha256(original.encode()).hexdigest()
record: dict = {'tool': 'tmpdir_length_probe.py', 'treeCommit': COMMIT, 'mode': MODE, 'file': SRC, 'sha256AtCommit': digest}
rows = []
try:
    if MODE == 'base':
        assert original.count(REMOVAL) == 1, 'the removal call must occur once'
        (WT / SRC).write_text(original.replace(REMOVAL, KEPT, 1))
        record['mutant'] = {'id': 'singleton-directory-kept', 'file': SRC, 'edits': [{'old': REMOVAL, 'new': KEPT}]}
    if MODE == 'rejected':
        assert original.count(SPAWN_OPTIONS) == 1, 'the spawn options must occur once'
        (WT / SRC).write_text(original.replace(SPAWN_OPTIONS, SPAWN_WITH_PROFILE_TMPDIR, 1))
        record['mutant'] = {'id': 'chrome-temp-directory-is-profile', 'file': SRC, 'edits': [{'old': SPAWN_OPTIONS, 'new': SPAWN_WITH_PROFILE_TMPDIR}]}
    built = build()
    assert built.returncode == 0, built.stdout + built.stderr
    for length in LENGTHS:
        directory = PARENT / ('x' * (length - len(str(PARENT)) - 1))
        assert len(str(directory)) == length, (length, len(str(directory)))
        directory.mkdir()
        for attempt in range(1, ATTEMPTS + 1):  # a close that misses its drain deadline under host load says nothing about the socket path: try again
            ran = subprocess.run(['node', str(HERE / 'launch_close.mjs'), str(WT), '1'], cwd=WT, capture_output=True, text=True, env={**os.environ, 'TMPDIR': str(directory)}, timeout=300)
            row = json.loads(ran.stdout)['rows'][0] if ran.returncode == 0 else {'error': ran.stderr.strip().splitlines()[:1]}
            if 'error' not in row or LOAD_SIGNATURE not in str(row['error']):
                break
        error = row.get('error')
        rows.append({'tmpdirLength': length, 'launched': 'error' not in row, 'attempts': attempt,
                     'inconclusiveLoad': error is not None and LOAD_SIGNATURE in str(error),
                     'firstErrorLine': error[:200] if isinstance(error, str) else error})
        shutil.rmtree(directory, ignore_errors=True)
        print(length, 'launched' if rows[-1]['launched'] else 'LOAD' if rows[-1]['inconclusiveLoad'] else 'FAILED', flush=True)
finally:
    (WT / SRC).write_text(original)
    rebuilt = build()
    assert rebuilt.returncode == 0, rebuilt.stdout + rebuilt.stderr
    shutil.rmtree(PARENT, ignore_errors=True)
assert hashlib.sha256((WT / SRC).read_bytes()).hexdigest() == digest, 'source not restored'
ok = [r['tmpdirLength'] for r in rows if r['launched']]
bad = [r['tmpdirLength'] for r in rows if not r['launched'] and not r['inconclusiveLoad']]
inconclusive = [r['tmpdirLength'] for r in rows if r['inconclusiveLoad']]
record |= {'lengthsTried': LENGTHS, 'attemptsPerLength': ATTEMPTS, 'rows': rows, 'longestLaunched': max(ok) if ok else None, 'shortestFailed': min(bad) if bad else None,
           'inconclusiveBecauseOfLoad': inconclusive, 'monotone': not ok or not bad or max(ok) < min(bad)}
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({k: record[k] for k in ('mode', 'longestLaunched', 'shortestFailed', 'monotone')}))
