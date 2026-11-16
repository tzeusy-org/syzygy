#!/usr/bin/env python3
"""Run the real-Chrome file and the lane's launch probe at the head N times, each in a fresh private TMPDIR.

Usage: python3 -I repeat_real_chrome.py <worktree at the head> <out-dir> <runs> <launches-per-probe>
Each run: (a) cdp-browser.browser.test.ts alone with TMPDIR=/tmp/r515b-b<i>, listing the TMPDIR before and after;
(b) docs/evidence/.../launch_probe.py in head mode with TMPDIR=/tmp/r515b-l<i>. Records the load average at each
start. Removes every TMPDIR it made. Writes <out-dir>/repeat-real-chrome.json.
"""
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys

wt, out, runs, launches = pathlib.Path(sys.argv[1]).resolve(), pathlib.Path(sys.argv[2]).resolve(), int(sys.argv[3]), sys.argv[4]
first = int(sys.argv[5]) if len(sys.argv) > 5 else 1  # number of the first run, so a later batch does not overwrite records
head = subprocess.run(['git', '-C', str(wt), 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
CHROME = re.compile(r'^\.?(com\.google\.Chrome|org\.chromium\.Chromium)\.')
probe = wt / 'docs/evidence/chrome-singleton-leak-2026-10-22/launch_probe.py'
rows = []
for i in range(first, first + runs):
    row = {'run': i}
    tmp = pathlib.Path(f'/tmp/r515b-b{i}')
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir()
    row['loadBeforeBrowserFile'] = open('/proc/loadavg').read().split()[:3]
    row['browserFileBefore'] = sorted(os.listdir(tmp))
    p = subprocess.run(['npx', 'vitest', 'run', '--project', '@syzygy/three-surface-poc-app', 'apps/three-surface-poc/src/cdp-browser.browser.test.ts'],
                       cwd=wt, env=dict(os.environ, TMPDIR=str(tmp)), capture_output=True, text=True, timeout=900)
    after = sorted(os.listdir(tmp))
    summary = [line.strip() for line in p.stdout.splitlines() if re.search(r'Tests |Test Files', line)]
    fails = [line.strip()[:200] for line in p.stdout.splitlines() if line.strip().startswith(('×', 'FAIL', 'AssertionError', 'Error:'))][:6]
    row['browserFile'] = {'exit': p.returncode, 'summary': summary, 'failLines': fails, 'after': after,
                          'chromeDirectoriesLeft': [n for n in after if CHROME.match(n)],
                          'otherLeft': [n for n in after if n != 'node-compile-cache' and not CHROME.match(n)]}
    shutil.rmtree(tmp, ignore_errors=True)
    ltmp = pathlib.Path(f'/tmp/r515b-l{i}')
    row['loadBeforeLaunchProbe'] = open('/proc/loadavg').read().split()[:3]
    rec = out / f'launch-probe-head-run{i}.json'
    lp = subprocess.run(['python3', '-I', str(probe), str(wt), head, str(rec), str(ltmp), launches, 'head'],
                        cwd=wt, capture_output=True, text=True, timeout=2400)
    row['launchProbe'] = {'exit': lp.returncode, 'stderrTail': lp.stderr[-600:] if lp.returncode else ''}
    if rec.exists():
        s = json.loads(rec.read_text())['summary']
        row['launchProbe'] |= {k: s[k] for k in ['launches', 'launchesThatClosed', 'launchesWhoseCloseThrew', 'closeErrors', 'killed',
                                                 'exitedCleanly', 'killedAndLeftAChromeDirectory', 'closedLaunchesThatLeftAnything',
                                                 'leftByLaunchesWhoseCloseThrew', 'entriesInPrivateTmpdirAtTheEnd', 'holds']}
    row['launchProbeTmpdirRemoved'] = not ltmp.exists()
    shutil.rmtree(ltmp, ignore_errors=True)
    rows.append(row)
    print(json.dumps(row), flush=True)
(out / f'repeat-real-chrome-runs{first}-{first + runs - 1}.json').write_text(json.dumps({'tool': 'repeat_real_chrome.py', 'treeCommit': head, 'rows': rows}, indent=1) + '\n')
