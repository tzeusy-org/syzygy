"""syzygy-bpyt.7.15: re-run each test file that failed in suite_run.py's full run, alone, in a tree, and record the totals.
A failure that passes alone, at base and at head, under lower load, reads as a load timeout [Inferred], not a regression.
Usage: python3 -I rerun_alone.py <tree> <tmpdir> <out.json> <project> <file>...
"""
import json, os, shutil, subprocess, sys

tree, tmpdir, out_file, project, *files = sys.argv[1:]
git = lambda *a: subprocess.run(['git', '-C', tree, *a], capture_output=True, text=True, check=True).stdout
assert git('status', '--porcelain') == ''
rows = []
for file in files:
    os.makedirs(tmpdir, exist_ok=True)
    report = os.path.join(tmpdir, 'report.json')
    args = ['npx', 'vitest', 'run', '--project', project, file, '--reporter=json', f'--outputFile.json={report}']
    load = os.getloadavg()[0]
    r = subprocess.run(args, cwd=tree, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}, timeout=900)
    data = json.load(open(report))
    rows.append({'file': file, 'command': ' '.join(args[:6]), 'exit': r.returncode, 'total': data['numTotalTests'],
                 'passed': data['numPassedTests'], 'failed': data['numFailedTests'], 'load1': round(load, 1)})
    shutil.rmtree(tmpdir, ignore_errors=True)
record = {'commit': git('rev-parse', 'HEAD').strip(), 'project': project, 'rows': rows, 'cleanAfter': git('status', '--porcelain') == ''}
json.dump(record, open(out_file, 'w'), indent=1)
for row in rows:
    print(row)
