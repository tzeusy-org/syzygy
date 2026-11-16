#!/usr/bin/env python3
"""What does each installed Chrome name its singleton directory? (hosted run 39768592736)

Usage: name_probe.py <private-parent> <out.json> <chrome> [<chrome>...]

Each Chrome is launched as `launchBrowser` launches it (headless, a throwaway profile, a DevTools port), with
TMPDIR=<private-parent>/<n> (short), and that TMPDIR is listed once the profile's SingletonSocket link exists: the link
names the directory Chrome made for its process singleton. The record carries each Chrome's version, the sha256 of its
executable, that directory's name with the random part masked, and whether the name starts with a dot. Chrome is stopped
through the process-group handle this script holds, never by name. <private-parent> must not exist or be empty.
"""
import hashlib
import json
import os
import pathlib
import re
import signal
import subprocess
import sys
import tempfile
import time

PARENT, OUT, CHROMES = pathlib.Path(sys.argv[1]).resolve(), pathlib.Path(sys.argv[2]).resolve(), sys.argv[3:]
assert CHROMES, 'name at least one Chrome'
assert not PARENT.exists() or not any(PARENT.iterdir()), 'the parent must not exist or be empty'
shared = [pathlib.Path('/'), pathlib.Path(tempfile.gettempdir()), pathlib.Path(os.environ.get('TMPDIR') or '/tmp'), pathlib.Path.home()]
assert all(PARENT != d.resolve() and PARENT not in d.resolve().parents for d in shared), 'the parent must not be, or contain, a shared directory'
PARENT.mkdir(parents=True, exist_ok=True)
rows = []
for n, exe in enumerate(CHROMES):
    tmp = PARENT / str(n)
    profile = tmp / 'profile'
    profile.mkdir(parents=True)
    version = subprocess.run([exe, '--version'], capture_output=True, text=True).stdout.strip()
    child = subprocess.Popen(
        [exe, '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
         '--disable-background-networking', f'--user-data-dir={profile}', '--remote-debugging-port=0', 'about:blank'],
        env={**os.environ, 'TMPDIR': str(tmp)}, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    link = profile / 'SingletonSocket'
    deadline = time.time() + 60
    while time.time() < deadline and not os.path.islink(link):
        time.sleep(0.2)
    target = os.readlink(link) if os.path.islink(link) else None
    try:
        os.killpg(child.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    child.wait()
    name = pathlib.PurePath(target).parent.name if target else None
    shape = re.sub(r'(?<=\.)[A-Za-z0-9]{6}$', '<random>', name) if name else None
    resolved = pathlib.Path(exe).resolve()
    rows.append({'executable': exe, 'executableSha256': hashlib.sha256(resolved.read_bytes()).hexdigest(), 'version': version, 'singletonDirectoryNameMasked': shape,
                 'shape': shape, 'leadingDot': name.startswith('.') if name else None, 'directoryStillThereAfterKill': (tmp / name).is_dir() if name else None})
    print(json.dumps(rows[-1]), flush=True)
OUT.write_text(json.dumps({'tool': 'name_probe.py', 'command': 'TMPDIR=<private>/<n> <chrome> --headless=new --no-sandbox --user-data-dir=<private>/<n>/profile --remote-debugging-port=0 about:blank', 'chromes': rows}, indent=1) + '\n')
import shutil
shutil.rmtree(PARENT, ignore_errors=True)
