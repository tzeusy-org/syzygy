#!/usr/bin/env python3
"""Kill a project run, then start a fresh one, and count the fixture directories of dead processes.

Usage: kill_then_fresh_run.py <worktree> <tree-commit> <out.json> <private-tmpdir> <mode> [<signal>]

<mode> is one of
  clean   one run in an emptied TMPDIR, nothing killed (acceptance 2: a clean run leaves 0)
  sweep   a first run is sent <signal> (KILL unless given; TERM is the other the bead names) (os.killpg of the group this script created, so only its own
          processes are touched) once at least three fixture copies exist; then ONE fresh run in the
          same TMPDIR (acceptance 3: the fresh run leaves 0 directories of dead processes)
  mutant  as `sweep`, but the fresh run uses the tree with the global setup unregistered in
          vitest.config.ts (the `global-setup-not-registered` mutant of mutate_sweep.py: no sweep
          at all), restored afterwards (acceptance 3: the directories of the killed run stay)

Every run is `npx vitest run --project @syzygy/three-surface-poc-app` with TMPDIR=<private-tmpdir>.
A fixture directory is classified from its name: `syzygy-poc-surface-fixture-[template-]p<pid>-n<namespace>-XXXXXX`
carries an owner pid (and the PID namespace it belongs to; this tool runs in the namespace of the runs it starts), which is dead when kill(pid, 0) answers ESRCH; any other
`syzygy-poc-surface-fixture-*` is a legacy name with no owner. The listings are taken from the
directory itself; nothing is typed. vitest.config.ts and apps/three-surface-poc/src must be
committed before the run.
"""
import hashlib
import json
import os
import pathlib
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time


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


WT, COMMIT, OUT, TMP, MODE = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]).resolve(), pathlib.Path(sys.argv[4]).resolve(), sys.argv[5]
SIGNAL_NAME = sys.argv[6] if len(sys.argv) > 6 else 'KILL'
assert MODE in ('clean', 'sweep', 'mutant'), MODE
assert SIGNAL_NAME in ('KILL', 'TERM'), SIGNAL_NAME
PROJECT = '@syzygy/three-surface-poc-app'
SRC = 'vitest.config.ts'
TREE = ['vitest.config.ts', 'apps/three-surface-poc/src']
CODE = ['apps/three-surface-poc/src/fixture-directories.ts', 'apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts',
        'apps/three-surface-poc/src/test-model-fixture.ts', 'vitest.config.ts']  # the files the sweep is made of, hashed into the record
MIN_COPIES = 3
PREFIX = 'syzygy-poc-surface-fixture-'
NAME = re.compile(r'^syzygy-poc-surface-fixture-(template-)?p(\d+)-n(\d+)-')
MUTANT_OLD = "          // Once per run: removes the fixture directories of killed runs (syzygy-bpyt.4.10).\n          globalSetup: [fileURLToPath(new URL('./apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts', import.meta.url))],\n"
MUTANT_NEW = ''

run_git = lambda *a: subprocess.run(['git', *a], cwd=WT, capture_output=True, text=True, check=True).stdout.strip()
assert run_git('rev-parse', 'HEAD') == COMMIT or run_git('rev-parse', COMMIT) == run_git('rev-parse', 'HEAD'), 'the worktree must be at <tree-commit>'
assert run_git('status', '--porcelain', '--', *TREE) == '', f'{TREE} must be committed'
FULL_COMMIT = run_git('rev-parse', 'HEAD')
TMP = private_directory(TMP)
TMP.mkdir(parents=True)


def alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except OSError:
        return True


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


def listing() -> dict:
    names = sorted(p.name for p in TMP.iterdir() if p.name.startswith(PREFIX))
    dead, live, legacy = [], [], []
    for name in names:
        match = NAME.match(name)
        if match is None:
            legacy.append(name)
        elif alive(int(match.group(2))):
            live.append(name)
        else:
            dead.append(name)
    kind = lambda group: {'copies': sum(1 for n in group if not n.startswith(PREFIX + 'template-')), 'templates': sum(1 for n in group if n.startswith(PREFIX + 'template-'))}
    return {
        'fixtureDirectories': len(names),
        'ofDeadProcesses': {'count': len(dead), **kind(dead), 'ownerPids': sorted({int(NAME.match(n).group(2)) for n in dead})},
        'ofLiveProcesses': {'count': len(live), **kind(live)},
        'withoutAnOwnerPid': {'count': len(legacy)},
        'otherEntries': sum(1 for p in TMP.iterdir() if not p.name.startswith(PREFIX)),
    }


