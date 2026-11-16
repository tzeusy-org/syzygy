"""syzygy-bpyt.6.15: run the gate's two test files with every workspace `dist` removed, so the drift guard's walk and the gate are
shown to read source (the root Vitest aliases), never a stale build. Deletes `apps/*/dist` and `packages/*/dist` in <tree>, which
must be a scratch clone.
Usage: python3 -I dist_absent.py <tree> <tmpdir> <out.json>
"""
import glob, json, os, shutil, subprocess, sys

tree, tmpdir, out_file = sys.argv[1:4]
FILES = ['apps/three-surface-poc/src/git-observation.test.ts', 'apps/three-surface-poc/src/main.test.ts']
git = lambda *a: subprocess.run(['git', '-C', tree, *a], capture_output=True, text=True, check=True).stdout
assert git('status', '--porcelain') == ''
for top in ('apps', 'packages'):
    for dist in glob.glob(os.path.join(tree, top, '*', 'dist')):
        shutil.rmtree(dist)
dists = [os.path.relpath(p, tree) for top in ('apps', 'packages') for p in glob.glob(os.path.join(tree, top, '*', 'dist'))]
os.makedirs(tmpdir, exist_ok=True)
report = os.path.join(tmpdir, 'report.json')
args = ['npx', 'vitest', 'run', *FILES, '--reporter=json', f'--outputFile.json={report}']
r = subprocess.run(args, cwd=tree, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}, timeout=900)
data = json.load(open(report))
record = {'commit': git('rev-parse', 'HEAD').strip(), 'command': ' '.join(args[:3 + len(FILES)]), 'distAfterRemoval': dists, 'exit': r.returncode,
          'total': data['numTotalTests'], 'passed': data['numPassedTests'], 'failed': data['numFailedTests'],
          'titles': sorted(a['fullName'] for f in data['testResults'] for a in f['assertionResults'] if a['status'] == 'passed'),
          'cleanAfter': git('status', '--porcelain') == ''}
shutil.rmtree(tmpdir, ignore_errors=True)
json.dump(record, open(out_file, 'w'), indent=1)
print({k: v for k, v in record.items() if k != 'titles'})
