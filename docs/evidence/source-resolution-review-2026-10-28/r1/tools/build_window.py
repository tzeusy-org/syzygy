#!/usr/bin/env python3
"""Measure the window in which `npm run <script>` leaves built entry modules absent, and what a concurrent command sees.

Usage, from a checkout root with every dist built: build_window.py <script> > record.json
While the script runs, one thread polls every 5 ms for each watched entry file and records when it went missing and when it
came back; another runs `node apps/syzygy/dist/main.js dossier help` back to back and records each run's exit status and
whether its stderr names ERR_MODULE_NOT_FOUND. The watched entries are the `import` targets of the packages the
`syzygy dossier` path loads, and the app's two lazily imported entries.
"""
import json, os, subprocess, sys, threading, time

script = sys.argv[1]
WATCH = ['packages/support/dist/index.js', 'packages/cap1-core/dist/index.js', 'packages/polaris-generation-core/dist/index.js',
         'packages/polaris-generation-consent/dist/index.js', 'packages/three-surface-poc-core/dist/index.js',
         'packages/polaris-dossier/dist/index.js', 'apps/three-surface-poc/dist/polaris-generation/dossier-site.js',
         'apps/three-surface-poc/dist/main.js', 'apps/syzygy/dist/main.js']
missing = {w: [] for w in WATCH}
any_missing = []
stop = threading.Event()
runs = []


def poll():
    state = {w: True for w in WATCH}
    union = False
    while not stop.is_set():
        now = time.monotonic()
        absent_now = False
        for w in WATCH:
            present = os.path.exists(w)
            if present != state[w]:
                missing[w].append([now, None]) if not present else missing[w][-1].__setitem__(1, now)
                state[w] = present
            absent_now = absent_now or not present
        if absent_now != union:
            any_missing.append([now, None]) if absent_now else any_missing[-1].__setitem__(1, now)
            union = absent_now
        time.sleep(0.005)


def concurrent():
    while not stop.is_set():
        t = time.monotonic()
        r = subprocess.run(['node', 'apps/syzygy/dist/main.js', 'dossier', 'help'], capture_output=True, text=True)
        runs.append({'at': t, 'exit': r.returncode, 'moduleNotFound': 'ERR_MODULE_NOT_FOUND' in r.stderr,
                     'stderrHead': r.stderr.strip().splitlines()[0][:160] if r.stderr.strip() else ''})


load_before = open('/proc/loadavg').read().split()[:3]
threads = [threading.Thread(target=poll), threading.Thread(target=concurrent)]
for t in threads:
    t.start()
time.sleep(1.0)
start = time.monotonic()
build = subprocess.run(['npm', 'run', script, '--silent'], capture_output=True, text=True)
end = time.monotonic()
time.sleep(1.0)
stop.set()
for t in threads:
    t.join()
rel = lambda x: None if x is None else round(x - start, 3)
during = [r for r in runs if start <= r['at'] <= end]
print(json.dumps({
    'script': script, 'buildExit': build.returncode, 'buildSeconds': round(end - start, 3), 'loadavgBefore': load_before,
    'loadavgAfter': open('/proc/loadavg').read().split()[:3],
    'anyEntryMissing': [[rel(a), rel(b)] for a, b in any_missing],
    'anyEntryMissingSeconds': round(sum((b or end) - a for a, b in any_missing), 3),
    'perEntry': {w: [[rel(a), rel(b)] for a, b in v] for w, v in missing.items()},
    'concurrentRuns': len(runs), 'concurrentRunsDuringBuild': len(during),
    'concurrentFailedDuringBuild': sum(r['exit'] != 0 for r in during),
    'concurrentModuleNotFoundDuringBuild': sum(r['moduleNotFound'] for r in during),
    'concurrentFailedOutsideBuild': sum(r['exit'] != 0 for r in runs if not (start <= r['at'] <= end)),
    'firstFailure': next((r['stderrHead'] for r in during if r['exit'] != 0), None),
}, indent=1))
