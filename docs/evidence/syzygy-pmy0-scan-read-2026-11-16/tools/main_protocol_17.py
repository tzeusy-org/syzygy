"""Prepared-only main-protocol ACK probe. Execute only after operator go."""
import ctypes
import datetime
import hashlib
import json
import os
from pathlib import Path
import select
import signal
import subprocess
import sys
import tempfile
import time

HERE = Path(__file__).resolve().parent

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def identity(pid, namespace=False):
    path = Path('/proc', str(pid))
    try:
        text = (path / 'stat').read_text()
        fields = text[text.rfind(')') + 2:].split()
        result = {'pid': pid, 'start': fields[19], 'ppid': int(fields[1]),
                  'state': fields[0], 'uid': path.stat().st_uid}
        if namespace:
            result['namespace'] = os.readlink(path / 'ns/pid')
        return result
    except (FileNotFoundError, ProcessLookupError):
        return None

def same_process(left, right):
    return left is not None and all(left[key] == right[key] for key in ('pid', 'start', 'uid'))

def proc_family(root):
    rows = {}
    for path in Path('/proc').iterdir():
        if path.name.isdigit():
            row = identity(int(path.name))
            if row is not None:
                rows[row['pid']] = row
    found = {root}
    while True:
        added = {pid for pid, row in rows.items() if row['ppid'] in found} - found
        if not added:
            break
        found.update(added)
    verified = []
    for pid in sorted(found - {root}):
        current = identity(pid, namespace=True)
        if current is not None:
            if not same_process(current, rows[pid]):
                raise RuntimeError('owned identity changed during census')
            verified.append(current)
    return {'metadata_denominator': len(rows), 'family': verified}

def ps_family(root):
    child = subprocess.Popen(['ps', '-eo', 'pid=,ppid=,stat='], stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE, text=True)
    try:
        output, _errors = child.communicate(timeout=5)
    except subprocess.TimeoutExpired:
        child.kill()
        child.communicate()
        raise
    if child.returncode != 0:
        raise RuntimeError('independent ps census failed')
    rows = [{'pid': int(fields[0]), 'ppid': int(fields[1]), 'state': fields[2]}
            for line in output.splitlines() if (fields := line.split())]
    found = {root}
    while True:
        added = {row['pid'] for row in rows if row['ppid'] in found} - found
        if not added:
            break
        found.update(added)
    found -= {root, child.pid}
    return {'metadata_denominator': len(rows), 'observer_pid': child.pid,
            'family': [row for row in rows if row['pid'] in found]}

def pipe_bytes(fd, timeout, limit=65536, newline=False):
    result = b''
    deadline = time.monotonic() + timeout
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0 or not select.select([fd], [], [], max(remaining, 0))[0]:
            raise TimeoutError('private protocol pipe deadline')
        chunk = os.read(fd, min(4096, limit + 1 - len(result)))
        if not chunk:
            return result
        result += chunk
        if len(result) > limit:
            raise RuntimeError('private protocol output exceeded bound')
        if newline and b'\n' in result:
            return result

def still_owned(pid, root, uid, namespace):
    seen = set()
    while pid != root:
        if pid in seen:
            return False
        seen.add(pid)
        row = identity(pid, namespace=True)
        if row is None or row['uid'] != uid or row['namespace'] != namespace:
            return False
        pid = row['ppid']
    return True

def recovery(root, uid, namespace, pinned, guardian):
    result = {'signals': [], 'reaped': [], 'errors': [], 'new_pins': []}
    deadline = time.monotonic() + 15
    while True:
        rows = proc_family(root)['family']
        for row in rows:
            # A startup failure may precede the ready record. Fresh lineage
            # establishes these as this private launch's descendants only.
            if row['pid'] not in pinned:
                pinned[row['pid']] = row
                result['new_pins'].append(row)
            if row['state'] in ('Z', 'X'):
                continue
            fd = None
            try:
                fd = os.pidfd_open(row['pid'])
                current = identity(row['pid'], namespace=True)
                if (not same_process(current, pinned[row['pid']])
                        or current['namespace'] != namespace
                        or not still_owned(row['pid'], root, uid, namespace)):
                    raise RuntimeError('refused unverified recovery target')
                signal.pidfd_send_signal(fd, signal.SIGKILL)
                result['signals'].append({'pid': row['pid'], 'start': row['start']})
            except ProcessLookupError:
                pass
            except Exception as error:
                result['errors'].append({'class': type(error).__name__, 'pid': row['pid']})
            finally:
                if fd is not None:
                    os.close(fd)
        while True:
            try:
                pid, status = os.waitpid(-1, os.WNOHANG)
            except ChildProcessError:
                break
            if pid == 0:
                break
            result['reaped'].append({'pid': pid, 'status': status})
            if guardian is not None and pid == guardian.pid:
                guardian.returncode = os.waitstatus_to_exitcode(status)
        if not proc_family(root)['family']:
            break
        if time.monotonic() > deadline:
            result['errors'].append({'class': 'RecoveryDeadlineExceeded'})
            break
        time.sleep(.025)
    result['after_proc'] = proc_family(root)
    result['after_ps'] = ps_family(root)
    return result

