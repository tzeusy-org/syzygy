"""R-GP-IMPL-HOST-TIDY-1 reviewer tool: run the canonical battery (PROJECT-STATUS.md, the first fenced block under
"How to verify this page") in a tree, one command per line, and record each exit code.
Usage: python3 -I battery.py <tree> <tmpdir> <out.json>"""
import json, os, re, subprocess, sys, time

tree, tmpdir, out = sys.argv[1:4]
text = open(os.path.join(tree, 'PROJECT-STATUS.md'), encoding='utf8').read()
section = text[text.index('## How to verify this page'):]
block = re.search(r'^```(?:bash|sh)?\n(.*?)^```$', section, re.M | re.S).group(1)
env = {**os.environ, 'TMPDIR': tmpdir}
os.makedirs(tmpdir, exist_ok=True)
rows, t0 = [], time.time()
for line in block.split('\n'):
    s = line.strip()
    if not s or s.startswith('#'):
        continue
    m = re.match(r'^([A-Z_][A-Z0-9_]*)=(\S+)\s*(#.*)?$', s)
    if m:
        env[m.group(1)] = subprocess.run(['bash', '-c', f'echo {m.group(2)}'], capture_output=True, text=True, env=env, cwd=tree).stdout.strip()
        continue
    r = subprocess.run(['bash', '-c', s], cwd=tree, capture_output=True, text=True, env=env, timeout=1800)
    rows.append({'command': s[:200], 'exit': r.returncode, 'tail': (r.stdout + r.stderr).strip().splitlines()[-1:] if r.returncode else []})
git = lambda *a: subprocess.run(['git', '-C', tree, *a], capture_output=True, text=True).stdout
rec = {'commit': git('rev-parse', 'HEAD').strip(), 'commands': len(rows), 'nonzero': sum(r['exit'] != 0 for r in rows),
       'seconds': round(time.time() - t0, 1), 'cleanAfter': git('status', '--porcelain') == '', 'rows': rows}
json.dump(rec, open(out, 'w'), indent=1)
print(f"commit={rec['commit'][:8]} commands={rec['commands']} nonzero={rec['nonzero']} seconds={rec['seconds']} cleanAfter={rec['cleanAfter']}")
for r in rows:
    if r['exit']:
        print(' NONZERO', r['exit'], r['command'], r['tail'])
