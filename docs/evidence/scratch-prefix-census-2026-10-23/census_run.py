#!/usr/bin/env python3
"""Run a test command in a private TMPDIR and record what it leaves there, after a clean exit or after a SIGKILL.

Usage: census_run.py [--seed-tmp-from <earlier-private-directory>] <worktree> <commit> <out.json> <private-directory> <mode> <kill-after-seconds> -- <command> [<args>...]

<mode> is `clean` (wait for the command to exit) or `kill` (SIGKILL the command's process group <kill-after-seconds> after it
starts, unless it finished first, which the record says). The command runs from <worktree> as the leader of a new process group, with
TMPDIR=<private-directory>/tmp, so every scratch entry of the run lands in one directory that is empty at the start. Two instruments
run beside it: tmp_sampler.py lists that directory every 0.5 s (first and last sighting of every name), and scratch_trace.cjs, loaded
through NODE_OPTIONS into every Node process of the run, logs each entry created directly in the temp directory with the stack that
created it. The record keeps the trace's digest and line count; the trace itself stays in <private-directory>.

After a kill the run is watched for 80 s. Then the processes still alive are counted: the members of the killed group, and every
process of this user whose arguments carry the exact `--user-data-dir=<private-directory>/tmp/` marker (a killed browser's zygote and
renderers have no readable environment, so an environment test cannot see them). Those are stopped with SIGTERM by pid, repeated up to
three times, and the directory is listed again. Nothing is matched by name, and nothing outside <private-directory> is touched.

--seed-tmp-from starts the run in the leftovers of an earlier run: every entry directly in <earlier-private-directory>/tmp is renamed
into this run's temp directory before the command starts (same file system, nothing copied, so sockets, modes and modification times
are kept), and the entries are listed in the record. It refuses an earlier directory that is not a sibling of <private-directory> or
whose marker still matches a live process. This is how "a killed run, then one fresh run" is measured.

<commit> must be the full 40-hex HEAD of <worktree> and the tracked implementation files must be unmodified. <private-directory> must
not exist or must be empty, must be a short absolute path (at most 30 bytes, so a Chrome socket path fits), and may not be the system
temp directory, `/` or $HOME.
"""
import hashlib
import json
import os
import pathlib
import re
import signal
import subprocess
import sys
import tempfile
import time

HERE = pathlib.Path(__file__).resolve().parent
argv = sys.argv[1:]
SEED = None
if argv[0] == '--seed-tmp-from':
    SEED, argv = pathlib.Path(argv[1]).resolve(), argv[2:]
cut = argv.index('--')
WT, COMMIT, OUT, PRIVATE, MODE, KILL_AFTER = pathlib.Path(argv[0]).resolve(), argv[1], pathlib.Path(argv[2]).resolve(), pathlib.Path(argv[3]), argv[4], float(argv[5])
COMMAND = argv[cut + 1:]
assert MODE in ('clean', 'kill'), MODE
assert re.fullmatch(r'[0-9a-f]{40}', COMMIT), 'give the full 40-hex commit'
git = lambda *a: subprocess.run(['git', *a], cwd=WT, capture_output=True, text=True, check=True).stdout.strip()
assert git('rev-parse', 'HEAD') == COMMIT, 'the worktree must be at <commit>'
assert git('status', '--porcelain', '--untracked-files=no', '--', 'apps', 'packages', 'scripts', 'vitest.config.ts', 'vitest.setup.ts', 'package.json') == '', 'the tracked implementation files must be unmodified'


def private_directory(path: pathlib.Path) -> pathlib.Path:
    resolved = path.resolve()
    assert path.is_absolute() and len(str(path)) <= 30, f'refusing {path}: give a short absolute path'
    assert str(resolved) not in ('/', str(pathlib.Path.home().resolve()), str(pathlib.Path(tempfile.gettempdir()).resolve())), f'refusing {path}: it is a shared directory'
    assert not resolved.exists() or (resolved.is_dir() and not any(resolved.iterdir())), f'refusing {path}: it exists and is not an empty directory'
    return resolved


PRIVATE = private_directory(PRIVATE)
TMP = PRIVATE / 'tmp'
TMP.mkdir(parents=True)
TRACE, SAMPLES, STOP, LOG = PRIVATE / 'trace.jsonl', PRIVATE / 'samples.json', PRIVATE / 'stop-sampler', PRIVATE / 'run.log'
ME = os.getuid()
TICKS = os.sysconf('SC_CLK_TCK')
MARKER = f'--user-data-dir={TMP}/'


def processes() -> list:
    """Every process of this user: pid, ppid, pgid, state, arguments."""
    found = []
    for name in os.listdir('/proc'):
        if not name.isdigit():
            continue
        try:
            if os.stat(f'/proc/{name}').st_uid != ME:
                continue
            stat = open(f'/proc/{name}/stat').read()
            fields = stat[stat.rindex(')') + 2:].split()
            args = open(f'/proc/{name}/cmdline', 'rb').read().replace(b'\0', b' ').decode('utf-8', 'replace')
            found.append({'pid': int(name), 'ppid': int(fields[1]), 'pgid': int(fields[2]), 'state': fields[0], 'args': args})
        except (OSError, IndexError, ValueError):
            continue
    return found


def kind_of(args: str) -> str:
    return args.split('--type=')[1].split()[0] if '--type=' in args else 'leader'


def usage(path: pathlib.Path) -> int:
    total = 0
    for root, dirs, files in os.walk(path, followlinks=False):
        for name in dirs + files:
            try:
                total += os.lstat(os.path.join(root, name)).st_blocks * 512
            except OSError:
                pass
    try:
        total += os.lstat(path).st_blocks * 512
    except OSError:
        pass
    return total


