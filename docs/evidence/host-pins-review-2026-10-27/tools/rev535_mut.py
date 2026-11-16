#!/usr/bin/env python3
"""rev-535 mutant runner (rule 6), independent of the lane's tools.

Usage: python3 -I rev535_mut.py <tree> <specs.json> <out.json> <tmpdir> [id ...]

specs.json: {"files": [...], "mutants": [{"id", "edits": [{"file", "old", "new"}], "files"?: [...]}]}
Each edit's `old` must occur exactly once in its file at the tree's HEAD (asserted before writing).
An `id` of "CONTROL" with no edits runs the unmutated tree. The run is `npx vitest run <files>
--reporter=json` with a private TMPDIR (removed afterwards); the original bytes are restored and
`git status --porcelain` must be empty after each mutant.
Outcome: killed iff exit != 0 and >= 1 failed test or failed file; survived iff exit == 0 and 0 failed;
anything else is 'error'. Per failed test the record keeps its title and whether its failure message
says it timed out, so a kill by a load timeout can be told from a kill by an assertion.
"""
import json
import os
import shutil
import subprocess
import sys
import time

tree, specs_file, out_file, tmpdir = sys.argv[1:5]
only = set(sys.argv[5:])
doc = json.load(open(specs_file))


def git(*args):
    return subprocess.run(['git', '-C', tree, *args], capture_output=True, text=True, check=True).stdout


assert git('status', '--porcelain') == '', 'tree not clean before'
head = git('rev-parse', 'HEAD').strip()
results = []
for spec in doc['mutants']:
    if only and spec['id'] not in only:
        continue
    files = spec.get('files', doc['files'])
    originals, counts = {}, []
    os.makedirs(tmpdir, exist_ok=True)
    report = os.path.join(tmpdir, 'report.json')
    try:
        for edit in spec['edits']:
            path = os.path.join(tree, edit['file'])
            text = open(path).read()
            n = text.count(edit['old'])
            counts.append({'file': edit['file'], 'oldCount': n})
            if n != 1:
                raise RuntimeError(f"old occurs {n} times in {edit['file']}")
            originals.setdefault(path, open(path, 'rb').read())
            with open(path, 'w') as fh:
                fh.write(text.replace(edit['old'], edit['new'], 1))
        started = time.time()
        run = subprocess.run(['npx', 'vitest', 'run', *files, '--reporter=json', f'--outputFile={report}'], cwd=tree,
                             capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmpdir}, timeout=1800)
        seconds = round(time.time() - started, 1)
        rep = None
        try:
            rep = json.load(open(report))
        except Exception as exc:  # noqa: BLE001
            rep = {'error': f'{exc}: {run.stderr[-400:]}'}
    except RuntimeError as error:
        results.append({'id': spec['id'], 'outcome': 'error', 'why': str(error), 'counts': counts, 'commit': head})
        print(spec['id'], 'SPEC-ERROR', error, flush=True)
        continue
    finally:
        for path, data in originals.items():
            with open(path, 'wb') as fh:
                fh.write(data)
        shutil.rmtree(tmpdir, ignore_errors=True)
    failed_rows, failed_files = [], 0
    if 'testResults' in rep:
        for r in rep['testResults']:
            name = os.path.relpath(r['name'], tree)
            for a in r['assertionResults']:
                if a['status'] == 'failed':
                    msg = ' '.join(a.get('failureMessages') or [])
                    failed_rows.append({'title': name + ' > ' + a['fullName'], 'timedOut': 'timed out' in msg,
                                        'message': msg[:300]})
            if r['status'] == 'failed':
                failed_files += 1
                if not r['assertionResults']:
                    failed_rows.append({'title': name + ' > (file failed)', 'timedOut': False, 'message': (r.get('message') or '')[:300]})
        failed, total = rep['numFailedTests'], rep['numTotalTests']
    else:
        failed, total = None, None
    if run.returncode != 0 and ((failed or 0) > 0 or failed_files > 0):
        outcome = 'killed'
    elif run.returncode == 0 and failed == 0:
        outcome = 'survived'
    else:
        outcome = 'error'
    clean = git('status', '--porcelain') == ''
    results.append({'id': spec['id'], 'commit': head, 'edits': spec['edits'], 'counts': counts, 'files': files,
                    'exit': run.returncode, 'failedTests': failed, 'failedFiles': failed_files, 'totalTests': total,
                    'outcome': outcome, 'seconds': seconds, 'cleanAfter': clean, 'failed': failed_rows,
                    'reportError': rep.get('error')})
    print(f"{spec['id']}: {outcome} exit={run.returncode} failed={failed}/{total} files={failed_files} "
          f"timeouts={sum(r['timedOut'] for r in failed_rows)} {seconds}s clean={clean}", flush=True)
    for r in failed_rows:
        print('    ', ('[timeout] ' if r['timedOut'] else '') + r['title'][:240], flush=True)
    assert clean, 'tree dirty after ' + spec['id']

json.dump({'tree': tree, 'commit': head, 'results': results}, open(out_file, 'w'), indent=1, ensure_ascii=False)
print('killed', sum(r['outcome'] == 'killed' for r in results), 'survived', sum(r['outcome'] == 'survived' for r in results),
      'error', sum(r['outcome'] == 'error' for r in results), 'of', len(results), flush=True)
