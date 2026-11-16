"""rev-541b mutant runner, written for this round (independent of mut.py, record.py and round 1's rmut.py).

For each mutant: assert a clean tree, apply each edit (its `old` must occur exactly once in the file), run vitest once over the
mutant's files with a JSON reporter, read the failing rows from the report's assertionResults, restore the files with
`git checkout`, and assert a clean tree again. A mutant with id BASELINE has no edits.
Usage: python3 -I mrun.py <clone> <out.json> <tmpdir> <specs.json> [<id> ...]   (ids default to every mutant in the specs)
"""
import json, os, subprocess, sys, time

clone, out, tmp, specs_path, *ids = sys.argv[1:]
specs = json.load(open(specs_path))
mutants = [{'id': 'BASELINE', 'edits': [], 'files': specs['mutants'][0]['files'], 'projects': specs['mutants'][0]['projects']}]
mutants += [m for m in specs['mutants'] if not ids or m['id'] in ids]
if ids:
    missing = set(ids) - {m['id'] for m in mutants}
    assert not missing, missing


def git(*args):
    return subprocess.run(['git', *args], cwd=clone, capture_output=True, text=True, check=True).stdout


head = git('rev-parse', 'HEAD').strip()
results = []
for m in mutants:
    assert git('status', '--porcelain', '--untracked-files=no') == '', 'tree not clean before ' + m['id']
    counts = []
    for e in m['edits']:
        path = os.path.join(clone, e['file'])
        text = open(path, encoding='utf8').read()
        counts.append(text.count(e['old']))
        if counts[-1] == 1:
            open(path, 'w', encoding='utf8').write(text.replace(e['old'], e['new']))
    report = os.path.join(tmp, 'report.json')
    if os.path.exists(report):
        os.remove(report)
    load = open('/proc/loadavg').read().split()[0]
    t0 = time.time()
    args = ['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={report}']
    for p in m['projects']:
        args += ['--project', p]
    run = subprocess.run(args + m['files'], cwd=clone, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmp}, timeout=900)
    secs = round(time.time() - t0, 1)
    failing, timeouts, total, passed = [], 0, None, None
    if os.path.exists(report):
        rep = json.load(open(report))
        total, passed = rep['numTotalTests'], rep['numPassedTests']
        for f in rep['testResults']:
            for a in f['assertionResults']:
                if a['status'] == 'failed':
                    failing.append(a['fullName'])
                    timeouts += any('timed out' in msg for msg in a.get('failureMessages', []))
        files_failed = [os.path.relpath(f['name'], clone) for f in rep['testResults'] if f['status'] == 'failed' and not f['assertionResults']]
    else:
        files_failed = ['<no report>']
    for e in m['edits']:
        git('checkout', '--', e['file'])
    assert git('status', '--porcelain', '--untracked-files=no') == '', 'tree not clean after ' + m['id']
    outcome = 'error' if total is None or files_failed or any(c != 1 for c in counts) else ('killed' if failing else 'survives')
    results.append({'id': m['id'], 'oldCounts': counts, 'exit': run.returncode, 'outcome': outcome, 'tests': total, 'passed': passed,
                    'failing': sorted(failing), 'timeouts': timeouts, 'filesFailedWithoutRows': files_failed, 'load1': load, 'seconds': secs,
                    'edits': m['edits']})
    print(m['id'], outcome, f'{passed}/{total}', 'failing', len(failing), 'load1', load, f'{secs}s', flush=True)
    for name in sorted(failing):
        print('   FAIL', name, flush=True)
json.dump({'head': head, 'specs': os.path.basename(specs_path), 'results': results}, open(out, 'w'), indent=1)
open(out, 'a').write('\n')