def listing() -> list:
    rows = []
    for entry in sorted(os.scandir(TMP), key=lambda e: e.name):
        try:
            info = entry.stat(follow_symlinks=False)
        except OSError:
            continue
        kind = 'dir' if entry.is_dir(follow_symlinks=False) else 'link' if entry.is_symlink() else 'file'
        rows.append({'name': entry.name, 'kind': kind, 'uid': info.st_uid, 'mtime': round(info.st_mtime, 1), 'bytes': usage(pathlib.Path(entry.path)) if kind != 'link' else 0})
    return rows


def orphans() -> list:
    return [p for p in processes() if MARKER in p['args']]


def seed_entries() -> list:
    """Rename every entry of the earlier run's temp directory into this one; return the names."""
    earlier = SEED / 'tmp'
    assert SEED.parent == PRIVATE.parent and earlier.is_dir(), f'refusing {SEED}: it is not a sibling private directory with a tmp directory'
    assert not any(f'--user-data-dir={earlier}/' in p['args'] for p in processes()), f'refusing {SEED}: a live process still carries its marker'
    names = sorted(os.listdir(earlier))
    for name in names:
        os.rename(earlier / name, TMP / name)
    return names


env = {**os.environ, 'TMPDIR': str(TMP), 'SCRATCH_TRACE_LOG': str(TRACE), 'SCRATCH_TRACE_ROOT': str(WT),
       'NODE_OPTIONS': (os.environ.get('NODE_OPTIONS', '') + f' --require {HERE / "scratch_trace.cjs"}').strip()}
record: dict = {'tool': 'census_run.py', 'treeCommit': COMMIT, 'mode': MODE, 'command': COMMAND, 'privateDirectory': str(PRIVATE), 'tmpdir': str(TMP),
                'sha256': {name: hashlib.sha256((HERE / name).read_bytes()).hexdigest() for name in ('census_run.py', 'scratch_trace.cjs', 'tmp_sampler.py')},
                'loadAverageAtStart': os.getloadavg(), 'killAfterSeconds': KILL_AFTER if MODE == 'kill' else None}
if SEED:
    record['seededFrom'] = {'privateDirectory': str(SEED), 'entriesMovedIn': seed_entries()}
sampler =subprocess.Popen([sys.executable, '-I', str(HERE / 'tmp_sampler.py'), str(TMP), str(SAMPLES), '0.5', str(STOP)], start_new_session=True)
started = time.time()
log = open(LOG, 'w')
leader = subprocess.Popen(COMMAND, cwd=WT, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
pgid = os.getpgid(leader.pid)
record['leader'] = {'pid': leader.pid, 'pgid': pgid}
try:
    if MODE == 'clean':
        leader.wait(timeout=3 * 3600)
        record['exit'] = leader.returncode
        record['seconds'] = round(time.time() - started, 1)
        time.sleep(5)
    else:
        deadline = started + KILL_AFTER
        while time.time() < deadline and leader.poll() is None:
            time.sleep(0.5)
        record['runFinishedBeforeSignal'] = leader.poll() is not None
        record['secondsIntoTheRun'] = round(time.time() - started, 1)
        if not record['runFinishedBeforeSignal']:
            alive = [p for p in processes() if p['pgid'] == pgid]
            record['groupMembersAtSignal'] = len(alive)
            record['entriesAtSignal'] = len(os.listdir(TMP))
            os.killpg(pgid, signal.SIGKILL)
        leader.wait(timeout=60)
        record['exit'] = leader.returncode
        series = []
        for second in (5, 20, 40, 80):
            time.sleep(max(0, started + record['secondsIntoTheRun'] + second - time.time()))
            series.append({'secondsAfterSignal': second, 'entries': len(os.listdir(TMP)), 'groupMembersAlive': len([p for p in processes() if p['pgid'] == pgid and p['state'] != 'Z'])})
        record['afterSignal'] = series
finally:
    log.close()
record['listingAtEnd'] = listing()
survivors = orphans()
record['processesCarryingTheMarker'] = {'marker': '--user-data-dir=<private-directory>/tmp/ in the arguments', 'count': len(survivors),
                                        'byKind': dict(sorted({k: sum(1 for p in survivors if kind_of(p['args']) == k) for k in {kind_of(p['args']) for p in survivors}}.items())),
                                        'pids': sorted(p['pid'] for p in survivors)}
record['groupMembersAliveAtEnd'] = len([p for p in processes() if p['pgid'] == pgid and p['state'] != 'Z'])
stopped = {'signal': 'SIGTERM', 'rounds': 0}
for round_ in range(3):
    live = orphans()
    if not live:
        break
    for p in live:
        try:
            os.kill(p['pid'], signal.SIGTERM)
        except ProcessLookupError:
            pass
    stopped['rounds'] = round_ + 1
    time.sleep(8)
stopped['remaining'] = len(orphans())
record['stoppedByPid'] = stopped
record['listingAfterStopping'] = listing()
open(STOP, 'w').close()
sampler.wait(timeout=30)
record['samplerRecord'] = str(SAMPLES)
trace_lines = TRACE.read_text().splitlines() if TRACE.exists() else []
record['trace'] = {'lines': len(trace_lines), 'sha256': hashlib.sha256(TRACE.read_bytes()).hexdigest() if TRACE.exists() else None}
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({k: record.get(k) for k in ('mode', 'exit', 'seconds', 'secondsIntoTheRun', 'runFinishedBeforeSignal')} | {'entriesAtEnd': len(record['listingAtEnd']), 'orphans': record['processesCarryingTheMarker']['count'], 'trace': record['trace']['lines']}))
