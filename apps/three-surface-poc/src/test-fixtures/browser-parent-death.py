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
import runpy
from types import SimpleNamespace
from unittest.mock import patch

assert ctypes.CDLL(None, use_errno=True).prctl(36, 1, 0, 0, 0) == 0
ROOT = os.getpid()
UID = os.getuid()
NAMESPACE = os.readlink('/proc/self/ns/pid')


def identity(pid, *, with_namespace=True):
    p = Path('/proc', str(pid))
    try:
        text = (p / 'stat').read_text()
        f = text[text.rfind(')') + 2:].split()
        owner = p.stat().st_uid
        return {'pid': pid, 'start': f[19], 'ppid': int(f[1]), 'pgid': int(f[2]),
                'sid': int(f[3]), 'state': f[0], 'uid': owner,
                'namespace': os.readlink(p / 'ns/pid') if with_namespace and owner == UID else None}
    except (FileNotFoundError, ProcessLookupError):
        return None


def family():
    rows = [identity(int(p.name), with_namespace=False) for p in Path('/proc').iterdir() if p.name.isdigit()]
    found = {ROOT: identity(ROOT, with_namespace=False)}
    while True:
        added = {r['pid']: r for r in rows if r and r['ppid'] in found and r['pid'] not in found}
        if not added:
            verified = []
            for pid, row in found.items():
                if pid in (ROOT, decoy.pid):
                    continue
                current = identity(pid)
                if current is not None:
                    assert current['start'] == row['start'], 'owned identity changed during scan'
                    verified.append(current)
            return verified
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
    # Method B derives the family independently from ps parent fields,
    # never from method A's PID set. Retain only owned-family rows plus the
    # broad metadata denominator; no argv/environment is read.
    observer = subprocess.Popen(['ps', '-eo', 'pid=,ppid=,pgid=,sid=,stat='], stdout=subprocess.PIPE, text=True)
    lines = observer.communicate()[0].splitlines()
    assert observer.returncode == 0
    table = [line.split() for line in lines]
    ids = {ROOT}
    while True:
        added = {int(r[0]) for r in table if int(r[1]) in ids} - ids
        if not added:
            break
        ids.update(added)
    ids -= {ROOT, decoy.pid, observer.pid}
    return {'procFamilyDenominator': len(rows), 'proc': rows, 'psVisibleDenominator': len(lines),
            'psFamily': [line.strip() for line in lines if int(line.split()[0]) in ids]}


mode, worker_path, node, guardian_path, denied_sibling_pid = sys.argv[1:]
assert mode in ('SIGTERM', 'SIGKILL', 'startup')
# Exercise unsafe identity inputs at the guardian's syscall boundary. No
# real process is signalled by these controls; the real lifetime case below
# supplies the independent process/census evidence.
guardian = runpy.run_path(guardian_path)
with patch.object(Path, 'read_text', side_effect=ProcessLookupError('process exited during read')):
    assert identity(999999999) is None
    assert guardian['identity'](999999999) is None
foreign_fields = ['S', '123'] + ['0'] * 17 + ['foreign-start']
with patch.object(Path, 'read_text', return_value='999999999 (foreign) ' + ' '.join(foreign_fields)), \
        patch.object(Path, 'stat', return_value=SimpleNamespace(st_uid=UID + 1)), \
        patch('os.readlink', side_effect=AssertionError('foreign UID namespace was inspected')):
    assert guardian['identity'](999999999)[4:] == (UID + 1, None)
    assert identity(999999999)['namespace'] is None
stop = guardian['stop']
ports = stop.__globals__
row = (999999999, 'original-start', 123, 'S', UID, NAMESPACE)
refusals = []
for label, current, members in [
    ('start-reused', (row[0], 'reused-start', *row[2:]), {row[0]: row}),
    ('other-uid', (*row[:4], UID + 1, NAMESPACE), {row[0]: row}),
    ('other-namespace', (*row[:5], 'pid:[other]'), {row[0]: row}),
    ('outside-family', row, {}),
]:
    with patch.dict(ports, {'identity': lambda _pid: current, 'descendants': lambda: members}), \
            patch('os.pidfd_open', return_value=12345), patch('os.close'), \
            patch('signal.pidfd_send_signal', side_effect=AssertionError('unsafe identity was signalled')), \
            patch('os.kill', side_effect=AssertionError('PID-addressed signal bypassed stable handle')):
        try:
            stop(row, signal.SIGKILL)
        except RuntimeError:
            refusals.append(label)
        else:
            raise AssertionError(f'{label} did not refuse signalling')
