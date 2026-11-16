#!/usr/bin/env python3
"""Run package-reader.test.ts with vitest's configured timeouts (no --testTimeout override) N times, each under its own
private TMPDIR, and record per-run exit, wall time, load and every test's status and duration (rev-520).

usage: python3 -I run_file.py TREE LABEL RUNS OUTDIR [--full] [-- EXTRA-VITEST-ARGS...]
Each run's raw vitest JSON report is kept as OUTDIR/LABEL-<i>.report.json; the summary is OUTDIR/LABEL.summary.json.
The TMPDIR /tmp/r520-LABEL-<i> is created fresh (refused if it exists), listed after the run, and removed."""
import datetime, json, os, shutil, subprocess, sys, threading, time

FILE = 'packages/polaris-generation-consent/src/package-reader.test.ts'
PROJECT = '@syzygy/polaris-generation-consent'
tree, label, runs, outdir = os.path.abspath(sys.argv[1]), sys.argv[2], int(sys.argv[3]), os.path.abspath(sys.argv[4])
full = '--full' in sys.argv
extra = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()
dirty = subprocess.run(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=tree, capture_output=True, text=True, check=True).stdout
summary = {'label': label, 'commit': commit, 'trackedDirty': bool(dirty), 'full': full, 'extraArgs': extra, 'cores': os.cpu_count(), 'runs': []}
for i in range(1, runs + 1):
    tmp = f'/tmp/r520-{label}-{i}'
    os.mkdir(tmp)
    report = os.path.join(outdir, f'{label}-{i}.report.json')
    sel = [] if full else ['--project', PROJECT, FILE]
    cmd = ['npx', 'vitest', 'run', *sel, '--reporter=json', f'--outputFile={report}', *extra]
    samples, stop = [os.getloadavg()[0]], threading.Event()
    def sample():
        while not stop.wait(5): samples.append(os.getloadavg()[0])
    th = threading.Thread(target=sample, daemon=True)
    started = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
    t0 = time.monotonic(); th.start()
    try:
        done = subprocess.run(cmd, cwd=tree, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmp})
    finally:
        stop.set(); th.join()
    wall = round(time.monotonic() - t0, 1)
    left = sorted(os.listdir(tmp))
    shutil.rmtree(tmp)
    data = json.load(open(report)) if os.path.exists(report) else {}
    suites = [s for s in data.get('testResults', []) if os.path.relpath(s['name'], tree) == FILE]
    tests = [{'name': a['fullName'], 'status': a['status'], 'durationMs': None if a.get('duration') is None else round(a['duration']),
              'failureHead': (a.get('failureMessages') or [''])[0].split('\n')[0][:120]} for s in suites for a in s['assertionResults']]
    run = {'index': i, 'startedAt': started, 'command': ' '.join(cmd), 'exitCode': done.returncode, 'wallSeconds': wall,
           'load1': {'start': round(samples[0], 2), 'end': round(os.getloadavg()[0], 2), 'min': round(min(samples), 2), 'max': round(max(samples), 2), 'samples': len(samples)},
           'suiteTotals': {k: data.get(k) for k in ('numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests')},
           'fileTests': len(tests), 'tmpLeftovers': left, 'tests': tests,
           'stderrTail': done.stderr[-1500:]}
    summary['runs'].append(run)
    slow = sorted((t for t in tests if t['durationMs'] is not None), key=lambda t: -t['durationMs'])[:5]
    print(f"{label} run {i}: exit {done.returncode}, {wall} s, load1 {run['load1']}, {len(tests)} tests, "
          f"{sum(t['status'] != 'passed' for t in tests)} not passed, leftovers {len(left)}; slowest "
          + '; '.join(f"{t['durationMs']} {t['name'][:50]}" for t in slow), flush=True)
    with open(os.path.join(outdir, f'{label}.summary.json'), 'w') as f: json.dump(summary, f, indent=1)