def project_run(report: pathlib.Path, new_session: bool = True) -> subprocess.Popen:
    cmd = ['npx', 'vitest', 'run', '--project', PROJECT, '--reporter=json', f'--outputFile={report}']
    return subprocess.Popen(cmd, cwd=WT, env={**os.environ, 'TMPDIR': str(TMP)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=new_session)


def summary(report: pathlib.Path) -> dict:
    if not report.exists():
        return {'report': 'missing'}
    data = json.loads(report.read_text())
    return {k: data[k] for k in ('numTotalTestSuites', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTotalTests', 'success')} | {
        'testFiles': len(data['testResults']), 'testFilesFailed': sum(1 for f in data['testResults'] if f['status'] != 'passed'),
        'failing': [{'file': f['name'].split('/apps/')[-1], 'test': a['fullName'], 'firstErrorLine': (a['failureMessages'][0].splitlines() or [''])[0] if a['failureMessages'] else ''}
                    for f in data['testResults'] for a in f['assertionResults'] if a['status'] == 'failed']}


scratch = pathlib.Path(tempfile.mkdtemp(prefix='zz-kill-fresh-'))
record: dict = {'tool': 'kill_then_fresh_run.py', 'treeCommit': FULL_COMMIT, 'mode': MODE, 'signal': 'SIG' + SIGNAL_NAME if MODE != 'clean' else None, 'command': f'npx vitest run --project {PROJECT} (TMPDIR=<emptied private directory>)',
                'sha256AtCommit': {n: hashlib.sha256((WT / n).read_bytes()).hexdigest() for n in CODE}, 'minCopiesBeforeSignal': MIN_COPIES}
original = (WT / SRC).read_text()
try:
    if MODE != 'clean':
        killed_report = scratch / 'killed.json'
        started = time.time()
        first = project_run(killed_report)
        at_kill = None
        while first.poll() is None:
            now = listing()
            copies = now['ofLiveProcesses']['copies'] + now['ofDeadProcesses']['copies']
            if copies >= MIN_COPIES:
                at_kill = {'secondsIntoTheRun': round(time.time() - started, 1), **now}
                os.killpg(first.pid, getattr(signal, 'SIG' + SIGNAL_NAME))
                break
            time.sleep(0.1)
        first.wait()
        time.sleep(5)
        record['killedRun'] = {'signal': 'SIG' + SIGNAL_NAME, 'sentToTheProcessGroupOfTheRunItStarted': True, 'runFinishedBeforeTheSignal': at_kill is None, 'atSignal': at_kill, 'fiveSecondsAfterSignal': listing()}
        assert at_kill is not None, 'the first run ended before three fixture copies existed'
    if MODE == 'mutant':
        assert original.count(MUTANT_OLD) == 1, 'the global setup registration must occur exactly once'
        (WT / SRC).write_text(original.replace(MUTANT_OLD, MUTANT_NEW, 1))
        record['mutant'] = {'id': 'global-setup-not-registered', 'file': SRC, 'old': MUTANT_OLD, 'new': MUTANT_NEW}
    fresh_report = scratch / 'fresh.json'
    began = time.time()
    fresh = project_run(fresh_report)
    fresh.wait()
    record['freshRun'] = {'exit': fresh.returncode, 'seconds': round(time.time() - began, 1), **summary(fresh_report), 'left': listing()}
finally:
    (WT / SRC).write_text(original)
assert hashlib.sha256((WT / SRC).read_bytes()).hexdigest() == record['sha256AtCommit'][SRC], 'source not restored'
record['processesStillNamingThisTmpdir'] = owners()
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({k: record[k] for k in record if k in ('mode', 'killedRun', 'freshRun')}, indent=1)[:3000])
shutil.rmtree(scratch, ignore_errors=True)
