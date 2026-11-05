"""Observe one synthetic browser worker; recover only its verified descendants."""
import ctypes
import json
import os
from pathlib import Path
import select
import signal
import subprocess
import sys
import time

assert ctypes.CDLL(None, use_errno=True).prctl(36, 1, 0, 0, 0) == 0
ROOT = os.getpid()
UID = os.getuid()
NAMESPACE = os.readlink('/proc/self/ns/pid')


def identity(pid):
    p = Path('/proc', str(pid))
    try:
        text = (p / 'stat').read_text()
        f = text[text.rfind(')') + 2:].split()
        return {'pid': pid, 'start': f[19], 'ppid': int(f[1]), 'pgid': int(f[2]),
                'sid': int(f[3]), 'state': f[0], 'uid': p.stat().st_uid,
                'namespace': os.readlink(p / 'ns/pid')}
    except FileNotFoundError:
        return None


def family():
    rows = [identity(int(p.name)) for p in Path('/proc').iterdir() if p.name.isdigit()]
    found = {ROOT: identity(ROOT)}
    while True:
        added = {r['pid']: r for r in rows if r and r['ppid'] in found and r['pid'] not in found}
        if not added:
            return [r for pid, r in found.items() if pid not in (ROOT, decoy.pid)]
        found.update(added)


def send(row, sig):
    fd = os.pidfd_open(row['pid'])
    try:
        current = identity(row['pid'])
        assert current and all(current[k] == row[k] for k in ('pid', 'start', 'uid', 'namespace'))
        assert current['uid'] == UID and current['namespace'] == NAMESPACE
        assert current['pid'] in {r['pid'] for r in family()}
        signal.pidfd_send_signal(fd, sig)
    finally:
        os.close(fd)


def reap(worker):
    result = []
    while True:
        try:
            pid, status = os.waitpid(-1, os.WNOHANG)
        except ChildProcessError:
            return result
        if pid == 0:
            return result
        result.append({'pid': pid, 'status': status})
        if pid == worker.pid:
            worker.returncode = os.waitstatus_to_exitcode(status)


def census():
    rows = family()
    # Method B is independently emitted by ps; only owned-family rows are
    # retained, plus its broad metadata denominator. No argv/environment.
    lines = subprocess.check_output(['ps', '-eo', 'pid=,ppid=,pgid=,sid=,stat='], text=True).splitlines()
    ids = {r['pid'] for r in rows}
    return {'procFamilyDenominator': len(rows), 'proc': rows, 'psVisibleDenominator': len(lines),
            'psFamily': [line.strip() for line in lines if int(line.split()[0]) in ids]}


mode, worker_path, node = sys.argv[1:]
assert mode in ('SIGTERM', 'SIGKILL')
decoy = subprocess.Popen(['sleep', '3600'], start_new_session=True)
worker = subprocess.Popen([node, worker_path], stdout=subprocess.PIPE, start_new_session=True)
report = {'mode': mode, 'worker': identity(worker.pid), 'decoy': identity(decoy.pid), 'reaped': []}
try:
    assert select.select([worker.stdout], [], [], 30)[0], 'worker did not reach browser milestone'
    assert worker.stdout.readline() == b'ready\n', 'worker failed before browser milestone'
    rows = family()
    helpers = []
    for row in rows:
        # The ancestry established above is the authority to inspect argv.
        try:
            argv = Path('/proc', str(row['pid']), 'cmdline').read_bytes()
        except FileNotFoundError:
            continue
        if b'--utility-sub-type=network.mojom.NetworkService' in argv:
            helpers.append(row)
    assert len(helpers) == 1, 'expected exactly one live owned network helper'
    send(helpers[0], signal.SIGSTOP)
    report['milestone'] = {'helpers': helpers, 'family': rows}
    send(report['worker'], getattr(signal, mode))
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        report['reaped'] += reap(worker)
        if not family():
            break
        time.sleep(.025)
    report['after'] = census()
    report['decoySurvived'] = decoy.poll() is None
finally:
    # A failing old-code/mutant control must not leak a stopped Chrome. This
    # recovery is recorded separately and cannot turn the assertion green.
    report['recovery'] = []
    for row in family():
        if row['state'] not in ('Z', 'X'):
            try:
                send(row, signal.SIGKILL)
                report['recovery'].append(row)
            except ProcessLookupError:
                pass
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        report['reaped'] += reap(worker)
        if not family():
            break
        time.sleep(.025)
    report['afterRecovery'] = census()
    decoy.terminate()
    decoy.wait()
    print(json.dumps(report), flush=True)
