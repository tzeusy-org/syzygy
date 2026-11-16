#!/usr/bin/env python3
"""One full-suite attempt's runs, summarized from vitest's JSON reports (syzygy-bpyt.4.5). Evidence tool, not authority.

usage: python3 -I suite_summary.py TREE BASE HEAD OUT.json LABEL RUN [RUN ...]

Each RUN is `name:commit:meta:report`: the run's name, the commit its clone had checked out, the meta file its driver wrote
(lines `<name> start <iso> load1 <x>[ commit <sha>]` and `<name> exit <code> end <iso> load1 <x>`) and the JSON report
vitest wrote with `--reporter=json`. For each run it records the totals vitest reports, every failed test (file relative to
the clone, full name, the failure's first line, its duration) and every failed file with no failed test (a hook or import
failure), each marked `inChangedFile` when that file differs between BASE and HEAD in TREE. The reports themselves are not
retained: about 2 MB each, and every failure they hold is copied here.
"""
import json, os, subprocess, sys

tree, base, head, out_path, label = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
changed = set(p for p in git('diff', '--name-only', base, head).split('\n') if p)
TOTALS = ('numTotalTestSuites', 'numFailedTestSuites', 'numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTodoTests')
runs = []
for spec in sys.argv[6:]:
    name, commit, meta, report = spec.split(':', 3)
    lines = [l.split() for l in open(meta, encoding='utf8').read().splitlines()]
    start, end = next(l for l in lines if l[1] == 'start'), next(l for l in lines if l[1] == 'exit')
    if 'commit' in start and start[start.index('commit') + 1] != commit: sys.exit(f'{name}: meta names commit {start[start.index("commit") + 1]}')
    data = json.load(open(report, encoding='utf8'))
    roots = {os.path.commonpath([s['name'] for s in data['testResults']])}
    root = roots.pop()
    while not os.path.exists(os.path.join(root, 'package-lock.json')): root = os.path.dirname(root)
    failures, file_failures = [], []
    for suite in data['testResults']:
        rel = os.path.relpath(suite['name'], root)
        failed = [a for a in suite['assertionResults'] if a['status'] == 'failed']
        failures += [{'file': rel, 'test': a['fullName'], 'first': ((a.get('failureMessages') or [''])[0].split('\n')[0])[:200],
                      'durationMs': round(a['duration']) if a.get('duration') is not None else None, 'inChangedFile': rel in changed} for a in failed]
        if suite['status'] == 'failed' and not failed:
            file_failures.append({'file': rel, 'first': (suite.get('message') or '').split('\n')[0][:200], 'inChangedFile': rel in changed})
    runs.append({'name': name, 'commit': commit, 'start': start[2], 'load1Start': float(start[4]), 'exit': int(end[2]), 'end': end[4],
                 'load1End': float(end[6]), 'success': data['success'], 'totals': {k: data[k] for k in TOTALS},
                 'failedTests': failures, 'failedFilesWithoutFailedTest': file_failures,
                 'failuresInChangedFiles': sum(f['inChangedFile'] for f in failures + file_failures)})
json.dump({'tool': 'suite_summary.py', 'attempt': label, 'cpus': os.cpu_count(), 'changedFilesBetween': [base, head], 'runs': runs},
          open(out_path, 'w', encoding='utf8'), indent=1)
for r in runs: print(r['name'], r['commit'][:8], r['totals']['numFailedTests'], len(r['failedFilesWithoutFailedTest']), r['failuresInChangedFiles'])