def main():
    manifest_path = HERE / 'prepared-manifest.json'
    manifest = json.loads(manifest_path.read_text())
    source = Path(manifest['source_path'])
    launcher = HERE / 'launcher_16.py'
    result = {'tag': 'DEBUG-pmy0-main-ack-17', 'started_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'manifest_sha256': digest(manifest_path), 'source_sha256': digest(source),
              'probe_sha256': digest(__file__), 'launcher_sha256': digest(launcher),
              'source_clock_seconds': 3, 'expected_guardian_descendants': 17,
              'population_definition': 'one launcher child plus16 sleep grandchildren; guardian excluded',
              'errors': []}
    guardian = None
    ack_read = ack_write = None
    pinned = {}
    root = os.getpid()
    uid = os.getuid()
    namespace = os.readlink('/proc/self/ns/pid')
    try:
        assert result['source_sha256'] == manifest['source_sha256']
        assert result['probe_sha256'] == manifest['probe_sha256']
        assert result['launcher_sha256'] == manifest['launcher_sha256']
        if ctypes.CDLL(None, use_errno=True).prctl(36, 1, 0, 0, 0) != 0:
            raise OSError(ctypes.get_errno(), 'cannot establish private observer subreaper')
        with tempfile.TemporaryDirectory(prefix='pmy0-main-ack-17-') as raw:
            wrapper = Path(raw) / 'guardian_fd3.py'
            ack_read, ack_write = os.pipe()
            wrapper.write_text('import os,sys\n'
                               f'fd={ack_write}\n'
                               'if fd != 3:\n os.dup2(fd,3,inheritable=True)\n os.close(fd)\n'
                               'else:\n os.set_inheritable(3,True)\n'
                               f'os.execv(sys.executable,[sys.executable,{str(source)!r},sys.executable,{str(launcher)!r}])\n')
            result['exec_wrapper_sha256'] = digest(wrapper)
            guardian = subprocess.Popen([sys.executable, str(wrapper)], stdin=subprocess.PIPE,
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                        pass_fds=(ack_write,), start_new_session=True)
            os.close(ack_write)
            ack_write = None
            guard_identity = identity(guardian.pid, namespace=True)
            assert guard_identity is not None
            pinned[guardian.pid] = guard_identity
            result['guardian_identity'] = guard_identity
            guardian.stdin.write(b'start\n')
            guardian.stdin.flush()
            ready = json.loads(pipe_bytes(guardian.stdout.fileno(), 15, newline=True))
            assert ready['ready'] is True and len(ready['children']) == 16
            created = [ready['launcher'], *ready['children']]
            assert len({row['pid'] for row in created}) == 17
            for row in created:
                assert row['uid'] == uid and row['namespace'] == namespace
                assert same_process(identity(row['pid']), row)
                pinned[row['pid']] = row
            result['created_identities'] = created
            result['before_proc'] = proc_family(guardian.pid)
            result['before_ps'] = ps_family(guardian.pid)
            expected = {row['pid'] for row in created}
            assert {row['pid'] for row in result['before_proc']['family']} == expected
            assert {row['pid'] for row in result['before_ps']['family']} == expected
            result['stop_sent_at'] = time.monotonic()
            guardian.stdin.write(b'stop\n')
            guardian.stdin.flush()
            guardian.stdin.close()
            result['guardian_returncode'] = guardian.wait(timeout=20)
            result['guardian_elapsed_after_stop'] = time.monotonic() - result['stop_sent_at']
            result['acknowledgement'] = pipe_bytes(ack_read, 2, limit=128).decode('ascii')
            result['after_proc'] = proc_family(root)
            result['after_ps'] = ps_family(root)
            result['created_identity_remainders'] = [current for row in created
                if same_process((current := identity(row['pid'])), row)]
            result['proof_succeeded_before_recovery'] = (
                result['acknowledgement'] == 'closed\n'
                and result['guardian_returncode'] in (0, 128 + signal.SIGTERM, 128 + signal.SIGKILL)
                and not result['after_proc']['family'] and not result['after_ps']['family']
                and not result['created_identity_remainders'])
    except Exception as error:
        result['errors'].append({'class': type(error).__name__, 'message': str(error)})
        result['proof_succeeded_before_recovery'] = False
    finally:
        try:
            result['recovery'] = recovery(root, uid, namespace, pinned, guardian)
        except Exception as error:
            result['recovery'] = {'errors': [{'class': type(error).__name__, 'message': str(error)}]}
        if guardian is not None:
            for name, stream in (('stderr', guardian.stderr), ('stdout_tail', guardian.stdout)):
                try:
                    result[name] = pipe_bytes(stream.fileno(), 2).decode('utf-8', errors='replace')
                except Exception as error:
                    result['errors'].append({'stream': name, 'class': type(error).__name__})
        for fd in (ack_read, ack_write):
            if fd is not None:
                os.close(fd)
        result['finished_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        print(json.dumps(result, indent=2), flush=True)
    return 0 if result['proof_succeeded_before_recovery'] else 1

if __name__ == '__main__':
    raise SystemExit(main())
