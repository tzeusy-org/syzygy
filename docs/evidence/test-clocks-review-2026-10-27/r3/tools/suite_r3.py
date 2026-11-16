#!/usr/bin/env python3
"""rev-532c (round 3): run one vitest invocation and summarize it. Reviewer tool, not authority.

usage: python3 -I suite_r3.py TREE OUT.json [VITEST ARGS...]

Runs `npx vitest run <ARGS> --reporter=json --outputFile=<TMPDIR>/suite.json` in TREE with VITEST* variables removed,
records /proc/loadavg before and after, the exit code, the totals, every failed row (file, title, first failure line) and
every file that failed to load, then deletes the raw report.
"""
import json, os, subprocess, sys, time
tree, out, args = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3:]
report = os.path.join(os.environ.get('TMPDIR', '/tmp'), 'suite.json')
la = lambda: open('/proc/loadavg').read().split()[:3]
began, l0 = time.time(), la()
d = subprocess.run(['npx', 'vitest', 'run', *args, '--reporter=json', f'--outputFile={report}'], cwd=tree, capture_output=True, text=True,
                   env={k: v for k, v in os.environ.items() if not k.startswith('VITEST')})
l1 = la()
r = json.load(open(report, encoding='utf8')) if os.path.exists(report) else {}
failed = [{'file': os.path.relpath(s['name'], tree), 'title': a['fullName'], 'failure': (a.get('failureMessages') or [''])[0].split('\n')[0][:200]}
          for s in r.get('testResults', []) for a in s['assertionResults'] if a['status'] == 'failed']
broken = [{'file': os.path.relpath(s['name'], tree), 'message': (s.get('message') or '')[:300]} for s in r.get('testResults', []) if s.get('status') == 'failed' and not s['assertionResults']]
summary = {k: r.get(k) for k in ('numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTodoTests', 'numTotalTestSuites', 'numFailedTestSuites', 'success')}
rev = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True).stdout.strip()
json.dump({'tool': os.path.basename(__file__), 'commit': rev, 'args': args, 'exit': d.returncode, 'seconds': round(time.time() - began), 'load': [l0, l1],
           'summary': summary, 'failed': failed, 'brokenFiles': broken, 'stdoutTail': d.stdout[-1500:], 'stderrTail': d.stderr[-1500:]}, open(out, 'w'), indent=1)
if os.path.exists(report): os.remove(report)
print(json.dumps({'commit': rev[:8], 'exit': d.returncode, 'summary': summary, 'failed': len(failed), 'broken': len(broken), 'load': [l0, l1], 'seconds': round(time.time() - began)}))
