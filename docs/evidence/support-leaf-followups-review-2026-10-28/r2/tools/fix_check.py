"""N2's proposed reader row (tools/fix-n2-object-rest-row.ts.txt), checked at the head: inserted before the write reader's negative
case, then run unmutated and under the object-rest mutants, by 6.14's steps. Usage: fix_check.py <clone> <out.json> <tmpdir>"""
import importlib.util, json, os, subprocess, sys

clone, out, tmpdir = sys.argv[1:4]
os.makedirs(tmpdir, exist_ok=True)
spec = importlib.util.spec_from_file_location('lane614', os.path.join(clone, 'docs/evidence/syzygy-bpyt-6-14/tools/mutants.py'))
lane = importlib.util.module_from_spec(spec); spec.loader.exec_module(lane)
edit = lambda path, old, new: {'path': path, 'old': old, 'new': new}
PURITY = 'packages/support/src/support-purity.test.ts'
SHA = 'packages/support/src/sha256.ts'
FIX = open(os.path.join(os.path.dirname(__file__), 'fix-n2-object-rest-row.ts.txt'), encoding='utf8').read()
NEG = "    ['let a = 1; a += 1; [a] = [2];', []],\n"
FIXED = edit(PURITY, NEG, FIX + NEG)
ARM = edit(PURITY, ' : ts.isSpreadAssignment(property) ? targets(property.expression) : []', ' : []')
WRITE = edit(SHA, "import { createHash } from 'node:crypto';\n", "import { createHash } from 'node:crypto';\n\n({ ...Object.freeze } = {});\n")
ROWS = [('FX0-unmutated', [FIXED]), ('FX-M5-object-rest-arm-dropped', [FIXED, ARM]), ('FX-M5b-arm-dropped-plus-write', [FIXED, ARM, WRITE]),
        ('FX-M5c-write-control', [FIXED, WRITE])]
git = lambda *a: subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True).stdout
assert git('status', '--porcelain') == ''
rows = []
for rid, edits in ROWS:
    load1 = open('/proc/loadavg').read().split()[0]
    undo = lane.apply(clone, edits)
    try: r = lane.run(clone, PURITY, tmpdir)
    finally: lane.restore(undo)
    failing = sorted(t['name'] for t in r.get('failedTests', []))
    rows.append({'id': rid, 'edits': edits, 'load1': load1, 'failing': failing, 'messages': [t['message'].splitlines()[0][:200] for t in r.get('failedTests', [])],
                 **{k: r.get(k) for k in ('exit', 'passed', 'failed', 'total', 'fileMessages', 'error')}})
    print(rid, r.get('exit'), r.get('passed'), r.get('failed'), failing, rows[-1]['messages'], flush=True)
json.dump({'commit': git('rev-parse', 'HEAD').strip(), 'dists': lane.dist_dirs(clone), 'rows': rows, 'statusAfter': git('status', '--porcelain')}, open(out, 'w'), indent=1)
print('status after', repr(git('status', '--porcelain')))
