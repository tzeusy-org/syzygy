#!/usr/bin/env python3
"""Does the real-Chrome singleton test hold under every Chrome installed here, dotted name and dotless? (hosted run 39768592736)

Usage: chrome_matrix.py <worktree> <tree-commit> <out.json> <private-parent> <mode> <chrome> [<chrome>...]

The hosted node-ci run failed `cdp-browser.browser.test.ts` > "leaves no Chrome singleton directory behind when the
leader is killed" with `expected 'com.google.Chrome.CCtKIQ' to match /^\\.(com\\.google\\.Chrome|org\\.chromium…/`: the
runner's Chrome 155 names the directory without the leading dot Chrome 120 gives it. This tool runs that one file alone,
once per <chrome> (`SYZYGY_POC_BROWSER`), each under its own short private TMPDIR below <private-parent> (which must not
exist or be empty), and records the Chrome's version, the outcome, every failing test with its first error line, and what
the run left in its TMPDIR.

<mode> is `head` (the tree as committed) or `pre-fix` (the leading dot required again, in the helper's pattern and in
the test's assertion: the two lines as they were at 857d6a5a, edited in place and restored byte for byte). `holds` is
true when, in `head` mode, every run passes and leaves nothing; in `pre-fix` mode, at least one run fails on the name
assertion (its first error line begins `expected '` and says `to match`) and every run that fails does so on that line.

Host load is not a failure of the code: a run whose every failing test carries a LOAD_SIGNATURES first error line is run
again, up to ATTEMPTS times, and scored `INCONCLUSIVE-LOAD` if none decides. Every attempt is recorded.
"""
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

WT, COMMIT, OUT, PARENT, MODE = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]).resolve(), pathlib.Path(sys.argv[4]).resolve(), sys.argv[5]
CHROMES = sys.argv[6:]
assert MODE in ('head', 'pre-fix'), MODE
assert CHROMES, 'name at least one Chrome'
CDP = 'apps/three-surface-poc/src/cdp-browser.ts'
TEST = 'apps/three-surface-poc/src/cdp-browser.browser.test.ts'
PROJECT = '@syzygy/three-surface-poc-app'
ATTEMPTS = 3
LOAD_SIGNATURES = ('drain did not verify', 'still held by', 'timed out', 'STACK_TRACE_ERROR')
PATTERN = r"const CHROME_SINGLETON_DIRECTORY = /^\.?(?:com\.google\.Chrome|org\.chromium\.Chromium)\.[A-Za-z0-9]+$/;"
PATTERN_BEFORE = PATTERN.replace('/^\\.?(?:', '/^\\.(?:')
ASSERTION = "      expect(basename(singleton)).toMatch(/^\\.?(com\\.google\\.Chrome|org\\.chromium\\.Chromium)\\.[A-Za-z0-9]+$/);\n"
ASSERTION_BEFORE = "      expect(basename(singleton)).toMatch(/^\\.(com\\.google\\.Chrome|org\\.chromium\\.Chromium)\\./);\n"
EDITS = [(CDP, PATTERN, PATTERN_BEFORE), (TEST, ASSERTION, ASSERTION_BEFORE)]
SHAPE = re.compile(r'^\.?(com\.google\.Chrome|org\.chromium\.Chromium)\.[A-Za-z0-9]+$')

git = lambda *a: subprocess.run(['git', *a], cwd=WT, capture_output=True, text=True, check=True).stdout.strip()
assert git('rev-parse', 'HEAD') == git('rev-parse', COMMIT), 'the worktree must be at <tree-commit>'
assert git('status', '--porcelain', '--', 'apps', 'packages', 'vitest.config.ts') == '', 'the tree must be committed'
assert not PARENT.exists() or not any(PARENT.iterdir()), f'{PARENT} must not exist or be empty'
shared = [pathlib.Path('/'), pathlib.Path(tempfile.gettempdir()), pathlib.Path(os.environ.get('TMPDIR') or '/tmp'), pathlib.Path.home()]
assert all(PARENT != d.resolve() and PARENT not in d.resolve().parents for d in shared), 'the parent must not be, or contain, a shared directory'
assert len(str(PARENT)) <= 30, 'Chrome needs a short TMPDIR (the socket path is limited to 107 bytes)'
originals = {name: (WT / name).read_text() for name in (CDP, TEST)}
digests = {name: hashlib.sha256(text.encode()).hexdigest() for name, text in originals.items()}
report = pathlib.Path(tempfile.mkdtemp(prefix='zz-chrome-matrix-')) / 'report.json'


