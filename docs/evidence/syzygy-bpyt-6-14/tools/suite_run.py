"""syzygy-bpyt.6.14: run the whole vitest suite (every project of the root config, as `npm test` runs it) once in a clean tree,
with a private TMPDIR, and record the totals, the tree's dist/ state and each failure's first error line (so a load timeout can be
told from an assertion). After syzygy-bpyt-6-15/suite_run.py, with every project in place of one.

Vitest's JSON reporter gives a failure's message as STACK_TRACE_ERROR when it cannot serialize the stack, so the default
reporter runs beside it, and each failure's first error line is read from its block in that output, written to <out>.log.
Usage: python3 -I suite_run.py <tree> <tmpdir> <out.json>
"""
import json, os, shutil, subprocess, sys, time

tree, tmpdir, out_file = sys.argv[1:4]
git = lambda *a: subprocess.run(['git', '-C', tree, *a], capture_output=True, text=True, check=True).stdout
assert git('status', '--porcelain') == ''
os.makedirs(tmpdir, exist_ok=True)
report = os.path.join(tmpdir, 'report.json')
args = ['npx', 'vitest', 'run', '--reporter=default', '--reporter=json', f'--outputFile.json={report}']
load, started = os.getloadavg()[0], time.time()
r = subprocess.run(args, cwd=tree, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}, timeout=3600)
data = json.load(open(report))
log = r.stdout + r.stderr
open(out_file[:-len('.json')] + '.log' if out_file.endswith('.json') else out_file + '.log', 'w').write(log)
lines = log.splitlines()


def first_error(file, name):
    """The first non-blank line after the last FAIL heading naming this test, in the default reporter's output."""
    heads = [i for i, line in enumerate(lines) if 'FAIL' in line and file in line and name.split(' ')[-1] in line]
    for line in lines[heads[-1] + 1:] if heads else []:
        if line.strip() and not line.strip().startswith('FAIL'):
            return line.strip()[:300]
    return None


failures = [{'file': f['name'].replace(tree.rstrip('/') + '/', ''), 'name': a['fullName']}
            for f in data['testResults'] for a in f['assertionResults'] if a['status'] == 'failed']
for f in failures:
    f['firstError'] = first_error(f['file'], f['name'])
dist = sorted(f'{p}/{d}/dist' for p in ['apps', 'packages'] for d in os.listdir(os.path.join(tree, p)) if os.path.isdir(os.path.join(tree, p, d, 'dist')))
record = {'commit': git('rev-parse', 'HEAD').strip(), 'distDirs': dist, 'command': ' '.join(args[:3]),
          'exit': r.returncode, 'files': len(data['testResults']), 'total': data['numTotalTests'], 'passed': data['numPassedTests'],
          'failed': data['numFailedTests'], 'skipped': data['numPendingTests'] + data.get('numTodoTests', 0), 'failures': failures,
          'load1': round(load, 1), 'wallSeconds': round(time.time() - started, 1), 'cleanAfter': git('status', '--porcelain') == '',
          'perFile': {f['name'].replace(tree.rstrip('/') + '/', ''): len(f['assertionResults']) for f in sorted(data['testResults'], key=lambda f: f['name'])}}
shutil.rmtree(tmpdir, ignore_errors=True)
json.dump(record, open(out_file, 'w'), indent=1)
print({k: v for k, v in record.items() if k not in ('failures', 'perFile')})
for f in failures:
    print(' FAIL', f['file'], '>', f['name'], '|', f['firstError'])
