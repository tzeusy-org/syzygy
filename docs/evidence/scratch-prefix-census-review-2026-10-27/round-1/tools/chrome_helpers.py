#!/usr/bin/env python3
"""Do Chrome's helper processes without the --user-data-dir marker outlive a SIGTERM of the marked processes alone?

Usage: chrome_helpers.py <private-dir (short, absent or empty)> <out.json>

Launches one headless Chrome as cdp-browser.ts does (detached: new session), TMPDIR and --user-data-dir under <private-dir>. After 4 s
it lists this user's processes carrying either the exact marker in their arguments or TMPDIR=<private-dir>/tmp in a readable
environment, with session and group. Then it SIGTERMs, by pid, only the processes carrying the argument marker (what F1 and
census_run.py stop), waits 10 s, and lists again. Whatever remains is then stopped by pid (SIGTERM, then SIGKILL), each re-checked
for the private markers first. Nothing is matched by name; the caller removes <private-dir>.
"""
import json
import os
import pathlib
import signal
import subprocess
import sys
import time

private, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
assert private.is_absolute() and len(str(private)) <= 30 and (not private.exists() or not any(private.iterdir()))
tmp, profile = private / 'tmp', private / 'tmp' / 'syzygy-poc-browser-probe'
profile.mkdir(parents=True)
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
                readable = True
            except OSError:
                environ, readable = [], False
            stat = open(f'/proc/{name}/stat').read()
            f = stat[stat.rindex(')') + 2:].split()
            if marker in args or env_marker in environ:
                exe = args.split(' ')[0].rsplit('/', 1)[-1]
                kind = args.split('--type=')[1].split()[0] if '--type=' in args else exe
                found.append({'pid': int(name), 'ppid': int(f[1]), 'pgid': int(f[2]), 'sid': int(f[3]), 'state': f[0], 'argMarker': marker in args,
                              'envReadable': readable, 'kind': kind})
        except (OSError, IndexError, ValueError):
            continue
    return sorted(found, key=lambda p: p['pid'])


chrome = '/opt/google/chrome/chrome'
child = subprocess.Popen([chrome, '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
                          f'--user-data-dir={profile}', 'about:blank'], env={**os.environ, 'TMPDIR': str(tmp)}, stdin=subprocess.DEVNULL,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
time.sleep(4)
record = {'leader': child.pid, 'before': mine()}
for p in record['before']:
    if p['argMarker']:
        os.kill(p['pid'], signal.SIGTERM)
time.sleep(10)
record['afterSigtermOfMarkedOnly'] = mine()
record['tmpListing'] = sorted(os.listdir(tmp))
for sig in (signal.SIGTERM, signal.SIGKILL):
    for p in mine():
        try:
            os.kill(p['pid'], sig)
        except ProcessLookupError:
            pass
    time.sleep(3)
record['remainingAtEnd'] = mine()
child.wait(timeout=10)
out.write_text(json.dumps(record, indent=1) + '\n')
summ = lambda rows: [(p['kind'], p['argMarker'], p['sid'] == child.pid, p['pgid'] == child.pid) for p in rows]
print('before (kind, argMarker, inLeaderSession, inLeaderGroup):', summ(record['before']))
print('after SIGTERM of marked only:', summ(record['afterSigtermOfMarkedOnly']))
print('tmp listing:', record['tmpListing'])
print('remaining at end:', len(record['remainingAtEnd']))
