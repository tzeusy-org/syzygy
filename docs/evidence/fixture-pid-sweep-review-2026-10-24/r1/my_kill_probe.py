#!/usr/bin/env python3
"""Reviewer's own kill-then-fresh-run probe (rev-509), independent of the lane's script.

Usage: my_kill_probe.py <clone> <private-tmpdir under /tmp/r509-> <out.json> <fresh-test-file>

1. Start the app project in a new session with TMPDIR=<private>; once 3 fixture copies exist,
   SIGKILL that session's process group (the group of the child this script started; nothing else).
2. Wait 5 s, list the private TMPDIR.
3. Mutant fresh run: one fixture-using test file, with the sweep call removed from the helper.
4. Restore the helper (sha256 checked), then an unmutated fresh run of the same file.
After each step the fixture directories are classified by name and kill(pid, 0).
"""
import hashlib
import json
import os
import pathlib
import re
import shutil
import signal
import subprocess
import sys
import time

CLONE, TMP, OUT, FRESH_FILE = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3]), sys.argv[4]
assert str(TMP).startswith('/tmp/r509-'), TMP
SRC = CLONE / 'apps/three-surface-poc/src/test-model-fixture.ts'
OLD = '  removeFixturesOfDeadProcesses();\n  const root = mkdtempSync('
NEW = '  const root = mkdtempSync('
NAME = re.compile(r'^syzygy-poc-surface-fixture-(template-)?p(\d+)-')
PREFIX = 'syzygy-poc-surface-fixture-'
original = SRC.read_bytes()
digest = hashlib.sha256(original).hexdigest()
commit = subprocess.run(['git', '-C', str(CLONE), 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
env = {**os.environ, 'TMPDIR': str(TMP)}


def alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except OSError:
        return True


def listing():
    rows = {'dead': [], 'live': [], 'legacy': []}
    for name in sorted(p.name for p in TMP.iterdir() if p.name.startswith(PREFIX)):
        match = NAME.match(name)
        rows['legacy' if match is None else 'live' if alive(int(match.group(2))) else 'dead'].append(name)
    return rows


def fresh_run(label):
    log = OUT.with_suffix(f'.{label}.log')
    with log.open('w') as handle:
        proc = subprocess.run(['npx', 'vitest', 'run', FRESH_FILE, '--project', '@syzygy/three-surface-poc-app'],
                              cwd=CLONE, env=env, stdout=handle, stderr=subprocess.STDOUT)
    tail = [line for line in log.read_text().splitlines() if 'Test Files' in line or 'Tests ' in line]
    return {'exit': proc.returncode, 'summary': tail, 'after': listing()}


shutil.rmtree(TMP, ignore_errors=True)
TMP.mkdir(parents=True)
record = {'tool': 'my_kill_probe.py', 'treeCommit': commit, 'helperSha256': digest, 'freshFile': FRESH_FILE,
          'mutant': {'id': 'sweep-not-called', 'old': OLD, 'new': NEW}}
try:
    with OUT.with_suffix('.killed.log').open('w') as handle:
        first = subprocess.Popen(['npx', 'vitest', 'run', '--project', '@syzygy/three-surface-poc-app'], cwd=CLONE, env=env,
                                 stdout=handle, stderr=subprocess.STDOUT, start_new_session=True)
        started = time.time()
        at_kill = None
        while first.poll() is None:
            copies = [n for n in os.listdir(TMP) if n.startswith(PREFIX + 'p')]
            if len(copies) >= 3:
                at_kill = {'seconds': round(time.time() - started, 1), 'listing': listing()}
                os.killpg(first.pid, signal.SIGKILL)
                break
            time.sleep(0.1)
        first.wait()
    time.sleep(5)
    record['killed'] = {'groupKilled': first.pid, 'atKill': at_kill, 'fiveSecondsLater': listing()}
    assert at_kill is not None, 'run ended before three copies existed'
    text = original.decode()
    assert text.count(OLD) == 1, text.count(OLD)
    SRC.write_text(text.replace(OLD, NEW, 1))
    try:
        record['mutantFreshRun'] = fresh_run('mutant')
    finally:
        SRC.write_bytes(original)
    assert hashlib.sha256(SRC.read_bytes()).hexdigest() == digest
    record['unmutatedFreshRun'] = fresh_run('unmutated')
finally:
    SRC.write_bytes(original)
assert hashlib.sha256(SRC.read_bytes()).hexdigest() == digest
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps(record, indent=1)[:6000])
