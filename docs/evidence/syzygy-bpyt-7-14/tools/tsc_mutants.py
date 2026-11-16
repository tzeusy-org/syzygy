#!/usr/bin/env python3
"""Run type-level mutants under `npm run typecheck` (rule 6), for syzygy-bpyt.7.14.

Usage: python3 -I tsc_mutants.py <tree> <tsc-specs.json> <out.json> <tmpdir> [id ...]

Each edit's `old` must occur exactly once in its file. The tree must be clean before
and after each mutant. An unmutated control run comes first and last; both must exit 0.
Outcome: killed when the exit is nonzero and at least one `error TS` line is printed;
survived when the exit is 0; anything else is 'error'. The typecheck is `tsc -b`, which
writes only the ignored dist/ outputs, and the closing control rebuilds them from the
restored sources.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import time

tree, specs_file, out_file, tmpdir = sys.argv[1:5]
only = set(sys.argv[5:])
specs = json.load(open(specs_file))['mutants']


def git(*args):
    return subprocess.run(['git', *args], cwd=tree, capture_output=True, check=True).stdout


def typecheck():
    os.makedirs(tmpdir, exist_ok=True)
    started = time.time()
    run = subprocess.run(['npm', 'run', 'typecheck'], cwd=tree, capture_output=True, text=True,
                         env={**os.environ, 'TMPDIR': tmpdir}, timeout=1800)
    shutil.rmtree(tmpdir, ignore_errors=True)
    errors = sorted({line.strip() for line in (run.stdout + run.stderr).split('\n') if re.search(r'error TS\d+', line)})
    return run.returncode, errors, round(time.time() - started, 1)


assert git('status', '--porcelain') == b'', 'tree not clean before'
head = git('rev-parse', 'HEAD').decode().strip()
controls = []
exit_code, errors, seconds = typecheck()
controls.append({'when': 'before', 'exit': exit_code, 'errors': errors, 'seconds': seconds})
assert exit_code == 0, ('control typecheck failed before the mutants', errors)
results = []
for spec in specs:
    if only and spec['id'] not in only:
        continue
    originals, counts = {}, []
    try:
        for edit in spec['edits']:
            path = os.path.join(tree, edit['file'])
            text = open(path).read()
            n = text.count(edit['old'])
            counts.append({'file': edit['file'], 'oldCount': n})
            if n != 1:
                raise RuntimeError(f"{spec['id']}: old occurs {n} times in {edit['file']}")
            originals.setdefault(path, open(path, 'rb').read())
            with open(path, 'w') as fh:
                fh.write(text.replace(edit['old'], edit['new']))
        exit_code, errors, seconds = typecheck()
    except RuntimeError as error:
        results.append({'id': spec['id'], 'outcome': 'error', 'why': str(error), 'counts': counts})
        print(spec['id'], 'SPEC-ERROR', error, flush=True)
        continue
    finally:
        for path, data in originals.items():
            with open(path, 'wb') as fh:
                fh.write(data)
    outcome = 'killed' if exit_code != 0 and errors else 'survived' if exit_code == 0 else 'error'
    clean = git('status', '--porcelain') == b''
    results.append({'id': spec['id'], 'outcome': outcome, 'exit': exit_code, 'errors': errors, 'seconds': seconds,
                    'counts': counts, 'cleanAfter': clean, 'edits': spec['edits'], 'commit': head})
    print(spec['id'], outcome, exit_code, len(errors), seconds, 'clean' if clean else 'DIRTY', flush=True)
    for line in errors:
        print('   ', line[:260], flush=True)
    assert clean, 'tree dirty after ' + spec['id']
exit_code, errors, seconds = typecheck()
controls.append({'when': 'after', 'exit': exit_code, 'errors': errors, 'seconds': seconds})
json.dump({'tree': tree, 'head': head, 'controls': controls, 'results': results}, open(out_file, 'w'), indent=1)
print('controls', [c['exit'] for c in controls], 'killed', sum(r['outcome'] == 'killed' for r in results),
      'survived', sum(r['outcome'] == 'survived' for r in results), 'error', sum(r['outcome'] == 'error' for r in results),
      'of', len(results), flush=True)
