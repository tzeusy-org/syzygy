"""Round-3 reviewer probe (rev-509c): SIGKILL an app-project run, then one fresh run, in one private TMPDIR.

The app project starts in a new session. Once at least <min-copies> fixture copies exist, SIGKILL goes to that
session's process group (by its own pgid, nothing else). Five seconds later the TMPDIR is censused, and any process
of this user whose argv or environ names the TMPDIR is listed and stopped by pid after re-reading that marker. Then
one fresh app-project run goes under the same TMPDIR, and the TMPDIR is censused again.

A fixture entry is classified from its name and signal 0: owned (p<pid>-n<ns>-) with a dead pid, owned with a live
pid, or legacy (no owner segment).

Usage: python3 kill_probe.py <worktree> <out.json> <private-tmpdir> <min-copies>
"""
import hashlib
import json
import os
import re
import signal
import subprocess
import sys
import time

wt, out, tmp, min_copies = sys.argv[1], sys.argv[2], os.path.realpath(sys.argv[3]), int(sys.argv[4])
assert tmp.startswith('/tmp/r509c-') and not os.path.exists(tmp), 'need a new /tmp/r509c-<n> path'
os.makedirs(tmp)
OWNED = re.compile(r'^syzygy-poc-surface-fixture-(?:template-)?p(\d+)-n(\d+)-')
PREFIX = 'syzygy-poc-surface-fixture-'
head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=wt, capture_output=True, text=True, check=True).stdout.strip()
assert subprocess.run(['git', 'status', '--porcelain', '--', 'apps', 'packages', 'vitest.config.ts'], cwd=wt, capture_output=True, text=True, check=True).stdout == ''
CODE = ['apps/three-surface-poc/src/fixture-directories.ts', 'apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts',
        'apps/three-surface-poc/src/test-model-fixture.ts', 'vitest.config.ts']


def census():
    rows = {'deadOwned': [], 'liveOwned': [], 'legacy': [], 'other': []}
    for name in sorted(os.listdir(tmp)):
        if not name.startswith(PREFIX):
            rows['other'].append(name)
            continue
        m = OWNED.match(name)
        if m is None:
            rows['legacy'].append(name)
            continue
        try:
            os.kill(int(m.group(1)), 0)
            rows['liveOwned'].append(name)
        except ProcessLookupError:
            rows['deadOwned'].append(name)
        except PermissionError:
            rows['liveOwned'].append(name)
    return rows


def mine():
    found = []
    for name in os.listdir('/proc'):
        if not name.isdigit() or int(name) == os.getpid():
            continue
        try:
            if os.stat(f'/proc/{name}').st_uid != os.getuid():
                continue
            argv = open(f'/proc/{name}/cmdline', 'rb').read().replace(b'\0', b' ').decode('utf-8', 'replace')
            try:
                env = open(f'/proc/{name}/environ', 'rb').read().split(b'\0')
            except OSError:
                env = []
        except OSError:
            continue
        if f'TMPDIR={tmp}'.encode() in env or f'{tmp}/' in argv:
            found.append(int(name))
    return sorted(found)


def stop_orphans():
    stopped = []
    for pid in mine():
        if pid in mine():  # re-read the marker just before signalling
            try:
                os.kill(pid, signal.SIGKILL)
                stopped.append(pid)
            except ProcessLookupError:
                pass
    return stopped


env = {**os.environ, 'TMPDIR': tmp}
cmd = ['npx', 'vitest', 'run', '--project', '@syzygy/three-surface-poc-app']
killed = subprocess.Popen(cmd, cwd=wt, env=env, stdout=open(f'{out}.killed.log', 'w'), stderr=subprocess.STDOUT, start_new_session=True)
started = time.time()
copies = 0
while time.time() - started < 600:
    copies = sum(1 for n in os.listdir(tmp) if n.startswith(PREFIX) and not n.startswith(PREFIX + 'template-'))
    if copies >= min_copies or killed.poll() is not None:
        break
    time.sleep(0.2)
at_signal = {'secondsAfterStart': round(time.time() - started, 1), 'copies': copies, 'finishedBeforeSignal': killed.poll() is not None,
             'census': census()}
os.killpg(killed.pid, signal.SIGKILL)
killed.wait()
time.sleep(5)
after_kill = census()
orphans_after_kill = mine()
stopped = stop_orphans()
time.sleep(1)
orphans_after_stop = mine()

fresh_start = time.time()
fresh = subprocess.run(cmd, cwd=wt, env=env, capture_output=True, text=True, timeout=1800)
fresh_summary = [line.strip() for line in (fresh.stdout + fresh.stderr).splitlines() if re.match(r'\s*(Test Files|Tests|Duration)\s', line)]
open(f'{out}.fresh.log', 'w').write(fresh.stdout + fresh.stderr)
after_fresh = census()
orphans_after_fresh = mine()

result = {
    'probe': 'rev-509c kill_probe.py',
    'probeSha256': hashlib.sha256(open(__file__, 'rb').read()).hexdigest(),
    'treeCommit': head,
    'sha256AtCommit': {c: hashlib.sha256(open(os.path.join(wt, c), 'rb').read()).hexdigest() for c in CODE},
    'tmpdir': tmp,
    'command': ' '.join(cmd),
    'minCopies': min_copies,
    'atSignal': at_signal,
    'fiveSecondsAfterKill': after_kill,
    'orphansAfterKill': orphans_after_kill,
    'orphansStopped': stopped,
    'orphansAfterStop': orphans_after_stop,
    'freshRun': {'exit': fresh.returncode, 'seconds': round(time.time() - fresh_start, 1), 'summary': fresh_summary},
    'afterFreshRun': after_fresh,
    'orphansAfterFreshRun': orphans_after_fresh,
}
json.dump(result, open(out, 'w'), indent=1)
print(json.dumps({k: (v if k not in ('fiveSecondsAfterKill', 'afterFreshRun') else {kk: len(vv) for kk, vv in v.items()}) for k, v in result.items() if k not in ('sha256AtCommit',)}, indent=1)[:4000])
