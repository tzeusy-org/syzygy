"""W6's reach: a product module whose name contains `test` and that is reachable by a sibling specifier, under the broadened
exclusion of r2_mutants.py's W6, at HEAD unmutated, and under this review's fixture fix (fix-check-r2's set B).

Usage: python3 -I w6_probe.py <clone with node_modules> <out.json> <tmpdir>

Rows: W6b-head (the module alone: the createHash row must fail), W6b (W6 plus the module: expected to pass every row, and to build
and export randomUUID), W6b-fixB (set B applied, then W6 plus the module: the fixture row must fail). Each runs
support-purity.test.ts; W6b also builds the package with `tsc -p` into <tmpdir> and loads the emitted index.js.
"""
import importlib.util
import json
import os
import shutil
import subprocess
import sys

clone, out_path, tmpdir = sys.argv[1:4]
here = os.path.dirname(os.path.abspath(__file__))
saved = sys.argv
spec = importlib.util.spec_from_file_location('fc', os.path.join(here, 'fix_check_r2.py'))
sys.argv = [saved[0], clone, os.devnull, tmpdir, os.path.join(here, '../../rev-545')]
fc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fc)
sys.argv = saved
r2, lane = fc.r2, fc.lane

MODULE = [r2.e('packages/support/src/latest.ts', None, "export * from 'node:crypto';\n"), r2.add_index("export * from './latest.js';\n")]
W6 = fc.mine['W6-test-exclusion-broadened-to-any-test-substring'][2]
ROWS = [('W6b-head', [], MODULE, 'killed', [r2.F1_ROW]), ('W6b', [], W6 + MODULE, 'survives', None),
        ('W6b-fixB', fc.B, W6 + MODULE, 'killed', [r2.N1_ROW])]


def main():
    os.makedirs(tmpdir, exist_ok=True)
    git = lambda *args: subprocess.run(['git', '-C', clone, *args], capture_output=True, text=True, check=True).stdout
    assert git('status', '--porcelain') == ''
    rows = []
    for rid, fix, edits, expected, want in ROWS:
        undo = lane.apply(clone, fix + edits)
        try:
            res = lane.run(clone, [r2.PURITY], tmpdir)
            build = None
            if rid == 'W6b':
                out = os.path.join(tmpdir, 'out')
                shutil.rmtree(out, ignore_errors=True)
                tsc = subprocess.run(['npx', 'tsc', '-p', 'packages/support/tsconfig.json', '--outDir', out, '--tsBuildInfoFile',
                                      os.path.join(out, '.tsbuildinfo')], cwd=clone, capture_output=True, text=True, env=dict(os.environ, TMPDIR=tmpdir))
                script = f"const m = await import({json.dumps(os.path.join(out, 'index.js'))}); console.log(JSON.stringify([typeof m.randomUUID, m.randomUUID() !== m.randomUUID()]));"
                node = subprocess.run(['node', '--input-type=module', '-e', script], capture_output=True, text=True)
                build = {'tscExit': tsc.returncode, 'tscFirstLines': tsc.stdout.strip().splitlines()[:3], 'loaded': node.stdout.strip(), 'nodeExit': node.returncode}
                shutil.rmtree(out, ignore_errors=True)
        finally:
            lane.restore(undo)
        observed = 'error' if 'error' in res else ('survives' if res['exit'] == 0 else ('killed' if res['failed'] > 0 or res['failedFiles'] else 'error'))
        failing = r2.failing_set(res)
        ok = (want is None and failing == []) or (want is not None and failing == sorted(want))
        rows.append({'id': rid, 'fix': fix, 'edits': edits, 'expected': expected, 'observed': observed, 'failing': failing, 'failingAsExpected': ok,
                     'passed': res.get('passed'), 'failedCount': res.get('failed'), 'build': build, 'load1': open('/proc/loadavg').read().split()[0]})
        print(rid, 'expected', expected, 'observed', observed, 'failingOk', ok, failing, build, flush=True)
    status = git('status', '--porcelain')
    json.dump({'commit': git('rev-parse', 'HEAD').strip(), 'statusAfter': status, 'rows': rows}, open(out_path, 'w'), indent=1)
    print('status after', repr(status))


if __name__ == '__main__':
    main()
