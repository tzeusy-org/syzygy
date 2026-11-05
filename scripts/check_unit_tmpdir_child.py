#!/usr/bin/env python3
"""Private Linux subreaper for one TMPDIR workload; fd 3 carries its lifetime proof.

Groups and sessions are mutable. Kernel child adoption and waitpid(ECHILD) prove
completion even when a descendant double-forks or changes either. A pidfd pins
signals to a verified direct child, never a numeric PID or a process group.
"""
import ctypes
import errno
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time


def identity(pid):
    fields = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
    return {'pid': pid, 'parent': int(fields[1]), 'group': int(fields[2]),
            'session': int(fields[3]), 'start': fields[19],
            'uid': os.stat(f'/proc/{pid}').st_uid}


def pin_child(pid):
    before = identity(pid)
    fd = os.pidfd_open(pid)
    try:
        after = identity(pid)
        if before != after or after['parent'] != os.getpid() or after['uid'] != os.getuid():
            raise RuntimeError('writer-identity-refused')
        # The kernel independently confirms that this handle names our child.
        os.waitid(os.P_PIDFD, fd, os.WEXITED | os.WNOHANG | os.WNOWAIT)
        return fd, after
    except BaseException:
        os.close(fd)
        raise


def supervise(argv):
    result = {'code': None, 'signal': None, 'launchError': None,
              'interrupted': None, 'signalError': None, 'writers': [],
              'lifetime': {'method': 'linux-subreaper-pidfd', 'complete': False,
                           'signals': [], 'reaped': []}}
    handles = {}
    launcher = None
    deadline = None
    requested = None

    def request(signum, _frame):
        nonlocal requested
        requested = signal.Signals(signum).name
        result['interrupted'] = requested

    def reap():
        nonlocal launcher_done
        while True:
            try:
                pid, status = os.waitpid(-1, os.WNOHANG)
            except ChildProcessError:
                return True  # ECHILD: no live or unreaped descendants remain.
            if pid == 0:
                return False
            result['lifetime']['reaped'].append(pid)
            if pid == launcher.pid:
                launcher_done = True
                launcher.returncode = os.waitstatus_to_exitcode(status)
                if os.WIFSIGNALED(status):
                    result['signal'] = signal.Signals(os.WTERMSIG(status)).name
                else:
                    result['code'] = os.WEXITSTATUS(status)
            handle = handles.pop(pid, None)
            if handle:
                os.close(handle[0])

    def stop_children(signame):
        # This file enumerates only this supervisor's kernel children, not /proc
        # or another run's session. Further descendants are adopted after death.
        children = Path(f'/proc/self/task/{os.getpid()}/children').read_text().split()
        for name in children:
            pid = int(name)
            if pid not in handles:
                try:
                    handles[pid] = pin_child(pid)
                except (FileNotFoundError, ProcessLookupError, ChildProcessError):
                    continue  # Exited; reap() will establish completion.
            fd, owned = handles[pid]
            if owned.get('lastSignal') == signame:
                continue
            try:
                signal.pidfd_send_signal(fd, getattr(signal, signame))
            except ProcessLookupError:
                continue  # A reused numeric PID cannot retarget this handle.
            result['lifetime']['signals'].append({**owned, 'signal': signame})
            owned['lastSignal'] = signame
            if len(result['lifetime']['signals']) > 10000:
                raise RuntimeError('writer-signal-budget-exceeded')

    try:
        libc = ctypes.CDLL(None, use_errno=True)
        if libc.prctl(36, 1, 0, 0, 0) != 0:  # PR_SET_CHILD_SUBREAPER
            raise OSError(ctypes.get_errno(), 'subreaper-unavailable')
        enabled = ctypes.c_int()
        if libc.prctl(37, ctypes.byref(enabled), 0, 0, 0) != 0 or enabled.value != 1:
            raise RuntimeError('subreaper-not-established')
        # Fail before launching if the host lacks either pidfd operation.
        fd = os.pidfd_open(os.getpid())
        signal.pidfd_send_signal(fd, 0)
        os.close(fd)
        signal.signal(signal.SIGCHLD, signal.SIG_DFL)
        signal.signal(signal.SIGTERM, request)
        signal.signal(signal.SIGINT, request)
        launcher_done = False
        try:
            launcher = subprocess.Popen(argv, close_fds=True)
        except OSError as error:
            result['launchError'] = errno.errorcode.get(error.errno, str(error))
            # No workload launched, and this private supervisor has no children.
            try:
                os.waitpid(-1, os.WNOHANG)
            except ChildProcessError:
                result['lifetime']['complete'] = True
            return result
        while True:
            complete = reap()
            if complete:
                result['lifetime']['complete'] = True
                break
            if requested and deadline is None:
                result['interrupted'] = requested
                deadline = time.monotonic() + 4
            if launcher_done and deadline is None:
                result['signalError'] = 'owned-writers-remained'
                deadline = time.monotonic() + 4
            if deadline is not None:
                if time.monotonic() >= deadline:
                    result['writers'] = [record for _, record in handles.values()]
                    raise RuntimeError('owned-writers-still-live')
                stop_children('SIGKILL' if time.monotonic() >= deadline - 2 else (requested or 'SIGTERM'))
            time.sleep(.02)
    except BaseException as error:
        result['signalError'] = f'writer-lifetime-unknown: {type(error).__name__}: {error}'
    finally:
        for fd, _ in handles.values():
            os.close(fd)
    return result


if __name__ == '__main__':
    # The workload never inherits this descriptor (Popen close_fds); output from
    # the workload cannot forge a proof through its stdout/stderr reporter.
    result = supervise(sys.argv[1:])
    with os.fdopen(3, 'w') as proof:
        proof.write(json.dumps(result) + '\n')
