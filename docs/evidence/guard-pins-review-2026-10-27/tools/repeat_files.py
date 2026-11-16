"""rev-531: n runs of the given test files (or of whole projects when none given) in one tree, recording exit, Tests line,
FAIL rows, the count of 'Test timed out' messages and load1. Usage: python3 -I repeat_files.py <tree> <n> <out.json> <tmpdir> [file ...]"""
import json, os, re, shutil, subprocess, sys, time
tree, n, out, tmp, files = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5:]
P = ['--project', '@syzygy/polaris-generation-core', '--project', '@syzygy/polaris-dossier']
head = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
runs = []
for i in range(n):
    os.makedirs(tmp, exist_ok=True); load1 = os.getloadavg()[0]; t = time.time()
    r = subprocess.run(['npx', 'vitest', 'run', *P, *files], cwd=tree, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmp, 'CI': '1'}, timeout=1800)
    shutil.rmtree(tmp, ignore_errors=True)
    plain = re.sub(r'\x1b\[[0-9;]*m', '', r.stdout + r.stderr)
    row = {'i': i + 1, 'exit': r.returncode, 'load1': round(load1, 2), 'seconds': round(time.time() - t, 1),
           'tests': [l.strip() for l in plain.split('\n') if re.match(r'\s*Tests\s', l)],
           'failed': sorted({l.strip()[:200] for l in plain.split('\n') if re.match(r'\s*FAIL\s', l) and ' > ' in l}),
           'timedOut': len(re.findall(r'Test timed out in \d+ms', plain))}
    runs.append(row); print(json.dumps(row), flush=True)
clean = subprocess.run(['git', '-C', tree, 'status', '--porcelain'], capture_output=True, text=True).stdout == ''
json.dump({'tree': tree, 'head': head, 'files': files, 'cleanAfter': clean, 'runs': runs}, open(out, 'w'), indent=1)
print('wrote', out, 'clean', clean)
