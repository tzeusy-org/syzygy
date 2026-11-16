#!/usr/bin/env python3
"""rev-532d (round 4): one vitest run with the JSON reporter, summarised. Reviewer tool, not authority.

usage: python3 -I suite_r4.py TREE OUT.json [--system] [FILE...]

Runs `npx vitest run` in TREE (with `--config packages/cap1-system/vitest.config.ts` under --system), on the named files
or the whole suite, with the JSON reporter into $TMPDIR, and writes the commit, /proc/loadavg at start and end, the exit
code, vitest's totals and every failed row (file, full name, first 400 characters of its failure). The JSON report itself
is not kept.
"""
import json, os, subprocess, sys, time

tree, out_path, rest = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3:]
system = '--system' in rest
files = [a for a in rest if a != '--system']
report = os.path.join(os.environ.get('TMPDIR', '/tmp'), 'suite-report.json')
cmd = ['npx', 'vitest', 'run', *(['--config', 'packages/cap1-system/vitest.config.ts'] if system else []), *files, '--reporter=json', f'--outputFile={report}']
env = {k: v for k, v in os.environ.items() if not k.startswith('VITEST')}
load = lambda: open('/proc/loadavg').read().strip()
start, began = load(), time.time()
done = subprocess.run(cmd, cwd=tree, capture_output=True, text=True, env=env)
end = load()
r = json.load(open(report, encoding='utf8'))
failed = [{'file': os.path.relpath(s['name'], tree), 'name': a['fullName'], 'failure': (a.get('failureMessages') or [''])[0][:400]}
          for s in r['testResults'] for a in s['assertionResults'] if a['status'] == 'failed']
suite_errors = [{'file': os.path.relpath(s['name'], tree), 'message': (s.get('message') or '')[:400]} for s in r['testResults'] if s.get('status') == 'failed' and not any(a['status'] == 'failed' for a in s['assertionResults'])]
out = {'tool': os.path.basename(__file__), 'commit': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True).stdout.strip(),
       'command': cmd[:-2] + ['--reporter=json'], 'loadavgStart': start, 'loadavgEnd': end, 'seconds': round(time.time() - began, 1), 'exit': done.returncode,
       'files': r.get('numTotalTestSuites'), 'testFiles': len(r['testResults']), 'total': r['numTotalTests'], 'passed': r['numPassedTests'], 'failed': r['numFailedTests'],
       'pending': r['numPendingTests'], 'todo': r.get('numTodoTests'), 'failedRows': failed, 'suiteErrors': suite_errors}
os.remove(report)
json.dump(out, open(out_path, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
print(json.dumps({k: out[k] for k in ('commit', 'exit', 'testFiles', 'total', 'passed', 'failed', 'pending', 'loadavgStart', 'loadavgEnd', 'seconds')}))
for f in failed + suite_errors: print(json.dumps(f)[:600])
