#!/usr/bin/env python3
"""Own one Vitest Chrome launch after its worker dies.

Chrome's wrapper forks cat, and crashpad double-forks into another session.
A process-group drain cannot own either after the worker dies. This private
parent adopts escaped descendants and reaps them. Its stdin belongs only to
the worker: EOF is the parent-death notification. Operator launches do not
use this test-only adapter.
"""
import ctypes
import os
from pathlib import Path
import select
import signal
import subprocess
import sys
import time


ROOT = os.getpid()
UID = os.getuid()
NAMESPACE = os.readlink('/proc/self/ns/pid')


def identity(pid):
    directory = Path('/proc', str(pid))
    try:
        text = (directory / 'stat').read_text()
        fields = text[text.rfind(')') + 2:].split()
        return (pid, fields[19], int(fields[1]), fields[0],
                directory.stat().st_uid, os.readlink(directory / 'ns/pid'))
    except FileNotFoundError:
        return None


def descendants():
    # Read metadata only. Never inspect another process's argv/environment.
    rows = {}
    for directory in Path('/proc').iterdir():
        if directory.name.isdigit():
            row = identity(int(directory.name))
            if row is not None:
                rows[row[0]] = row
    owned = {ROOT: identity(ROOT)}
    while True:
        added = {pid: row for pid, row in rows.items()
                 if row[2] in owned and pid not in owned}
        if not added:
            return {pid: row for pid, row in owned.items() if pid != ROOT}
        owned.update(added)


def stop(row, sig):
    # A pidfd pins the target across the final ancestry check and signal.
    try:
        fd = os.pidfd_open(row[0])
    except ProcessLookupError:
        return
    try:
        current = identity(row[0])
        if current is None:
            return
        if current[:2] != row[:2] or current[4:] != (UID, NAMESPACE):
            raise RuntimeError('private Chrome descendant identity changed')
        chain = descendants()
        if current[0] not in chain or chain[current[0]][:2] != row[:2]:
            raise RuntimeError('private Chrome descendant ancestry changed')
        signal.pidfd_send_signal(fd, sig)
    except ProcessLookupError:
        pass
    finally:
        os.close(fd)


def reap(child):
    while True:
        try:
            pid, status = os.waitpid(-1, os.WNOHANG)
        except ChildProcessError:
            return
        if pid == 0:
            return
        if pid == child.pid:
            child.returncode = os.waitstatus_to_exitcode(status)


def drain(child):
    deadline = time.monotonic() + 3
    escalation = time.monotonic() + .1
    empty = 0
    while True:
        reap(child)
        rows = descendants()
        empty = empty + 1 if not rows else 0
        if empty == 2:
            return
        if time.monotonic() > deadline:
            raise RuntimeError('private Chrome descendant cleanup deadline exceeded')
        for row in rows.values():
            if row[3] not in ('Z', 'X'):
                stop(row, signal.SIGKILL if time.monotonic() >= escalation else signal.SIGTERM)
        time.sleep(.025)


def main():
    if ctypes.CDLL(None, use_errno=True).prctl(36, 1, 0, 0, 0) != 0:
        raise OSError(ctypes.get_errno(), 'cannot adopt private Chrome descendants')
    # Do not launch Chrome before the worker verifies this private group.
    if sys.stdin.buffer.readline() != b'start\n':
        return 0
    child = subprocess.Popen(sys.argv[1:], stdin=subprocess.DEVNULL)
    while True:
        reap(child)
        if child.returncode is not None:
            break
        ready, _, _ = select.select([sys.stdin.buffer], [], [], .025)
        if ready:
            # A close request and worker death have the same cleanup duty.
            sys.stdin.buffer.readline()
            break
    drain(child)
    # The separate acknowledgement distinguishes completed cleanup from an
    # early guardian failure; exit alone is not evidence of an empty family.
    try:
        os.write(3, b'closed\n')
    except BrokenPipeError:
        pass  # The killed worker cannot read; cleanup has already completed.
    code = child.returncode or 0
    return code if code >= 0 else 128 - code


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        print(f'private Chrome lifetime cleanup failed: {error}', file=sys.stderr)
        sys.exit(70)
