#!/usr/bin/env python3
"""Re-run rule-6 mutants by their stored fragments (R-GP-IMPL-OBJECT-ISO-HELPERS-1).

Usage: python3 -I mutant-rerun.py <clone> <spec.json> <out.json> <tmpdir>

spec.json: {"rows": [{"id", "file", "line", "old", "new", "tests": [...], "testsAt": null | "<commit>"}]}
Each row: the clone must be clean; `old` must occur exactly once on line `line` of `file` (1-based) and is replaced there by `new`.
When testsAt names a commit, each listed test file is first replaced by its bytes at that commit (the base tests), and restored after.
The stated test files run with vitest's JSON reporter under the given TMPDIR. killed = exit != 0 and at least one failed test; a run
with no tests is an error. For each kill the first failed test's name and the head of its first failure message are kept, so a kill
can be told from a timeout.
"""
import json, os, subprocess, sys, time


def run_tests(clone, tmpdir, tests):
    out = os.path.join(tmpdir, 'vitest.json')
    if os.path.exists(out):
        os.remove(out)
    cmd = ['npx', 'vitest', 'run', *tests, '--testTimeout=60000', '--hookTimeout=60000', '--reporter=json', f'--outputFile={out}']
    t0 = time.time()
    proc = subprocess.run(cmd, cwd=clone, env=dict(os.environ, TMPDIR=tmpdir), capture_output=True, text=True, timeout=1500)
    if not os.path.exists(out):
        raise SystemExit('no json reporter output: ' + proc.stderr[-600:])
    data = json.load(open(out))
    if data['numTotalTests'] == 0:
        raise SystemExit('the run reported no tests')
    failed = [(t['fullName'], (t.get('failureMessages') or [''])[0].split('\n')[0][:240])
              for f in data['testResults'] for t in f['assertionResults'] if t['status'] == 'failed']
    load = open('/proc/loadavg').read().split()[:3]
    return {'exit': proc.returncode, 'passed': data['numPassedTests'], 'failed': data['numFailedTests'], 'total': data['numTotalTests'],
            'firstFailures': failed[:2], 'seconds': round(time.time() - t0, 1), 'loadavg': ' '.join(load)}


def main():
    clone, spec_path, out_path, tmpdir = sys.argv[1:5]
    os.makedirs(tmpdir, exist_ok=True)
    if subprocess.run(['git', '-C', clone, 'status', '--porcelain', '--untracked-files=no'], capture_output=True, text=True, check=True).stdout.strip():
        raise SystemExit('the clone is not clean')
    commit = subprocess.run(['git', '-C', clone, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    rows = json.load(open(spec_path))['rows']
    results = []
    for row in rows:
        full = os.path.join(clone, row['file'])
        text = open(full).read()
        lines = text.split('\n')
        target = lines[row['line'] - 1]
        if row['old'] is not None and target.count(row['old']) != 1:
            raise SystemExit(f"{row['id']}: old occurs {target.count(row['old'])} times on line {row['line']}")
        saved_tests = {}
        try:
            if row['old'] is not None:
                lines[row['line'] - 1] = target.replace(row['old'], row['new'])
                open(full, 'w').write('\n'.join(lines))
            if row.get('testsAt'):
                for t in row['tests']:
                    p = os.path.join(clone, t)
                    saved_tests[p] = open(p).read()
                    blob = subprocess.run(['git', '-C', clone, 'show', f"{row['testsAt']}:{t}"], capture_output=True, text=True, check=True).stdout
                    open(p, 'w').write(blob)
            r = run_tests(clone, tmpdir, row['tests'])
        finally:
            open(full, 'w').write(text)
            for p, body in saved_tests.items():
                open(p, 'w').write(body)
        killed = r['exit'] != 0 and r['failed'] > 0
        results.append({**row, 'commit': commit, **r, 'killed': killed})
        print(f"{row['id']}: {'KILLED' if killed else 'survived'} exit {r['exit']} {r['failed']}/{r['total']} failed, {r['seconds']}s, load {r['loadavg']}"
              + (f" | {r['firstFailures'][0][0][:110]} :: {r['firstFailures'][0][1][:140]}" if killed else ''), flush=True)
    if subprocess.run(['git', '-C', clone, 'status', '--porcelain', '--untracked-files=no'], capture_output=True, text=True, check=True).stdout.strip():
        raise SystemExit('the clone was left dirty')
    json.dump({'commit': commit, 'rows': results}, open(out_path, 'w'), indent=1)
    print(f"{len(results)} rows, {sum(r['killed'] for r in results)} killed")


if __name__ == '__main__':
    main()
