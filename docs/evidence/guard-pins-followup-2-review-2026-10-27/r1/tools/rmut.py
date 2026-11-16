"""rev-541 mutant runner, written for this review (independent of mut.py and record.py).

Usage: python3 -I rmut.py <tree> <specs.json> <out.json> <tmpdir> [id ...]

specs.json: {"mutants": [{"id", "edits": [{"file", "old", "new"}], "projects": [...], "files": [...]}]}
An id of "BASELINE" with no edits runs the files unmutated. Each `old` must occur exactly once. The tree must be clean
(git status --porcelain empty) before and after each mutant. vitest runs with its JSON reporter, so the failing rows are read
from the report (fullName of each failed assertion), not from console lines. Outcome: killed when exit != 0 and the report
names >= 1 failed test; survives when exit == 0 and 0 failed; anything else is 'error'. /proc/loadavg is recorded before and
after each run.
"""
import json, os, shutil, subprocess, sys, time

tree, specs_file, out_file, tmpdir = sys.argv[1:5]
only = sys.argv[5:]
specs = {m['id']: m for m in json.load(open(specs_file))['mutants']}
order = only or list(specs)


def git(*args):
    return subprocess.run(['git', *args], cwd=tree, capture_output=True, check=True, text=True).stdout


def load():
    return open('/proc/loadavg').read().split()[:3]


assert git('status', '--porcelain') == '', 'tree not clean before'
head = git('rev-parse', 'HEAD').strip()
results = []
for mid in order:
    spec = specs[mid]
    originals, counts = {}, []
    os.makedirs(tmpdir, exist_ok=True)
    report = os.path.join(tmpdir, 'report.json')
    try:
        for edit in spec['edits']:
            path = os.path.join(tree, edit['file'])
            text = open(path, encoding='utf-8').read()
            n = text.count(edit['old'])
            counts.append(n)
            if n != 1:
                raise RuntimeError(f'{mid}: old occurs {n} times in {edit["file"]}')
            originals.setdefault(path, open(path, 'rb').read())
            open(path, 'w', encoding='utf-8').write(text.replace(edit['old'], edit['new']))
        cmd = ['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={report}']
        for project in spec['projects']:
            cmd += ['--project', project]
        cmd += spec['files']
        before = load()
        started = time.time()
        run = subprocess.run(cmd, cwd=tree, capture_output=True, text=True, timeout=900,
                             env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'})
        seconds = round(time.time() - started, 1)
        after = load()
        data = json.load(open(report))
    except RuntimeError as error:
        results.append({'id': mid, 'error': str(error), 'counts': counts})
        print(mid, 'SPEC-ERROR', error, flush=True)
        continue
    finally:
        for path, data_bytes in originals.items():
            open(path, 'wb').write(data_bytes)
        clean = git('status', '--porcelain') == ''
    failed = sorted(a['fullName'] for f in data['testResults'] for a in f['assertionResults'] if a['status'] == 'failed')
    passed = sum(1 for f in data['testResults'] for a in f['assertionResults'] if a['status'] == 'passed')
    timeouts = sum(1 for f in data['testResults'] for a in f['assertionResults']
                   for m in a.get('failureMessages', []) if 'timed out' in m)
    if run.returncode == 0 and not failed:
        outcome = 'survives'
    elif run.returncode != 0 and failed:
        outcome = 'killed'
    else:
        outcome = 'error'
    shutil.rmtree(tmpdir, ignore_errors=True)
    row = {'id': mid, 'outcome': outcome, 'exit': run.returncode, 'total': data['numTotalTests'], 'passed': passed,
           'failed': failed, 'timeouts': timeouts, 'files': data['numTotalTestSuites'], 'seconds': seconds,
           'loadBefore': before, 'loadAfter': after, 'oldCounts': counts, 'cleanAfter': clean, 'edits': spec['edits']}
    results.append(row)
    print(mid, outcome, run.returncode, f'{passed}/{data["numTotalTests"]}', f'failed={len(failed)}', seconds, before[0],
          'clean' if clean else 'DIRTY', flush=True)
    for line in failed:
        print('   ', line[:240], flush=True)
    assert clean, 'tree dirty after ' + mid

json.dump({'tree': tree, 'head': head, 'results': results}, open(out_file, 'w'), indent=1, ensure_ascii=False)
print('wrote', out_file, len(results))
