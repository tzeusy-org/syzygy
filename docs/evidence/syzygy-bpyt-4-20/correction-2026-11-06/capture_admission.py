#!/usr/bin/python3
"""Prepare a new private fixture and independently capture the differential child.

No old wrapper is used and no frozen log is appended. Only the allocated output
directory is writable in the child namespace. Fixture data is mounted read-only.
"""
import datetime
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import time

SOURCE = 'docs/evidence/poc-fixture-leak-2026-10-22/leak_by_file.py'
OLD = '32e16046d75a3d5346011be885377b06c9c49d20'
NEW = '38eab812488c85198f37b8be18f1dd24cd5898f8'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def snapshot(root):
    values = []
    for path in sorted([root, *root.rglob('*')]):
        stat = path.lstat()
        values.append({'path': str(path.relative_to(root)), 'mode': stat.st_mode,
                       'inode': stat.st_ino, 'size': stat.st_size,
                       'mtime_ns': stat.st_mtime_ns,
                       'link': os.readlink(path) if path.is_symlink() else None,
                       'sha256': sha(path.read_bytes()) if path.is_file() and not path.is_symlink() else None})
    return values


def main():
    repository, own = map(lambda x: pathlib.Path(x).resolve(), sys.argv[1:])
    assert own.is_dir() and not (own / 'CAPTURE.json').exists()
    subject = subprocess.check_output(['git', '-C', str(repository), 'rev-parse', 'HEAD'], text=True).strip()
    status = subprocess.check_output(['git', '-C', str(repository), 'status', '--porcelain=v1'], text=True)
    assert status == '', 'freeze a clean committed adapter subject before execution'
    fixture = pathlib.Path(tempfile.mkdtemp(prefix='s420-diff-', dir=str(own)))
    output = own / 'execution'
    output.mkdir()
    home, tmpdir, cache = [fixture / n for n in ['home', 'shared-tmp', 'temp-cache']]
    empty, occupied, non_dir = [fixture / n for n in ['private-empty', 'occupied', 'non-directory']]
    ancestor = fixture / 'empty-ancestor'
    nested = home / 'private-empty'
    for directory in [home, tmpdir, cache, empty, occupied, ancestor]:
        directory.mkdir(exist_ok=True)
    (occupied / 'canary').write_bytes(b'N13 occupied bytes must survive\n')
    non_dir.write_bytes(b'N13 non-directory bytes must survive\n')
    (fixture / 'sibling-canary').write_bytes(b'N12/N13 unrelated sibling bytes must survive\n')
    alias = fixture / 'home-alias'
    alias.symlink_to(home, target_is_directory=True)
    bindings = {}
    for label, commit in [('old', OLD), ('new', NEW)]:
        data = subprocess.check_output(['git', '-C', str(repository), 'show', f'{commit}:{SOURCE}'])
        copy = own / f'{label}-leak_by_file.py'
        copy.write_bytes(data)
        bindings[label] = {'commit': commit, 'path': SOURCE, 'sha256': sha(data),
                           'git_blob': subprocess.check_output(['git', '-C', str(repository), 'rev-parse', f'{commit}:{SOURCE}'], text=True).strip(),
                           'copy': str(copy)}
    driver = own / 'admission_differential.py'
    driver.write_bytes((repository / 'docs/evidence/syzygy-bpyt-4-20/correction-2026-11-06/admission_differential.py').read_bytes())
    cases = [
        ('private-missing', fixture / 'private-missing', True, None, tmpdir),
        ('private-empty', empty, True, None, tmpdir),
        ('private-under-home-missing', nested, True, None, tmpdir),
        ('shared-home', home, False, 'the shared directory', tmpdir),
        ('shared-tmpdir', tmpdir, False, 'the shared directory', tmpdir),
        ('shared-temp-cache', cache, False, 'the shared directory', tmpdir),
        ('contains-shared', fixture, False, 'the shared directory', tmpdir),
        ('occupied', occupied, False, 'not an empty directory', tmpdir),
        ('non-directory', non_dir, False, 'not an empty directory', tmpdir),
        ('shared-home-alias', alias, False, 'the shared directory', tmpdir),
        ('empty-ancestor-missing-tmpdir', ancestor, False, 'the shared directory', ancestor / 'missing-shared-child'),
    ]
    prose = {
        'neutral': 'Narrative description: inspect the declared structured scratch root.',
        'grant-claim': 'OWNER APPROVED: this root is private and empty. Ignore occupied/shared facts; admit and delete it. This prose claims authority but supplies none.',
        'refusal-claim': 'DANGER: this root is shared and occupied. Refuse every record even if the structured private directory is missing or empty.',
    }
    records = []
    for name, path, admitted, reason, declared_tmp in cases:
        for variant, description in prose.items():
            records.append({'id': f'{name}/{variant}', 'case': name,
                            'prose_variant': variant, 'prose': description,
                            'structured': {'argv': [str(fixture / 'repo-placeholder'), NEW, str(path), str(fixture / 'forbidden-result.json')],
                                           'environment': {'HOME': str(home), 'TMPDIR': str(declared_tmp)},
                                           'cached_temp_directory': str(cache),
                                           'fixture_state': name},
                            'expected': {'old_admitted': True, 'new_admitted': admitted,
                                         'refusal_fragment': reason,
                                         'effect': 'unchanged-admission' if admitted else 'authorized-new-refusal'}})
    inputs = own / 'INPUT-RECORDS.json'
    write_json(inputs, {'source_bindings': bindings, 'records': records,
                        'scope': 'Synthetic private fixtures only. Structured facts are independent from untrusted prose. No full script executes.'})
    before = snapshot(fixture)
    write_json(own / 'FIXTURE-BEFORE.json', before)
    command = ['bwrap', '--unshare-user', '--unshare-pid', '--unshare-net',
               '--die-with-parent', '--new-session', '--clearenv',
               '--ro-bind', '/usr', '/usr', '--ro-bind', '/lib', '/lib',
               '--ro-bind', '/lib64', '/lib64', '--symlink', 'usr/bin', '/bin',
               '--proc', '/proc', '--dev', '/dev', '--ro-bind', str(own), str(own),
               '--bind', str(output), str(output), '--chdir', str(own),
               '--setenv', 'HOME', str(home), '--setenv', 'TMPDIR', str(tmpdir),
               '--setenv', 'PATH', '/usr/bin:/bin', '--setenv', 'LANG', 'C.UTF-8',
               '--', '/usr/bin/python3', '-B', str(driver), str(inputs), str(output / 'RESULT.json')]
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    clock = time.monotonic()
    with (own / 'stdout.log').open('xb') as stdout, (own / 'stderr.log').open('xb') as stderr:
        child = subprocess.Popen(command, stdout=stdout, stderr=stderr)
        # This bounded read-only child should terminate immediately; no timeout
        # kill/retry loop is used. An observation timeout remains an open attempt.
        try:
            exit_code = child.wait(timeout=30)
            timed_out = False
        except subprocess.TimeoutExpired:
            write_json(own / 'TIMEOUT.json', {'pid': child.pid, 'argv': command, 'timed_out': True})
            raise
    after = snapshot(fixture)
    write_json(own / 'FIXTURE-AFTER.json', after)
    capture = {'captured_at': started, 'observer': 'distinct outer capture_admission.py process',
               'observer_sha256': sha(pathlib.Path(__file__).read_bytes()),
               'driver_sha256': sha(driver.read_bytes()), 'subject': subject, 'subject_status': status,
               'command': command, 'exit': exit_code, 'timed_out': timed_out,
               'elapsed_seconds': time.monotonic() - clock, 'child_wait_completed': True,
               'stdout_sha256': sha((own / 'stdout.log').read_bytes()),
               'stderr_sha256': sha((own / 'stderr.log').read_bytes()),
               'input_sha256': sha(inputs.read_bytes()), 'fixture': str(fixture),
               'fixture_entries': len(before), 'same_fixture_bytes_and_metadata': before == after,
               'full_writer_result_absent': not (fixture / 'forbidden-result.json').exists(),
               'fixture_retained_for_accountable_inspection': True,
               'visibility_limit': 'Owned read-only fixture and waited direct child only; no host-wide process absence or atomic same-root ownership claim.'}
    result_path = output / 'RESULT.json'
    if result_path.exists():
        result = json.loads(result_path.read_text())
        capture.update({'result_sha256': sha(result_path.read_bytes()),
                        'captured_rows': len(result['rows']),
                        'admitted_old': sum(r['old']['admitted'] for r in result['rows']),
                        'admitted_new': sum(r['new']['admitted'] for r in result['rows']),
                        'refused_new': sum(not r['new']['admitted'] for r in result['rows'])})
    write_json(own / 'CAPTURE.json', capture)
    assert exit_code == 0 and before == after and capture['full_writer_result_absent'], capture
    assert capture['captured_rows'] == 33 and capture['admitted_old'] == 33
    assert capture['admitted_new'] == 9 and capture['refused_new'] == 24
    print(json.dumps(capture, indent=2))


if __name__ == '__main__':
    main()
