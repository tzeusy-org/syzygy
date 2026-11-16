"""syzygy-bpyt.8.36: the PR 524 reviewer's repeat.py (docs/evidence/argv-guards-review-2026-10-25/tools/repeat.py), unchanged but for
FILES, which also names the new workspace-reach.test.ts. The reviewer's docstring follows.

rev-524: run the three changed test files N times in a clean tree, each run with a private TMPDIR (removed afterwards), and record
per-run totals, every failure, and the slowest tests by vitest's own per-test duration, plus the host load average at each start.

Usage: python3 -I repeat.py <tree> <n> <tmpdir> <out.json>
"""
import json, os, shutil, subprocess, sys, time

tree, n, tmpdir, out_file = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
FILES = ['packages/polaris-dossier/src/argv.test.ts', 'packages/polaris-dossier/src/subpath-imports.test.ts',
         'packages/polaris-generation-core/src/island-boundary.test.ts', 'packages/polaris-generation-core/src/workspace-reach.test.ts']
runs = []
for i in range(n):
    os.makedirs(tmpdir, exist_ok=True)
    report = os.path.join(tmpdir, 'report.json')
    load = os.getloadavg()
    started = time.time()
    run = subprocess.run(['npx', 'vitest', 'run', '--project', '@syzygy/polaris-dossier', '--project', '@syzygy/polaris-generation-core',
                          '--reporter=json', f'--outputFile={report}', *FILES], cwd=tree, capture_output=True, text=True,
                         env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}, timeout=900)
    wall = round(time.time() - started, 1)
    data = json.load(open(report)) if os.path.exists(report) else None
    shutil.rmtree(tmpdir, ignore_errors=True)
    tests = [] if data is None else [(t['fullName'], t['status'], t.get('duration') or 0) for f in data['testResults'] for t in f['assertionResults']]
    row = {'run': i + 1, 'exit': run.returncode, 'wallSeconds': wall, 'load1': round(load[0], 1),
           'total': None if data is None else data['numTotalTests'], 'passed': None if data is None else data['numPassedTests'],
           'failed': [t for t in tests if t[1] != 'passed'], 'slowest': sorted(tests, key=lambda t: -t[2])[:6],
           'fileDurations': [] if data is None else [(f['name'].split('/src/')[-1], round(f['endTime'] - f['startTime'])) for f in data['testResults']]}
    runs.append(row)
    print(row['run'], 'exit', row['exit'], 'passed', row['passed'], '/', row['total'], 'wall', wall, 'load1', row['load1'],
          'failed', row['failed'], 'slowest', [(t[0][-70:], round(t[2])) for t in row['slowest'][:3]], row['fileDurations'], flush=True)
json.dump({'tree': tree, 'files': FILES, 'runs': runs}, open(out_file, 'w'), indent=1, ensure_ascii=False)
