"""rev-524 mutant runner (independent of the lane's run_record.py).

Usage: python3 -I mut.py <tree> <specs.json> <out.json> <tmpdir> [id ...]

specs.json: {"mutants": [{"id", "edits": [{"file", "old", "new"} | {"file", "create"}], "projects": [...], "files": [...]}]}
Each `old` must occur exactly once in its file. The tree must be clean before and after each mutant. The vitest run uses a private
TMPDIR, which is removed afterwards. Outcome: killed when the exit is nonzero AND at least one FAIL line names a test (a failing run
with no failing test row is reported as 'error', not as killed); survives when exit is 0.
"""
import json, os, re, shutil, subprocess, sys, time

tree, specs_file, out_file, tmpdir = sys.argv[1:5]
only = set(sys.argv[5:])
specs = json.load(open(specs_file))['mutants']


def git(*args):
    return subprocess.run(['git', *args], cwd=tree, capture_output=True, check=True).stdout


assert git('status', '--porcelain') == b'', 'tree not clean before'
head = git('rev-parse', 'HEAD').decode().strip()
results = []
for spec in specs:
    if only and spec['id'] not in only:
        continue
    originals, created, counts = {}, [], []
    os.makedirs(tmpdir, exist_ok=True)
    try:
        for edit in spec['edits']:
            path = os.path.join(tree, edit['file'])
            if 'create' in edit:
                assert not os.path.exists(path), (spec['id'], edit['file'])
                with open(path, 'w') as fh:
                    fh.write(edit['create'])
                created.append(path)
                counts.append({'file': edit['file'], 'create': True})
                continue
            if not os.path.exists(path):
                counts.append({'file': edit['file'], 'missing': True})
                raise RuntimeError(f"{spec['id']}: {edit['file']} does not exist in this tree")
            text = open(path).read()
            n = text.count(edit['old'])
            counts.append({'file': edit['file'], 'oldCount': n})
            if n != 1:
                raise RuntimeError(f"{spec['id']}: old occurs {n} times in {edit['file']}")
            originals.setdefault(path, open(path, 'rb').read())
            with open(path, 'w') as fh:
                fh.write(text.replace(edit['old'], edit['new']))
        cmd = ['npx', 'vitest', 'run']
        for project in spec['projects']:
            cmd += ['--project', project]
        cmd += spec['files']
        env = {**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}
        started = time.time()
        run = subprocess.run(cmd, cwd=tree, capture_output=True, text=True, env=env, timeout=900)
        elapsed = round(time.time() - started, 1)
    except RuntimeError as error:
        results.append({'id': spec['id'], 'error': str(error), 'counts': counts})
        print(spec['id'], 'SPEC-ERROR', error, flush=True)
        continue
    finally:
        for path, data in originals.items():
            with open(path, 'wb') as fh:
                fh.write(data)
        for path in created:
            os.remove(path)
        shutil.rmtree(tmpdir, ignore_errors=True)
    plain = re.sub(r'\x1b\[[0-9;]*m', '', run.stdout + run.stderr)
    tests = [line.strip() for line in plain.split('\n') if re.match(r'\s*Tests\s', line)]
    files_line = [line.strip() for line in plain.split('\n') if re.match(r'\s*Test Files\s', line)]
    failed = sorted({line.strip() for line in plain.split('\n') if re.match(r'\s*FAIL\s', line) and ' > ' in line})
    timeouts = len(re.findall(r'Test timed out', plain))
    if run.returncode == 0:
        outcome = 'survives'
    elif failed:
        outcome = 'killed'
    else:
        outcome = 'error'
    clean = git('status', '--porcelain') == b''
    results.append({'id': spec['id'], 'outcome': outcome, 'exit': run.returncode, 'tests': tests, 'testFiles': files_line,
                    'failed': failed, 'timeouts': timeouts, 'seconds': elapsed, 'counts': counts, 'cleanAfter': clean,
                    'edits': spec['edits']})
    print(spec['id'], outcome, run.returncode, tests, elapsed, 'clean' if clean else 'DIRTY', flush=True)
    for line in failed:
        print('   ', line[:260], flush=True)
    assert clean, 'tree dirty after ' + spec['id']

json.dump({'tree': tree, 'head': head, 'results': results}, open(out_file, 'w'), indent=1, ensure_ascii=False)
print('wrote', out_file, len(results))
