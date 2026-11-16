"""rev-531 repeated runs. Usage: python3 -I repeat.py <tree> <n> <out.json> <tmpdir>
n runs of the four guard files, then n runs of the whole @syzygy/polaris-generation-core and @syzygy/polaris-dossier projects,
each with a private TMPDIR (removed afterwards). Records exit, the Tests and Test Files lines, FAIL rows and load1."""
import json, os, re, shutil, subprocess, sys, time
tree, n, out, tmp = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
P = ['--project', '@syzygy/polaris-generation-core', '--project', '@syzygy/polaris-dossier']
FILES = ['packages/polaris-generation-core/src/workspace-reach.test.ts', 'packages/polaris-generation-core/src/island-boundary.test.ts',
         'packages/polaris-dossier/src/subpath-imports.test.ts', 'packages/polaris-dossier/src/argv.test.ts']
head = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
runs = []
for kind, args in (('guards', P + FILES), ('projects', P)):
    for i in range(n):
        os.makedirs(tmp, exist_ok=True)
        load1 = os.getloadavg()[0]; t = time.time()
        r = subprocess.run(['npx', 'vitest', 'run', *args], cwd=tree, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmp, 'CI': '1'}, timeout=1800)
        shutil.rmtree(tmp, ignore_errors=True)
        plain = re.sub(r'\x1b\[[0-9;]*m', '', r.stdout + r.stderr)
        row = {'kind': kind, 'i': i + 1, 'exit': r.returncode, 'load1': round(load1, 2), 'seconds': round(time.time() - t, 1),
               'tests': [l.strip() for l in plain.split('\n') if re.match(r'\s*Tests\s', l)],
               'testFiles': [l.strip() for l in plain.split('\n') if re.match(r'\s*Test Files\s', l)],
               'failed': sorted({l.strip()[:300] for l in plain.split('\n') if re.match(r'\s*(FAIL|×)\s', l)})}
        runs.append(row); print(json.dumps(row), flush=True)
clean = subprocess.run(['git', '-C', tree, 'status', '--porcelain'], capture_output=True, text=True).stdout == ''
json.dump({'tree': tree, 'head': head, 'cleanAfter': clean, 'runs': runs}, open(out, 'w'), indent=1)
print('wrote', out, 'clean', clean)