with patch.dict(ports, {'identity': lambda _pid: row, 'descendants': lambda: {row[0]: row}}), \
        patch('os.pidfd_open', return_value=12345), patch('os.close'), \
        patch('signal.pidfd_send_signal') as sent, \
        patch('os.kill', side_effect=AssertionError('PID-addressed signal bypassed stable handle')):
    stop(row, signal.SIGKILL)
    sent.assert_called_once_with(12345, signal.SIGKILL)
with patch.dict(ports, {'identity': lambda _pid: None}), \
        patch('os.pidfd_open', return_value=12345), patch('os.close'), \
        patch('signal.pidfd_send_signal') as sent:
    stop(row, signal.SIGKILL)
    sent.assert_not_called()
with patch('os.pidfd_open', side_effect=ProcessLookupError('already reaped')), \
        patch('signal.pidfd_send_signal') as sent:
    stop(row, signal.SIGKILL)
    sent.assert_not_called()
# The deadline refuses rather than acknowledging an unverified family.
ticks = iter([0, 0])
clock = SimpleNamespace(monotonic=lambda: next(ticks, 4), sleep=lambda _seconds: None)
drain = guardian['drain']
with patch.dict(drain.__globals__, {'time': clock, 'reap': lambda _child: None,
                'descendants': lambda: {row[0]: row},
                'stop': lambda *_args: (_ for _ in ()).throw(AssertionError('cleanup continued after deadline'))}):
    try:
        drain(None)
    except RuntimeError:
        pass
    else:
        raise AssertionError('cleanup acknowledged an unverified family after deadline')
scans = []
populations = iter([{}, {row[0]: row}, {}, {}])
def population():
    scans.append(None)
    return next(populations)
signals = []
with patch.dict(drain.__globals__, {'time': SimpleNamespace(monotonic=lambda: 0, sleep=lambda _seconds: None),
                'reap': lambda _child: None, 'descendants': population,
                'stop': lambda member, sig: signals.append((member, sig))}):
    drain(None)
assert len(scans) == 4 and signals == [(row, signal.SIGTERM)], 'a late descendant escaped the empty-scan check'
decoy = SimpleNamespace(pid=-1)
# The real nondumpable sibling belongs to our Node parent, never this family.
denied_sibling = identity(int(denied_sibling_pid), with_namespace=False)
assert denied_sibling and denied_sibling['uid'] == UID and denied_sibling['ppid'] == os.getppid()
try:
    identity(denied_sibling['pid'])
except PermissionError:
    denied_sibling['namespaceDenied'] = True
else:
    raise AssertionError('sibling namespace denial control was vacuous')
# Distinct owned-unreadable controls must refuse rather than disappear from
# either scanner or pass the guardian's last identity check before signalling.
unreadable = subprocess.Popen([sys.executable, '-c',
    "import ctypes,sys; assert ctypes.CDLL(None).prctl(4,0,0,0,0)==0; print('ready',flush=True); sys.stdin.read()"],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE)
owned_unreadable_refusals = []
try:
    assert unreadable.stdout.readline() == b'ready\n'
    owned_row = guardian['identity'](unreadable.pid, with_namespace=False)
    for label, operation in [
        ('guardian-scan', guardian['descendants']),
        ('observer-scan', family),
        ('guardian-signal', lambda: guardian['stop'](owned_row[:5] + (NAMESPACE,), signal.SIGKILL)),
    ]:
        with patch('signal.pidfd_send_signal', side_effect=AssertionError('unreadable owned process was signalled')):
            try:
                operation()
            except PermissionError:
                owned_unreadable_refusals.append(label)
            else:
                raise AssertionError(f'{label} silently accepted an unreadable owned identity')
