#!/usr/bin/env python3
"""rev-542 mutant runner (rule 6), written for this review; it does not reuse the lane's tools.

Usage: python3 -I mut542.py <tree> <specs.json> <files.json> <out.json> <tmpdir> [id ...]

specs.json: {"mutants": [{"id", "edits": [{"file", "old", "new"}]}]}; an id of CONTROL with no
edits runs the unmutated tree. files.json: a JSON list of vitest file filters.
For each mutant: the tree must be clean; each `old` must occur exactly once at HEAD; the edit is
applied, `npx vitest run <files> --reporter=json` runs with TMPDIR=<tmpdir> (created, then
removed), the original bytes are restored and `git status --porcelain` must be empty again.
killed  = exit != 0 and at least one failed test or failed file;
survived = exit == 0 and 0 failed tests and 0 failed files; anything else is error.
Each failed row keeps its file, full title, first 300 chars of message, and a timeout flag.
/proc/loadavg is recorded before and after each run.
"""
import json
import os
import shutil
import subprocess
import sys
import time

tree, specs_path, files_path, out_path, tmpdir = sys.argv[1:6]
only = sys.argv[6:]
specs = json.load(open(specs_path))['mutants']
files = json.load(open(files_path))


def git(*args):
    return subprocess.run(['git', '-C', tree, *args], capture_output=True, text=True, check=True).stdout


def load():
    return open('/proc/loadavg').read().split()[0]


head = git('rev-parse', 'HEAD').strip()
results = []
for spec in specs:
    if only and spec['id'] not in only:
        continue
    assert git('status', '--porcelain') == '', 'tree not clean before ' + spec['id']
    originals = {}
    rec = {'id': spec['id'], 'commit': head, 'edits': spec['edits'], 'files': files}
    try:
        for edit in spec['edits']:
            path = os.path.join(tree, edit['file'])
            text = open(path, encoding='utf8').read()
            n = text.count(edit['old'])
            if n != 1:
                raise RuntimeError(f"old occurs {n} times in {edit['file']}")
            originals.setdefault(path, open(path, 'rb').read())
            with open(path, 'w', encoding='utf8') as fh:
                fh.write(text.replace(edit['old'], edit['new'], 1))
        os.makedirs(tmpdir, exist_ok=False)
        report = os.path.join(tmpdir, 'report.json')
        rec['loadBefore'] = load()
        started = time.time()
        run = subprocess.run(['npx', 'vitest', 'run', *files, '--reporter=json', f'--outputFile={report}'],
                             cwd=tree, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmpdir},
                             timeout=3000)
        rec['seconds'] = round(time.time() - started, 1)
        rec['loadAfter'] = load()
        rec['exit'] = run.returncode
        try:
            rep = json.load(open(report))
        except Exception as exc:  # noqa: BLE001
            rep = None
            rec['reportError'] = f'{exc}: {run.stderr[-400:]}'
    except RuntimeError as error:
        rec['outcome'] = 'error'
        rec['why'] = str(error)
        results.append(rec)
        print(spec['id'], 'SPEC-ERROR', error, flush=True)
        continue
    finally:
        for path, data in originals.items():
            with open(path, 'wb') as fh:
                fh.write(data)
        shutil.rmtree(tmpdir, ignore_errors=True)
    failed_rows, failed_files = [], 0
    if rep is not None:
        for r in rep['testResults']:
            name = os.path.relpath(r['name'], tree)
            for a in r['assertionResults']:
                if a['status'] == 'failed':
                    msg = ' '.join(a.get('failureMessages') or [])
                    failed_rows.append({'file': name, 'title': a['fullName'], 'timedOut': 'timed out' in msg,
                                        'message': msg[:300]})
            if r['status'] == 'failed':
                failed_files += 1
                if not r['assertionResults']:
                    failed_rows.append({'file': name, 'title': '(file failed)', 'timedOut': False,
                                        'message': (r.get('message') or '')[:300]})
        rec.update(totalTests=rep['numTotalTests'], passedTests=rep['numPassedTests'],
                   failedTests=rep['numFailedTests'], pendingTests=rep['numPendingTests'],
                   todoTests=rep.get('numTodoTests'), testFiles=len(rep['testResults']))
    rec['failedFiles'] = failed_files
    rec['failed'] = failed_rows
    if rec['exit'] != 0 and (rec.get('failedTests') or 0) + failed_files > 0:
        rec['outcome'] = 'killed'
    elif rec['exit'] == 0 and rec.get('failedTests') == 0 and failed_files == 0:
        rec['outcome'] = 'survived'
    else:
        rec['outcome'] = 'error'
    rec['cleanAfter'] = git('status', '--porcelain') == ''
    results.append(rec)
    print(f"{spec['id']}: {rec['outcome']} exit={rec['exit']} failed={rec.get('failedTests')}/{rec.get('totalTests')} "
          f"passed={rec.get('passedTests')} skipped={rec.get('pendingTests')} files={rec.get('testFiles')} "
          f"failedFiles={failed_files} {rec['seconds']}s load={rec['loadBefore']}->{rec['loadAfter']} "
          f"clean={rec['cleanAfter']}", flush=True)
    for r in failed_rows:
        print('    ', ('[timeout] ' if r['timedOut'] else '') + r['file'] + ' > ' + r['title'][:200], flush=True)
    assert rec['cleanAfter'], 'tree dirty after ' + spec['id']
    json.dump({'tree': tree, 'commit': head, 'results': results}, open(out_path, 'w'), indent=1,
              ensure_ascii=True)

json.dump({'tree': tree, 'commit': head, 'results': results}, open(out_path, 'w'), indent=1, ensure_ascii=True)
print('killed', sum(r['outcome'] == 'killed' for r in results), 'survived',
      sum(r['outcome'] == 'survived' for r in results), 'error', sum(r['outcome'] == 'error' for r in results),
      'of', len(results), flush=True)
