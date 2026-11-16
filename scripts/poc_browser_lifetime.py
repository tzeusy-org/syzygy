#!/usr/bin/env python3
"""Own one Vitest Chrome launch after its worker dies.

Chrome's wrapper forks cat, and crashpad double-forks into another session.
A process-group drain cannot own either after the worker dies. This private
parent adopts escaped descendants and reaps them. Its stdin belongs only to
the worker: EOF is the parent-death notification. Operator launches do not
use this test-only adapter.
"""
import ctypes
import io
import locale
import os
import select
import signal
import subprocess
import sys
import time


ROOT = os.getpid()
UID = os.getuid()
NAMESPACE = os.readlink('/proc/self/ns/pid')


def read_stat_text(path):
    # Keep the default-decoder warning before opening the file, then decode
    # the whole file with that codec, as a text-mode read does. Raw reads skip
    # a text stream's per-file setup, paid once per host process per scan.
    encoding = io.text_encoding(None)
    fd = os.open(path, os.O_RDONLY)
    try:
        chunks = []
        while chunk := os.read(fd, 4096):
            chunks.append(chunk)
    finally:
        os.close(fd)
    return b''.join(chunks).decode(locale.getencoding() if encoding == 'locale' else encoding)


def identity(pid, *, with_namespace=True):
    directory = f'/proc/{pid}'
    try:
        text = read_stat_text(directory + '/stat')
        # Only state, parent and start identity (fields 0, 1 and 19) are read.
        # Keep those tokens exact without allocating every unused stat field.
        fields = text[text.rfind(')') + 2:].split(None, 20)
        owner = os.stat(directory).st_uid
        # Namespace links for another UID may be unreadable on a normal
        # host. Retain its parent metadata so a foreign-UID descendant is
        # refused, while unrelated processes require no namespace access.
        namespace = os.readlink(directory + '/ns/pid') if with_namespace and owner == UID else None
        return (pid, fields[19], int(fields[1]), fields[0],
                owner, namespace)
    except (FileNotFoundError, ProcessLookupError):
        return None


def process_names():
    # Materialize one /proc listing per scan; no Path is built per host PID.
    with os.scandir('/proc') as entries:
        return [entry.name for entry in entries]


def descendants():
    # Read metadata only. Never inspect another process's argv/environment.
    rows = {}
    for name in process_names():
        if name.isdigit():
            row = identity(int(name), with_namespace=False)
            if row is not None:
                rows[row[0]] = row
    owned = {ROOT: identity(ROOT, with_namespace=False)}
    while True:
        added = {pid: row for pid, row in rows.items()
                 if row[2] in owned and pid not in owned}
        if not added:
            # Namespace links can be denied even for an unrelated same-UID
            # process. Establish lineage first; an unreadable owned identity
            # still raises, so it cannot become an empty-family success.
            verified = {}
            for pid, row in owned.items():
                if pid == ROOT:
                    continue
                current = identity(pid)
                if current is not None:
                    if current[:2] != row[:2]:
                        raise RuntimeError('private Chrome descendant identity changed during scan')
                    verified[pid] = current
            return verified
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