finally:
    unreadable.stdin.close()
    assert unreadable.wait(timeout=5) == 0
# A PID reused between the lineage snapshot and namespace verification is a
# refusal, while a genuinely disappeared candidate has no live target.
scan_refusals = []
for label, scanner, reader, root_row, child_row in [
    ('guardian-scan-reused', guardian['descendants'], 'identity',
     (ROOT, 'root', 0, 'S', UID, None), (999999999, 'original', ROOT, 'S', UID, None)),
    ('observer-scan-reused', family, 'identity',
     {'pid': ROOT, 'start': 'root', 'ppid': 0}, {'pid': 999999999, 'start': 'original', 'ppid': ROOT}),
]:
    def scanned(pid, *, with_namespace=True):
        if pid == ROOT:
            return root_row
        if not with_namespace:
            return child_row
        return ((child_row[0], 'reused', *child_row[2:]) if isinstance(child_row, tuple)
                else child_row | {'start': 'reused'})
    with patch.dict(scanner.__globals__, {reader: scanned}), \
            patch.object(Path, 'iterdir', return_value=iter([Path('/proc/999999999')])):
        try:
            scanner()
        except (RuntimeError, AssertionError):
            scan_refusals.append(label)
        else:
            raise AssertionError(f'{label} accepted a reused owned PID')
    def disappeared(pid, *, with_namespace=True):
        return root_row if pid == ROOT else (None if with_namespace else child_row)
    with patch.dict(scanner.__globals__, {reader: disappeared}), \
            patch.object(Path, 'iterdir', return_value=iter([Path('/proc/999999999')])):
        assert not scanner(), 'a disappeared candidate remained in the family'
decoy = subprocess.Popen(['sleep', '3600'], start_new_session=True)
worker = subprocess.Popen([node, worker_path], stdout=subprocess.PIPE, start_new_session=True)
report = {'mode': mode, 'worker': identity(worker.pid), 'decoy': identity(decoy.pid), 'reaped': [], 'refusals': refusals,
          'deniedSibling': denied_sibling, 'ownedUnreadableRefusals': owned_unreadable_refusals, 'scanRefusals': scan_refusals}
try:
    assert select.select([worker.stdout], [], [], 30)[0], 'worker did not reach browser milestone'
    assert worker.stdout.readline() == b'ready\n', 'worker failed before browser milestone'
    rows = family()
    helpers = []
    for row in rows:
        # The ancestry established above is the authority to inspect argv.
        try:
            argv = Path('/proc', str(row['pid']), 'cmdline').read_bytes()
        except (FileNotFoundError, ProcessLookupError):
            continue
        if b'--utility-sub-type=network.mojom.NetworkService' in argv:
            helpers.append(row)
    if mode != 'startup':
        assert len(helpers) == 1, 'expected exactly one live owned network helper'
        send(helpers[0], signal.SIGSTOP)
        report['before'] = census()
        assert helpers[0]['pid'] in {r['pid'] for r in report['before']['proc']}, 'proc census missed the stopped owned helper'
        assert helpers[0]['pid'] in {int(r.split()[0]) for r in report['before']['psFamily']}, 'ps census missed the stopped owned helper'
    report['milestone'] = {'helpers': helpers, 'family': rows}
    permitted_reaps = {worker.pid, *(r['pid'] for r in rows if r['ppid'] == worker.pid)}
    if mode == 'startup':
        assert worker.wait(timeout=30) == 0, 'startup failure control failed'
    else:
        send(report['worker'], getattr(signal, mode))
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        report['reaped'] += reap(worker)
        if not family():
            break
        time.sleep(.025)
    report['after'] = census()
    # A guardian must reap its own escaped Chrome children. An init-style
    # observer may reap the killed worker and the now-orphaned guardian,
    # but must not hide a missing subreaper by reaping Chrome's helpers.
    report['unexpectedReaps'] = [r for r in report['reaped'] if r['pid'] not in permitted_reaps]
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
