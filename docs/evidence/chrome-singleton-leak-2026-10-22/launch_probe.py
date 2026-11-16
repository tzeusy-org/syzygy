#!/usr/bin/env python3
"""Which Chrome launches leave a `.com.google.Chrome.*` directory in TMPDIR, and does the fix stop it?

Usage: launch_probe.py <worktree> <tree-commit> <out.json> <private-tmpdir> <launches> <mode>

<mode> is `head` (the tree as committed) or `base` (the call that removes the Chrome singleton directory
dropped from removeBrowserProfile, rebuilt, and restored and rebuilt afterwards: the `singleton-directory-kept`
mutant, which is the helper as it was before syzygy-bpyt.4.11). The probe builds the app (`npx tsc -b apps/three-surface-poc`),
empties <private-tmpdir>, and runs `launch_close.mjs` there: <launches> launches in a row, each
recorded with how the Chrome leader ended (exited, or killed by closeDisposableBrowser) and what the
launch added to the temp directory. The criterion is per launch: a launch that ended in SIGKILL is the
one that can leave the directory, because Chrome removes it only on a clean exit. A killed launch may
still leave nothing, when Chrome had removed the directory before the kill.

A launch whose close THREW (`error` in its row) is not a launch that closed: `closeDisposableBrowser` refuses
to remove the profile until two empty scans show no member of the process group is left, and throws when the
drain deadline passes (it does so under heavy host load, and the profile is retained by design). The Chrome
singleton directory is retained with it. Those launches are counted and what they left is listed apart; the
criterion is over the launches that closed.

`holds` is true when, in `base` mode, at least one killed launch that closed left a Chrome singleton directory
and nothing else that closed left anything (the diagnosis: a leak only after a kill), and when, in `head` mode,
no launch that closed left anything, at least one of them was killed (so the case is not vacuous), and every
entry in the private TMPDIR at the end was left by a launch whose close threw. A run in which no closed launch
was killed holds in neither mode: run it again.
"""
import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import sys

WT, COMMIT, OUT, TMP, LAUNCHES, MODE = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]).resolve(), pathlib.Path(sys.argv[4]).resolve(), sys.argv[5], sys.argv[6]
assert MODE in ('head', 'base'), MODE
SRC = 'apps/three-surface-poc/src/cdp-browser.ts'
REMOVAL = '  if (singleton !== undefined) removeChromeSingletonDirectory(singleton);\n'
KEPT = '  if (singleton !== undefined) void singleton;\n'
HERE = pathlib.Path(__file__).resolve().parent
git = lambda *a: subprocess.run(['git', *a], cwd=WT, capture_output=True, text=True, check=True).stdout.strip()
assert git('rev-parse', 'HEAD') == git('rev-parse', COMMIT), 'the worktree must be at <tree-commit>'
assert git('status', '--porcelain', '--', 'apps', 'packages', 'vitest.config.ts') == '', 'the tree must be committed'
build = lambda: subprocess.run(['npx', 'tsc', '-b', 'apps/three-surface-poc'], cwd=WT, capture_output=True, text=True)

shutil.rmtree(TMP, ignore_errors=True)
TMP.mkdir(parents=True)
original = (WT / SRC).read_text()
digest = hashlib.sha256(original.encode()).hexdigest()
record: dict = {'tool': 'launch_probe.py', 'treeCommit': COMMIT, 'mode': MODE, 'file': SRC, 'sha256AtCommit': digest, 'launchesRequested': int(LAUNCHES)}
try:
    if MODE == 'base':
        assert original.count(REMOVAL) == 1, 'the removal call must occur once'
        (WT / SRC).write_text(original.replace(REMOVAL, KEPT, 1))
        record['mutant'] = {'id': 'singleton-directory-kept', 'file': SRC, 'edits': [{'old': REMOVAL, 'new': KEPT}]}
    built = build()
    record['build'] = {'command': 'npx tsc -b apps/three-surface-poc', 'exit': built.returncode, 'firstLine': (built.stdout + built.stderr).strip().splitlines()[:1]}
    assert built.returncode == 0, built.stdout + built.stderr
    command = ['node', str(HERE / 'launch_close.mjs'), str(WT), LAUNCHES]
    ran = subprocess.run(command, cwd=WT, capture_output=True, text=True, env={**__import__('os').environ, 'TMPDIR': str(TMP)}, timeout=1500)
    record['run'] = {'command': 'TMPDIR=<private> node launch_close.mjs <worktree> <launches>', 'exit': ran.returncode, 'stderrFirstLine': ran.stderr.strip().splitlines()[:1]}
    assert ran.returncode == 0, ran.stderr
    result = json.loads(ran.stdout)
finally:
    (WT / SRC).write_text(original)
    rebuilt = build()
    assert rebuilt.returncode == 0, rebuilt.stdout + rebuilt.stderr
assert hashlib.sha256((WT / SRC).read_bytes()).hexdigest() == digest, 'source not restored'

chrome = re.compile(r'^\.?(com\.google\.Chrome|org\.chromium\.Chromium)\.')
rows = result['rows']
closed = [r for r in rows if 'error' not in r]
threw = [r for r in rows if 'error' in r]
killed = [r for r in closed if r.get('signalCode') == 'SIGKILL']
exited = [r for r in closed if r.get('exitCode') == 0]
left = lambda r: any(chrome.match(n) for n in r['newEntries'])
final = sorted(p.name for p in TMP.iterdir() if p.name != 'node-compile-cache')
left_by_threw = sorted({n for r in threw for n in r['newEntries']})
summary = {
    'launches': len(rows), 'launchesThatClosed': len(closed), 'launchesWhoseCloseThrew': len(threw),
    'closeErrors': sorted({r['error'] for r in threw}),
    'killed': len(killed), 'exitedCleanly': len(exited),
    'killedAndLeftAChromeDirectory': sum(1 for r in killed if left(r)), 'exitedAndLeftAChromeDirectory': sum(1 for r in exited if left(r)),
    'closedLaunchesThatLeftAnything': sum(1 for r in closed if r['newEntries']),
    'leftByLaunchesWhoseCloseThrew': left_by_threw,
    'entriesInPrivateTmpdirAtTheEnd': final,
    'entriesAtTheEndNotLeftByAThrownClose': [n for n in final if n not in left_by_threw],
}
if MODE == 'base':
    summary['holds'] = (summary['killedAndLeftAChromeDirectory'] > 0 and summary['exitedAndLeftAChromeDirectory'] == 0
                        and summary['closedLaunchesThatLeftAnything'] == summary['killedAndLeftAChromeDirectory'])
else:
    summary['holds'] = len(killed) > 0 and summary['closedLaunchesThatLeftAnything'] == 0 and summary['entriesAtTheEndNotLeftByAThrownClose'] == []
version = subprocess.run([result['executable'], '--version'], capture_output=True, text=True).stdout.strip()
record |= {'executable': result['executable'], 'browserVersion': version, 'privateTmpdirLength': result['tmpdirLength'], 'rows': rows, 'summary': summary}
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps(summary, indent=1))
shutil.rmtree(TMP, ignore_errors=True)
