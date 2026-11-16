#!/usr/bin/env python3
"""Does a SIGTERM to a run's process group leave fixture directories at the reviewed head? (rev-509)

Usage: term_probe.py <clone> <private-tmpdir under /tmp/r509->
SIGTERM goes to the process group of the child this script started; if the group is still
alive 60 s later it gets SIGKILL (recorded). Samples the TMPDIR 5 s and 30 s after exit.
"""
import json
import os
import pathlib
import re
import shutil
import signal
import subprocess
import sys
import time

CLONE, TMP = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
assert str(TMP).startswith('/tmp/r509-'), TMP
NAME = re.compile(r'^syzygy-poc-surface-fixture-(template-)?p(\d+)-')
PREFIX = 'syzygy-poc-surface-fixture-'


def listing():
    rows = {'dead': 0, 'live': 0, 'legacy': 0}
    for name in (p.name for p in TMP.iterdir() if p.name.startswith(PREFIX)):
        match = NAME.match(name)
        if match is None:
            rows['legacy'] += 1
            continue
        try:
            os.kill(int(match.group(2)), 0)
            rows['live'] += 1
        except ProcessLookupError:
            rows['dead'] += 1
        except OSError:
            rows['live'] += 1
    return rows


shutil.rmtree(TMP, ignore_errors=True)
TMP.mkdir(parents=True)
log = pathlib.Path(__file__).resolve().parent / 'term-probe.log'
with log.open('w') as handle:
    run = subprocess.Popen(['npx', 'vitest', 'run', '--project', '@syzygy/three-surface-poc-app'], cwd=CLONE,
                           env={**os.environ, 'TMPDIR': str(TMP)}, stdout=handle, stderr=subprocess.STDOUT, start_new_session=True)
    at_signal = None
    started = time.time()
    while run.poll() is None:
        if sum(1 for n in os.listdir(TMP) if n.startswith(PREFIX + 'p')) >= 3:
            at_signal = {'seconds': round(time.time() - started, 1), **listing()}
            os.killpg(run.pid, signal.SIGTERM)
            break
        time.sleep(0.1)
    escalated = False
    try:
        run.wait(timeout=60)
    except subprocess.TimeoutExpired:
        escalated = True
        os.killpg(run.pid, signal.SIGKILL)
        run.wait()
time.sleep(5)
five = listing()
time.sleep(25)
thirty = listing()
print(json.dumps({'signal': 'SIGTERM to own process group', 'atSignal': at_signal, 'exit': run.returncode, 'escalatedToSigkill': escalated,
                  'fiveSecondsAfterExit': five, 'thirtySecondsAfterExit': thirty}, indent=1))
