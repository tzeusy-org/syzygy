#!/usr/bin/env python3
"""rev-532: repeated runs of PR 532's changed test files and of the affected projects, unmodified, under the host's load.
Reviewer tool, not authority.

usage: python3 -I determinism_rev.py TREE OUT.json FILE_RUNS PROJECT_RUNS

Runs, in order, each with the JSON reporter, recording exit, totals, failed titles, load1 at start and seconds:
  FILE_RUNS x the eight changed unit-tier test files in one `npx vitest run <files>`;
  FILE_RUNS x the changed system test under packages/cap1-system/vitest.config.ts;
  PROJECT_RUNS x the four affected root projects (`--project` each);
  PROJECT_RUNS x the whole system suite (`npx vitest run --config packages/cap1-system/vitest.config.ts`).
The tree is built once first (`npm run build`), and checked clean at the end.
"""
import json, os, subprocess, sys, tempfile, time

tree, out_path, file_runs, project_runs = os.path.abspath(sys.argv[1]), sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
UNIT = ['apps/three-surface-poc/src/capture-test-artifact-main.test.ts', 'apps/three-surface-poc/src/main.test.ts',
        'apps/three-surface-poc/src/polaris-generation/redis-shaped-discovery.test.ts', 'packages/polaris-dossier/src/git-object-reader.test.ts',
        'packages/polaris-generation-core/src/dossier-evaluation.test.ts', 'packages/polaris-generation-core/src/dossier-profile.test.ts',
        'packages/polaris-generation-core/src/excerpt.test.ts', 'packages/three-surface-poc-core/src/test-artifact-verification.test.ts']
SYSTEM = ['--config', 'packages/cap1-system/vitest.config.ts']
DE = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
PROJECTS = [a for p in ('@syzygy/three-surface-poc-app', '@syzygy/polaris-dossier', '@syzygy/polaris-generation-core', '@syzygy/three-surface-poc-core')
            for a in ('--project', p)]
loadavg = lambda: float(open('/proc/loadavg').read().split()[0])
env = {k: v for k, v in os.environ.items() if not k.startswith('VITEST')}

def run(label, args):
    report = tempfile.mktemp(suffix='.json')
    load1, began = loadavg(), time.time()
    d = subprocess.run(['npx', 'vitest', 'run', *args, '--reporter=json', f'--outputFile={report}'], cwd=tree, capture_output=True, text=True, env=env, timeout=3600)
    r = {'label': label, 'exit': d.returncode, 'load1Start': load1, 'load1End': loadavg(), 'seconds': round(time.time() - began, 1)}
    if os.path.exists(report):
        j = json.load(open(report, encoding='utf8')); os.remove(report)
        r.update({k: j.get(k) for k in ('numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTodoTests', 'numTotalTestSuites', 'numFailedTestSuites')})
        r['files'] = len(j['testResults'])
        r['failed'] = [{'file': s['name'].removeprefix(tree + '/'), 'title': a['fullName'], 'msg': (a.get('failureMessages') or [''])[0][:300]}
                       for s in j['testResults'] for a in s['assertionResults'] if a['status'] == 'failed']
        r['suiteErrors'] = [{'file': s['name'].removeprefix(tree + '/'), 'msg': (s.get('message') or '')[:300]} for s in j['testResults'] if s.get('status') == 'failed' and not any(a['status'] == 'failed' for a in s['assertionResults'])]
    else:
        r['tail'] = (d.stdout + d.stderr)[-1500:]
    print(json.dumps({k: v for k, v in r.items() if k not in ('failed',)} | {'failedTitles': [f['title'][-80:] for f in r.get('failed', [])]}), flush=True)
    return r

b = subprocess.run(['npm', 'run', 'build'], cwd=tree, capture_output=True, text=True)
if b.returncode: sys.exit('build failed: ' + (b.stdout + b.stderr)[-1500:])
runs = []
runs += [run(f'changed-unit-files #{k + 1}', UNIT) for k in range(file_runs)]
runs += [run(f'changed-system-file #{k + 1}', [*SYSTEM, DE]) for k in range(file_runs)]
runs += [run(f'affected-projects #{k + 1}', PROJECTS) for k in range(project_runs)]
runs += [run(f'system-suite #{k + 1}', SYSTEM) for k in range(project_runs)]
clean = subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode == 0
json.dump({'tool': 'determinism_rev.py', 'tree': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True).stdout.strip(),
           'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(), 'cpus': os.cpu_count(), 'treeClean': clean, 'runs': runs},
          open(out_path, 'w', encoding='utf8'), indent=1)
