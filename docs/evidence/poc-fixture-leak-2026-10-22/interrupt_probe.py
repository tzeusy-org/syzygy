#!/usr/bin/env python3
"""Interrupt a project run with a signal and watch what it leaves behind, and for how long.

Usage: interrupt_probe.py <worktree> <tree-commit> <out.json> <private-tmpdir> <signal> <min-copies>

Starts `npx vitest run --project @syzygy/three-surface-poc-app` as the leader of a new
process group with TMPDIR=<private-tmpdir> (emptied first), polls that directory every
0.1 s and, once at least <min-copies> syzygy-poc-surface-fixture-* copies exist, sends
<signal> to that process group (os.killpg of the group this script created, so only this
run's processes are touched; no name or pattern is matched). It then samples, at fixed
offsets, the fixture directories and the other entries in the TMPDIR and the live
processes whose environment names that TMPDIR (read from /proc, read-only). A listing
taken at once may show files that surviving workers still remove, so the record keeps the
whole series.
"""
import json
import os
import pathlib
import signal
import subprocess
import sys
import time
import hashlib
import tempfile


def private_directory(path: pathlib.Path) -> pathlib.Path:
    """This script empties the directory it is given, recursively. Refuse a directory that is, or contains, a shared one
    (/, the temp directory, $TMPDIR, $HOME) and one that already holds anything this script did not make: whoever
    re-runs it removes a leftover by hand, after reading it (syzygy-bpyt.4.10, review round 2, N10)."""
    resolved = path.resolve()
    shared = [pathlib.Path('/'), pathlib.Path(tempfile.gettempdir()), pathlib.Path(os.environ.get('TMPDIR') or '/tmp'), pathlib.Path.home()]
    for directory in (d.resolve() for d in shared):
        if resolved == directory or resolved in directory.parents:
            raise SystemExit(f'refusing {resolved}: it is, or contains, the shared directory {directory}')
    if resolved.exists() and (not resolved.is_dir() or any(resolved.iterdir())):
        raise SystemExit(f'refusing {resolved}: it exists and is not an empty directory')
    return resolved


WT, COMMIT, OUT, TMP = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]).resolve(), pathlib.Path(sys.argv[4]).resolve()
SIGNAL, MIN_COPIES = getattr(signal, 'SIG' + sys.argv[5]), int(sys.argv[6])
OFFSETS = [0, 2, 5, 10, 20, 40, 80]
run_git = lambda *a: subprocess.run(['git', *a], cwd=WT, capture_output=True, text=True, check=True).stdout.strip()
assert run_git('rev-parse', 'HEAD') == run_git('rev-parse', COMMIT), 'the worktree must be at <tree-commit>'
FULL_COMMIT = run_git('rev-parse', 'HEAD')
CODE = ['apps/three-surface-poc/src/fixture-directories.ts', 'apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts',
        'apps/three-surface-poc/src/test-model-fixture.ts', 'vitest.config.ts']  # absent in a tree from before the change: recorded as null
TMP = private_directory(TMP)
TMP.mkdir(parents=True)


def owners() -> list[int]:
    found = []
    for entry in pathlib.Path('/proc').iterdir():
        if not entry.name.isdigit():
            continue
        try:
            environ = (entry / 'environ').read_bytes().split(b'\0')
        except OSError:
            continue
        if f'TMPDIR={TMP}'.encode() in environ:
            found.append(int(entry.name))
    return found


def sample() -> dict:
    names = sorted(p.name for p in TMP.iterdir())
    fixture = [n for n in names if n.startswith('syzygy-poc-surface-fixture-')]
    return {
        'fixtureCopies': sum(1 for n in fixture if not n.startswith('syzygy-poc-surface-fixture-template-')),
        'fixtureTemplates': sum(1 for n in fixture if n.startswith('syzygy-poc-surface-fixture-template-')),
        'otherSyzygyEntries': sum(1 for n in names if n.startswith('syzygy-') and n not in fixture),
        'liveProcessesNamingThisTmpdir': len(owners()),
    }


started = time.time()
run = subprocess.Popen(['npx', 'vitest', 'run', '--project', '@syzygy/three-surface-poc-app'], cwd=WT, env={**os.environ, 'TMPDIR': str(TMP)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
at_signal = None
while run.poll() is None:
    present = sample()
    if present['fixtureCopies'] >= MIN_COPIES:
        at_signal = {'secondsIntoTheRun': round(time.time() - started, 1), **present}
        os.killpg(run.pid, SIGNAL)
        break
    time.sleep(0.1)
signalled = time.time()
series = []
for offset in OFFSETS:
    wait = offset - (time.time() - signalled)
    if wait > 0:
        time.sleep(wait)
    series.append({'secondsAfterSignal': offset, **sample()})
    print(series[-1], flush=True)
run.wait()
OUT.write_text(json.dumps({'tool': 'interrupt_probe.py', 'treeCommit': FULL_COMMIT, 'sha256AtCommit': {n: (hashlib.sha256((WT / n).read_bytes()).hexdigest() if (WT / n).exists() else None) for n in CODE}, 'signal': sys.argv[5], 'minCopiesBeforeSignal': MIN_COPIES, 'atSignal': at_signal, 'runFinishedBeforeSignal': at_signal is None, 'series': series}, indent=1) + '\n')
