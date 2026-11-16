#!/usr/bin/env python3
"""Usage: fix_all_check.py <clone> <out.json> <tmpdir>: apply every fix this review proposes at once (F3's file, F4's row, N1's
write rows, import() reader, row and reader rows), then run `tsc -b` on the two touched packages and vitest on the three touched
files; restore and confirm the clone is clean."""
import importlib.util, json, os, subprocess, sys
clone, out, tmpdir = sys.argv[1:4]
spec = importlib.util.spec_from_file_location('rm', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rev_mutants.py'))
rm = importlib.util.module_from_spec(spec); sys.argv = [sys.argv[0], clone]; spec.loader.exec_module(rm)
edits = [rm.fix_f3(clone), rm.FIX_OBJECT_ROW, rm.FIX_W, *rm.fix_i(clone)]
originals = {}
for ed in edits:
    p = os.path.join(clone, ed['path']); text = open(p).read(); originals.setdefault(ed['path'], text)
    assert text.count(ed['old']) == 1, ed['path']; open(p, 'w').write(text.replace(ed['old'], ed['new']))
try:
    env = dict(os.environ, TMPDIR=tmpdir)
    tsc = subprocess.run(['npx', 'tsc', '-b', 'packages/support', 'packages/polaris-generation-core'], cwd=clone, env=env, capture_output=True, text=True)
    j = os.path.join(tmpdir, 'all.json')
    vt = subprocess.run(['npx', 'vitest', 'run', rm.PURITY, rm.REACH_TEST, rm.ALIASES_TEST, '--reporter=json', f'--outputFile={j}'], cwd=clone, env=env, capture_output=True, text=True)
    d = json.load(open(j))
finally:
    for path, text in originals.items(): open(os.path.join(clone, path), 'w').write(text)
status = subprocess.run(['git', '-C', clone, 'status', '--porcelain'], capture_output=True, text=True).stdout
res = {'tscExit': tsc.returncode, 'tscOut': (tsc.stdout + tsc.stderr)[-600:], 'vitestExit': vt.returncode, 'files': len(d['testResults']),
       'passed': d['numPassedTests'], 'failed': d['numFailedTests'], 'statusAfter': status,
       'fixSha256': {f: __import__('hashlib').sha256(open(os.path.join(rm.TOOLS, f), 'rb').read()).hexdigest() for f in sorted(os.listdir(rm.TOOLS)) if f.startswith('fix-')}}
json.dump(res, open(out, 'w'), indent=1); print(json.dumps(res, indent=1))
