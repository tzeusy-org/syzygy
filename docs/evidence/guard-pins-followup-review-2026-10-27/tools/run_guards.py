"""rev-536: run the four guard files N times in one tree, independently of the lane's repeat.py.

Usage: python3 -I run_guards.py <tree> <runs> <tmpdir> <out.json>
Records, per run: exit code, the vitest `Tests` and `Test Files` lines, failing rows, timeouts, load1 before, seconds.
"""
import json, os, re, shutil, subprocess, sys, time

tree, runs, tmpdir, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
FILES = ['packages/polaris-generation-core/src/workspace-reach.test.ts', 'packages/polaris-generation-core/src/island-boundary.test.ts',
         'packages/polaris-dossier/src/subpath-imports.test.ts', 'packages/polaris-dossier/src/argv.test.ts']
cmd = ['npx', 'vitest', 'run', '--project', '@syzygy/polaris-generation-core', '--project', '@syzygy/polaris-dossier', *FILES]
head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()
results = []
for index in range(runs):
    os.makedirs(tmpdir, exist_ok=True)
    load1 = os.getloadavg()[0]
    started = time.time()
    run = subprocess.run(cmd, cwd=tree, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}, timeout=900)
    seconds = round(time.time() - started, 1)
    shutil.rmtree(tmpdir, ignore_errors=True)
    plain = re.sub(r'\x1b\[[0-9;]*m', '', run.stdout + run.stderr)
    tests = [line.strip() for line in plain.split('\n') if re.match(r'\s*Tests\s', line)]
    files = [line.strip() for line in plain.split('\n') if re.match(r'\s*Test Files\s', line)]
    failed = sorted({line.strip() for line in plain.split('\n') if re.match(r'\s*FAIL\s', line) and ' > ' in line})
    timeouts = len(re.findall(r'Test timed out', plain))
    results.append({'run': index + 1, 'exit': run.returncode, 'tests': tests, 'testFiles': files, 'failed': failed, 'timeouts': timeouts,
                    'load1': round(load1, 1), 'seconds': seconds})
    print(index + 1, run.returncode, tests, files, f'load1={load1:.1f}', seconds, flush=True)
clean = subprocess.run(['git', 'status', '--porcelain'], cwd=tree, capture_output=True, check=True).stdout == b''
json.dump({'tree': tree, 'head': head, 'cleanAfter': clean, 'results': results}, open(out, 'w'), indent=1)
print('wrote', out, 'clean' if clean else 'DIRTY')
