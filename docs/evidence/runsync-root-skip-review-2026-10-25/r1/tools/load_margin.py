#!/usr/bin/env python3
"""rev-525 load margin: run daemon-entry-unchanged.system.test.ts N times at once, unmutated, and record each runSync row's time.

usage: python3 -I load_margin.py TREE N OUT.json

Each copy runs in its own session and private TMPDIR (/tmp/r525-load-*), removed afterwards. The point is the slowest runSync row
under self-made contention, against runSync's 20 s timeout. Load averages are read from /proc/loadavg before and every second
during the run. Copies past 300 s are SIGKILLed by session; survivors 3 s after exit are recorded and SIGKILLed."""
import json, os, shutil, signal, subprocess, sys, tempfile, time

tree, n, out_path = os.path.realpath(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
RUNSYNC_ROW = ('prints the usage', 'is refused with exit 1', 'governed plane is refused', '`dossier')
load = lambda: open('/proc/loadavg').read().split()[:3]
runs, loads = [], [load()]
for i in range(n):
    tmp = tempfile.mkdtemp(prefix=f'r525-load-{i}-', dir='/tmp')
    report = os.path.join(tmp, 'report.json')
    proc = subprocess.Popen(['npx', 'vitest', 'run', '--config', 'packages/cap1-system/vitest.config.ts', 'daemon-entry-unchanged',
                             '--reporter=json', f'--outputFile={report}'], cwd=tree, start_new_session=True,
                            env={**os.environ, 'TMPDIR': tmp}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    runs.append({'proc': proc, 'tmp': tmp, 'report': report})
t0 = time.monotonic()
while any(r['proc'].poll() is None for r in runs):
    if time.monotonic() - t0 > 300:
        for r in runs:
            if r['proc'].poll() is None: os.killpg(r['proc'].pid, signal.SIGKILL)
        break
    loads.append(load())
    time.sleep(1)
wall = round(time.monotonic() - t0, 1)
time.sleep(3)
survivors = []
for p in os.listdir('/proc'):
    if not p.isdigit(): continue
    try: text = open(f'/proc/{p}/stat').read()
    except OSError: continue
    sid = int(text[text.rindex(')') + 2:].split()[3])
    if sid in {r['proc'].pid for r in runs}:
        survivors.append(int(p))
        try: os.kill(int(p), signal.SIGKILL)
        except ProcessLookupError: pass
rows, exits = [], []
for r in runs:
    exits.append(r['proc'].returncode)
    data = json.load(open(r['report'])) if os.path.exists(r['report']) else {}
    for s in data.get('testResults', []):
        for a in s.get('assertionResults', []):
            rows.append({'name': a['title'], 'status': a['status'], 'ms': round(a.get('duration') or 0)})
    shutil.rmtree(r['tmp'], ignore_errors=True)
runsync = [x for x in rows if any(k in x['name'] for k in RUNSYNC_ROW) and 'never loads the POC app' not in x['name']]
slowest = sorted(runsync, key=lambda x: -x['ms'])[:5]
out = {'tool': 'rev-525/tools/load_margin.py', 'copies': n, 'wallSeconds': wall, 'exitCodes': exits, 'rows': len(rows),
       'runSyncRows': len(runsync), 'failed': sum(x['status'] == 'failed' for x in rows), 'slowestRunSync': slowest,
       'load1Max': max(float(l[0]) for l in loads), 'loadFirst': loads[0], 'loadLast': loads[-1], 'survivors': survivors}
open(out_path, 'w').write(json.dumps(out, indent=1) + '\n')
print(json.dumps(out, indent=1))
