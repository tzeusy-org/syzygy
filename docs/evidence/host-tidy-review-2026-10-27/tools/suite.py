"""R-GP-IMPL-HOST-TIDY-1 reviewer tool: one Vitest run in a tree, recorded by totals, failures (with their first error line)
and per-file counts. Usage: python3 -I suite.py <tree> <tmpdir> <out.json> [--file <test file>] [--project <name>]...
With no --project, the three projects this PR touches run. The tmpdir is private to the run and removed after it."""
import json, os, shutil, subprocess, sys, time

tree, tmpdir, out = sys.argv[1:4]
rest = sys.argv[4:]
projects = [rest[i + 1] for i, a in enumerate(rest) if a == '--project'] or ['@syzygy/three-surface-poc-app', '@syzygy/http-host', '@syzygy/cap1-daemon']
files = [rest[i + 1] for i, a in enumerate(rest) if a == '--file']
os.makedirs(tmpdir, exist_ok=True)
report = os.path.join(tmpdir, 'report.json')
args = ['npx', 'vitest', 'run', '--reporter=default', '--reporter=json', f'--outputFile.json={report}', *files]
for p in projects:
    args += ['--project', p]
git = lambda *a: subprocess.run(['git', '-C', tree, *a], capture_output=True, text=True, check=True).stdout
dists = sorted(subprocess.run(['find', tree, '-path', f'{tree}/node_modules', '-prune', '-o', '-type', 'd', '-name', 'dist', '-print'],
                              capture_output=True, text=True).stdout.split())
load, t0 = os.getloadavg()[0], time.time()
r = subprocess.run(args, cwd=tree, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}, timeout=5400)
log = r.stdout + r.stderr
data = json.load(open(report)) if os.path.exists(report) else {'testResults': [], 'numTotalTests': 0, 'numPassedTests': 0, 'numFailedTests': 0, 'numPendingTests': 0}
lines = log.splitlines()


def first_error(name):
    tail = name.split(' > ')[-1][:40]
    heads = [i for i, line in enumerate(lines) if 'FAIL' in line and tail in line]
    for line in lines[heads[-1] + 1:] if heads else []:
        if line.strip() and 'FAIL' not in line:
            return line.strip()[:300]
    return None


rel = lambda n: n.replace(tree.rstrip('/') + '/', '')
failures = [{'file': rel(f['name']), 'name': a['fullName'], 'firstError': first_error(a['fullName'])}
            for f in data['testResults'] for a in f['assertionResults'] if a['status'] == 'failed']
failed_files = [{'file': rel(f['name']), 'message': (f.get('message') or '')[:300]} for f in data['testResults']
                if f.get('status') == 'failed' and not any(a['status'] == 'failed' for a in f['assertionResults'])]
rec = {'tree': tree, 'commit': git('rev-parse', 'HEAD').strip(), 'treeId': git('rev-parse', 'HEAD^{tree}').strip(),
       'command': ' '.join(args[:3] + args[6:]), 'distDirsBefore': [rel(d) for d in dists], 'exit': r.returncode,
       'files': len(data['testResults']), 'total': data['numTotalTests'], 'passed': data['numPassedTests'], 'failed': data['numFailedTests'],
       'skipped': data['numPendingTests'] + data.get('numTodoTests', 0), 'failures': failures, 'failedFilesWithoutTest': failed_files,
       'load1': round(load, 1), 'load1After': round(os.getloadavg()[0], 1), 'wallSeconds': round(time.time() - t0, 1),
       'cleanAfter': git('status', '--porcelain') == '',
       'sweep': [{'name': a['title'][:80], 'status': a['status'], 'ms': round(a.get('duration') or 0)} for f in data['testResults']
                 if f['name'].endswith('polaris-authority-sweep.test.ts') for a in f['assertionResults']],
       'perFile': {rel(f['name']): [len(f['assertionResults']), sum(a['status'] == 'passed' for a in f['assertionResults'])]
                   for f in sorted(data['testResults'], key=lambda f: f['name'])}}
shutil.rmtree(tmpdir, ignore_errors=True)
json.dump(rec, open(out, 'w'), indent=1)
print({k: v for k, v in rec.items() if k not in ('failures', 'perFile', 'distDirsBefore', 'failedFilesWithoutTest', 'sweep')})
print('distDirsBefore:', len(rec['distDirsBefore']), '| sweep:', [(t['status'], t['ms']) for t in rec['sweep']])
for f in failures:
    print(' FAIL', f['file'], '>', f['name'], '|', f['firstError'])
for f in failed_files:
    print(' FAILED FILE', f['file'], '|', f['message'])
