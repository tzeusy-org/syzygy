"""rev-528: run one test file N times in one tree, keeping each run's Tests line, failed rows and, for a failing run, the lines of
vitest's output that name the error (timeouts, assertion messages). Private TMPDIR per run, removed afterwards.

Usage: python3 -I run_file.py <tree> <project[,project...]> <file | -> <n> <tmpdir> <out.json>
"""
import json, os, re, shutil, subprocess, sys, time

tree, project, file, n, tmpdir, out = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5], sys.argv[6]
head = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
runs = []
for i in range(n):
    os.makedirs(tmpdir, exist_ok=True)
    load1 = os.getloadavg()[0]
    started = time.time()
    run = subprocess.run(['npx', 'vitest', 'run', *[a for p in project.split(',') for a in ('--project', p)], *([] if file == '-' else [file])], cwd=tree, capture_output=True, text=True,
                         env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}, timeout=1800)
    shutil.rmtree(tmpdir, ignore_errors=True)
    plain = re.sub(r'\x1b\[[0-9;]*m', '', run.stdout + run.stderr)
    tests = [line.strip() for line in plain.split('\n') if re.match(r'\s*Tests\s', line)]
    failed = sorted({line.strip() for line in plain.split('\n') if re.match(r'\s*FAIL\s', line)})
    errors = [line.strip() for line in plain.split('\n') if re.search(r'Error|timed out|expected|AssertionError', line)][:20]
    runs.append({'run': i + 1, 'exit': run.returncode, 'tests': tests, 'failed': failed, 'errors': errors if run.returncode else [],
                 'seconds': round(time.time() - started, 1), 'load1': round(load1, 1)})
    print(i + 1, run.returncode, tests, runs[-1]['seconds'], round(load1, 1), flush=True)
    for line in runs[-1]['errors']:
        print('   ', line[:240], flush=True)
json.dump({'tree': tree, 'head': head, 'file': file, 'runs': runs}, open(out, 'w'), indent=1)
print('wrote', out, len(runs))
