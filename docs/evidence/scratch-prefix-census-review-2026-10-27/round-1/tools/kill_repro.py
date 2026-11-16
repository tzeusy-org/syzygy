#!/usr/bin/env python3
"""Independent reproduction of one census kill point, without the PR's tracer or sampler.

Usage: kill_repro.py <clone> <private-dir (short, absent or empty)> <kill-after-seconds> <out.json>

Starts `npx vitest run` in <clone> as the leader of a new session with TMPDIR=<private-dir>/tmp, SIGKILLs that process group after
<kill-after-seconds>, waits 20 s, lists the temp directory, finds this user's processes whose arguments carry the exact
`--user-data-dir=<private-dir>/tmp/` marker or whose readable environment carries TMPDIR=<private-dir>/tmp, and stops them by pid
(SIGTERM up to three rounds, then SIGKILL by pid after re-checking the marker). Lists again. Nothing is matched by name; nothing
outside <private-dir> is read for deletion and nothing is deleted (the caller removes <private-dir> after reading the record).
"""
import json
import os
import pathlib
import signal
import subprocess
import sys
import time

clone, private, kill_after, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), float(sys.argv[3]), pathlib.Path(sys.argv[4])
assert private.is_absolute() and len(str(private)) <= 30 and str(private) not in ('/', '/tmp') and (not private.exists() or not any(private.iterdir()))
tmp = private / 'tmp'
tmp.mkdir(parents=True)
marker, env_marker = f'--user-data-dir={tmp}/', f'TMPDIR={tmp}'.encode()
me = os.getuid()


def mine() -> list:
    found = []
    for name in os.listdir('/proc'):
        if not name.isdigit():
            continue
        try:
            if os.stat(f'/proc/{name}').st_uid != me:
                continue
            args = open(f'/proc/{name}/cmdline', 'rb').read().replace(b'\0', b' ').decode('utf-8', 'replace')
            try:
                environ = open(f'/proc/{name}/environ', 'rb').read().split(b'\0')
            except OSError:
                environ = []
            stat = open(f'/proc/{name}/stat').read()
            fields = stat[stat.rindex(')') + 2:].split()
            if marker in args or env_marker in environ:
                found.append({'pid': int(name), 'pgid': int(fields[2]), 'state': fields[0], 'byMarker': marker in args, 'args': args[:160]})
        except (OSError, IndexError, ValueError):
            continue
    return found


def listing() -> list:
    rows = []
    for e in sorted(os.scandir(tmp), key=lambda e: e.name):
        try:
            st = e.stat(follow_symlinks=False)
        except OSError:
            continue
        rows.append({'name': e.name, 'kind': 'dir' if e.is_dir(follow_symlinks=False) else 'link' if e.is_symlink() else 'file', 'mtime': round(st.st_mtime, 1)})
    return rows


record = {'tool': 'kill_repro.py', 'head': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=clone, capture_output=True, text=True).stdout.strip(),
          'tmpdir': str(tmp), 'killAfterSeconds': kill_after, 'loadAverageAtStart': os.getloadavg()}
log = open(private / 'run.log', 'w')
started = time.time()
leader = subprocess.Popen(['npx', 'vitest', 'run'], cwd=clone, env={**os.environ, 'TMPDIR': str(tmp)}, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
pgid = os.getpgid(leader.pid)
while time.time() < started + kill_after and leader.poll() is None:
    time.sleep(0.5)
record['finishedBeforeSignal'] = leader.poll() is not None
record['secondsIntoTheRun'] = round(time.time() - started, 1)
if not record['finishedBeforeSignal']:
    record['entriesAtSignal'] = len(os.listdir(tmp))
    os.killpg(pgid, signal.SIGKILL)
leader.wait(timeout=60)
log.close()
time.sleep(20)
record['listingAfterKill'] = listing()
survivors = mine()
record['survivorsAfterKill'] = {'count': len(survivors), 'byMarker': sum(p['byMarker'] for p in survivors), 'inKilledGroup': sum(p['pgid'] == pgid for p in survivors),
                                'states': sorted({p['state'] for p in survivors}), 'pids': sorted(p['pid'] for p in survivors), 'sample': survivors[:4]}
rounds = 0
for rounds in range(1, 4):
    live = mine()
    if not live:
        rounds -= 1
        break
    for p in live:
        try:
            os.kill(p['pid'], signal.SIGTERM)
        except ProcessLookupError:
            pass
    time.sleep(8)
left = mine()
killed_hard = []
for p in left:
    if p['byMarker'] or p['pid'] in record['survivorsAfterKill']['pids']:
        try:
            os.kill(p['pid'], signal.SIGKILL)
            killed_hard.append(p['pid'])
        except ProcessLookupError:
            pass
time.sleep(2)
record['stopped'] = {'sigtermRounds': rounds, 'sigkilledByPid': killed_hard, 'remaining': len(mine())}
record['listingAfterStopping'] = listing()
out.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({k: record[k] for k in ('secondsIntoTheRun', 'finishedBeforeSignal', 'entriesAtSignal', 'stopped')} | {'entriesAfterKill': len(record['listingAfterKill']), 'survivors': record['survivorsAfterKill']['count'], 'byMarker': record['survivorsAfterKill']['byMarker']}))
