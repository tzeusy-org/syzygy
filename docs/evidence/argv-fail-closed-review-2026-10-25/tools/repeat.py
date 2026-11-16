"""rev-528: run the four guard files, then both affected Vitest projects whole, N times each, recording each run's Tests line,
exit code, failed rows, wall time and load average. Private TMPDIR per run, removed afterwards; the tree must stay clean.

Usage: python3 -I repeat.py <tree> <n> <tmpdir> <out.json>
"""
import json, os, re, shutil, subprocess, sys, time

tree, n, tmpdir, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
PROJECTS = ['--project', '@syzygy/polaris-dossier', '--project', '@syzygy/polaris-generation-core']
GUARDS = ['packages/polaris-generation-core/src/workspace-reach.test.ts', 'packages/polaris-generation-core/src/island-boundary.test.ts',
          'packages/polaris-dossier/src/subpath-imports.test.ts', 'packages/polaris-dossier/src/argv.test.ts']
head = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
runs = []
for kind, files in (('guards', GUARDS), ('projects', [])):
    for i in range(n):
        os.makedirs(tmpdir, exist_ok=True)
        load1 = os.getloadavg()[0]
        started = time.time()
        run = subprocess.run(['npx', 'vitest', 'run', *PROJECTS, *files], cwd=tree, capture_output=True, text=True,
                             env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}, timeout=1800)
        seconds = round(time.time() - started, 1)
        shutil.rmtree(tmpdir, ignore_errors=True)
        plain = re.sub(r'\x1b\[[0-9;]*m', '', run.stdout + run.stderr)
        tests = [line.strip() for line in plain.split('\n') if re.match(r'\s*Tests\s', line)]
        files_line = [line.strip() for line in plain.split('\n') if re.match(r'\s*Test Files\s', line)]
        failed = sorted({line.strip() for line in plain.split('\n') if re.match(r'\s*FAIL\s', line)})
        clean = subprocess.run(['git', '-C', tree, 'status', '--porcelain'], capture_output=True, text=True).stdout == ''
        runs.append({'kind': kind, 'run': i + 1, 'exit': run.returncode, 'tests': tests, 'testFiles': files_line, 'failed': failed,
                     'seconds': seconds, 'load1': round(load1, 1), 'cleanAfter': clean})
        print(kind, i + 1, run.returncode, tests, files_line, seconds, round(load1, 1), 'clean' if clean else 'DIRTY', flush=True)
        for line in failed:
            print('   ', line[:240], flush=True)
json.dump({'tree': tree, 'head': head, 'runs': runs}, open(out, 'w'), indent=1)
print('wrote', out, len(runs))