def run_once(chrome: str, tmp: pathlib.Path) -> tuple[int, int, list[dict], list[str]]:
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    report.unlink(missing_ok=True)
    command = ['npx', 'vitest', 'run', TEST, '--project', PROJECT, '--reporter=json', f'--outputFile={report}']
    proc = subprocess.run(command, cwd=WT, capture_output=True, text=True, env={**os.environ, 'TMPDIR': str(tmp), 'SYZYGY_POC_BROWSER': chrome}, timeout=900)
    data = json.loads(report.read_text()) if report.exists() else {'testResults': []}
    cases = [a for suite in data['testResults'] for a in suite['assertionResults']]
    failing = [{'test': a['fullName'], 'firstErrorLine': (a['failureMessages'][0].splitlines() or [''])[0] if a['failureMessages'] else ''} for a in cases if a['status'] == 'failed']
    return proc.returncode, len(cases), failing, sorted(p.name for p in tmp.iterdir() if p.name != 'node-compile-cache')


def classify(exit_code: int, failing: list[dict]) -> str:
    if exit_code == 0:
        return 'passed'
    if not failing:
        return 'no-failing-test'
    return 'failed' if any(not any(sig in f['firstErrorLine'] for sig in LOAD_SIGNATURES) for f in failing) else 'load'


rows = []
try:
    if MODE == 'pre-fix':
        for name, old, new in EDITS:
            assert originals[name].count(old) == 1, (name, old)
            (WT / name).write_text((WT / name).read_text().replace(old, new, 1))
    for index, chrome in enumerate(CHROMES):
        version = subprocess.run([chrome, '--version'], capture_output=True, text=True).stdout.strip()
        tmp = PARENT / str(index)
        attempts = []
        for attempt in range(1, ATTEMPTS + 1):
            exit_code, total, failing, left = run_once(chrome, tmp)
            status = classify(exit_code, failing)
            attempts.append({'attempt': attempt, 'exit': exit_code, 'status': status, 'testsRun': total, 'failing': failing, 'left': left})
            if status != 'load':
                break
        on_name = [f for f in failing if f['firstErrorLine'].startswith("AssertionError: expected '") and 'to match' in f['firstErrorLine']]
        rows.append({'executable': chrome, 'version': version, 'status': status, 'exit': exit_code, 'testsRun': total, 'failing': failing,
                     'failingOnTheNameAssertion': len(on_name), 'left': left, 'singletonShapedLeft': [n for n in left if SHAPE.match(n)], 'attempts': attempts})
        print(version, status, len(failing), left, flush=True)
finally:
    for name, text in originals.items():
        (WT / name).write_text(text)
    shutil.rmtree(PARENT, ignore_errors=True)
    shutil.rmtree(report.parent, ignore_errors=True)
for name, text in originals.items():
    assert hashlib.sha256((WT / name).read_bytes()).hexdigest() == digests[name], f'{name} not restored'
if MODE == 'head':
    holds = all(r['status'] == 'passed' and r['singletonShapedLeft'] == [] for r in rows)
else:
    holds = any(r['failingOnTheNameAssertion'] for r in rows) and all(r['status'] == 'passed' or r['failingOnTheNameAssertion'] == len(r['failing']) for r in rows)
record = {'tool': 'chrome_matrix.py', 'treeCommit': git('rev-parse', 'HEAD'), 'mode': MODE, 'sha256AtCommit': digests, 'project': PROJECT, 'testFile': TEST,
          'command': 'SYZYGY_POC_BROWSER=<chrome> TMPDIR=<private> npx vitest run ' + TEST + ' --project ' + PROJECT, 'loadSignatures': list(LOAD_SIGNATURES),
          **({'mutant': {'id': 'leading-dot-required', 'edits': [{'file': f, 'old': o, 'new': n} for f, o, n in EDITS]}} if MODE == 'pre-fix' else {}),
          'rows': rows, 'holds': holds}
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({'mode': MODE, 'holds': holds, 'rows': [(r['version'], r['status']) for r in rows]}))
