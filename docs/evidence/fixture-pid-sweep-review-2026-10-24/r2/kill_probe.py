#!/usr/bin/env python3
"""Reviewer's kill-then-fresh-run probe (R-GP-IMPL-FIXTURE-PID-SWEEP-2), unmutated bytes.

Usage: kill_probe.py <clone> <private-tmpdir> <out.json>

1. Starts the app project in a new session under the private TMPDIR and, once 3 PID-named copies
   exist, sends SIGKILL to that session's process group (its own pgid only).
2. Five seconds later classifies every fixture entry: dead / live owner pid (this namespace),
   foreign namespace, or legacy (no pid segment). Lists every process still naming this TMPDIR
   in its environment and stops each by pid after checking that marker.
3. Runs the app project once more, fresh, with a preload that logs every readdirSync of exactly
   this TMPDIR (pid, ppid, argv), then classifies again.
"""
import hashlib
import json
import os
import re
import signal
import subprocess
import sys
import time

clone, tmp, out = sys.argv[1:4]
assert tmp.startswith('/tmp/r509b-') and os.listdir(tmp) == []
TOOLS = os.path.dirname(os.path.abspath(__file__))
NAME = re.compile(r'^syzygy-poc-surface-fixture-(template-)?p(\d+)-n(\d+)-')
LEGACY = re.compile(r'^syzygy-poc-surface-fixture-')
NS = re.search(r'\[(\d+)\]', os.readlink('/proc/self/ns/pid')).group(1)
CMD = ['npx', 'vitest', 'run', '--project', '@syzygy/three-surface-poc-app']
FILES = ['apps/three-surface-poc/src/fixture-directories.ts', 'apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts',
         'apps/three-surface-poc/src/test-model-fixture.ts', 'vitest.config.ts']


def classify():
    rows = {'dead': [], 'live': [], 'foreign': [], 'legacy': []}
    for name in sorted(os.listdir(tmp)):
        m = NAME.match(name)
        if m is None:
            if LEGACY.match(name):
                rows['legacy'].append(name)
            continue
        if m.group(3) != NS:
            rows['foreign'].append(name)
            continue
        try:
            os.kill(int(m.group(2)), 0)
            rows['live'].append(name)
        except ProcessLookupError:
            rows['dead'].append(name)
        except PermissionError:
            rows['live'].append(name)
    return rows


def naming_tmpdir():
    found = []
    marker = f'TMPDIR={tmp}'.encode()
    for pid in os.listdir('/proc'):
        if not pid.isdigit() or int(pid) == os.getpid():
            continue
        try:
            env = open(f'/proc/{pid}/environ', 'rb').read().split(b'\0')
            if marker in env:
                found.append({'pid': int(pid), 'cmd': open(f'/proc/{pid}/cmdline', 'rb').read().replace(b'\0', b' ').decode(errors='replace')[:160]})
        except OSError:
            pass
    return found


commit = subprocess.run(['git', '-C', clone, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
dirty = subprocess.run(['git', '-C', clone, 'status', '--porcelain'], capture_output=True, text=True, check=True).stdout.strip()
assert dirty == '', dirty
digests = {f: hashlib.sha256(open(os.path.join(clone, f), 'rb').read()).hexdigest() for f in FILES}
env = {**os.environ, 'TMPDIR': tmp}
log1 = open(os.path.join(TOOLS, 'kill-probe-killed-run.log'), 'w')
started = time.time()
proc = subprocess.Popen(CMD, cwd=clone, env=env, stdout=log1, stderr=subprocess.STDOUT, start_new_session=True)
pgid = os.getpgid(proc.pid)
assert pgid == proc.pid
copies_at_kill = None
while time.time() - started < 900:
    copies = [n for n in os.listdir(tmp) if NAME.match(n) and not NAME.match(n).group(1)]
    if len(copies) >= 3:
        copies_at_kill = len(copies)
        os.killpg(pgid, signal.SIGKILL)
        break
    if proc.poll() is not None:
        break
    time.sleep(0.2)
killed_after = round(time.time() - started, 1)
proc.wait()
time.sleep(5)
after_kill = classify()
orphans = naming_tmpdir()
stopped = []
for o in orphans:
    try:
        env_now = open(f"/proc/{o['pid']}/environ", 'rb').read().split(b'\0')
        if f'TMPDIR={tmp}'.encode() in env_now:
            os.kill(o['pid'], signal.SIGKILL)
            stopped.append(o['pid'])
    except OSError:
        pass
time.sleep(1)

sweep_log = os.path.join(TOOLS, 'kill-probe-readdir.log')
if os.path.exists(sweep_log):
    os.remove(sweep_log)
env2 = {**env, 'NODE_OPTIONS': f"--import={os.path.join(TOOLS, 'count_readdir.mjs')}", 'R509B_SWEEP_LOG': sweep_log}
log2 = open(os.path.join(TOOLS, 'kill-probe-fresh-run.log'), 'w')
fresh_started = time.time()
fresh = subprocess.Popen(CMD, cwd=clone, env=env2, stdout=log2, stderr=subprocess.STDOUT, start_new_session=True)
fresh_exit = fresh.wait(timeout=3000)
fresh_seconds = round(time.time() - fresh_started, 1)
time.sleep(2)
after_fresh = classify()
calls = [json.loads(line) for line in open(sweep_log)] if os.path.exists(sweep_log) else []
tail = open(os.path.join(TOOLS, 'kill-probe-fresh-run.log')).read().splitlines()
summary = [l for l in tail if re.search(r'Test Files|Tests  |Duration', l)]
orphans2 = naming_tmpdir()
stopped2 = []
for o in orphans2:
    try:
        os.kill(o['pid'], signal.SIGKILL)
        stopped2.append(o['pid'])
    except OSError:
        pass
json.dump({'tool': 'kill_probe.py', 'treeCommit': commit, 'sha256AtCommit': digests, 'namespace': NS, 'command': ' '.join(CMD),
           'signal': 'KILL', 'killedAfterSeconds': killed_after, 'copiesAtKill': copies_at_kill,
           'fiveSecondsAfterKill': after_kill, 'processesNamingTmpdirAfterKill': orphans, 'stoppedByPid': stopped,
           'freshRun': {'exit': fresh_exit, 'seconds': fresh_seconds, 'summary': summary, 'after': after_fresh,
                        'readdirOfTmpdirCalls': calls, 'callingPids': sorted({c['pid'] for c in calls})},
           'processesNamingTmpdirAfterFresh': orphans2, 'stoppedByPidAfterFresh': stopped2},
          open(out, 'w'), indent=1)
print('copiesAtKill', copies_at_kill, 'killedAfter', killed_after)
print('afterKill', {k: len(v) for k, v in after_kill.items()}, 'orphans', len(orphans))
print('fresh exit', fresh_exit, summary)
print('afterFresh', {k: len(v) for k, v in after_fresh.items()}, 'readdir(TMPDIR) calls', len(calls), 'pids', sorted({c['pid'] for c in calls}))
