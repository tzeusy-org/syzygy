import ctypes, hashlib, importlib.util, json, os, re, shutil, signal, subprocess, sys, tempfile, time
from pathlib import Path
sys.dont_write_bytecode = True

BASE = Path('/home/orca/.tmp/f3-native-admission-fixes')
ROOT = Path('/home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w')
HELPERS = BASE / 'resumed-fixture-ownership-validation-r2-c245-20261126-1'
OUT = BASE / 'sync-guard-repairs-121936-execution-1'
SUBJECT = '12193649b4269a7d86fad68c26cd63bbd82452e7'
FILES = ['apps/three-surface-poc/src/sync-child-process-guard.test.ts', 'packages/polaris-dossier/src/policy-git-native.test.ts']

manifest = json.loads((HELPERS / 'manifest.json').read_text())
for row in manifest['payloads']:
    data = Path(row['path']).read_bytes()
    assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256']
spec = importlib.util.spec_from_file_location('history_diagnostic_helpers', HELPERS / 'operator_common.py')
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
S.ROOT = ROOT
assert not OUT.exists()
OUT.mkdir()
receipt = {'subject': SUBJECT, 'scope': 'Exact reviewed process-guard pin/admissions and local fixture helper; typecheck and all28 integration owning cases', 'commands': [], 'errors': [], 'reaped': [], 'complete': False}
before = None
child = None
scratch = None
handlers = {}
try:
    assert S.git('rev-parse', 'HEAD').decode().strip() == SUBJECT
    status = S.git('diff', '--name-only').decode().splitlines()
    assert sorted(status) == sorted(FILES)
    assert not os.environ.get('NODE_OPTIONS')
    before = S.snapshot()
    S.checkpoint(OUT, 'source-before.json', before)
    raw = (BASE / 'final-check-all-clean-clone-execution-121936-2/check-all.log').read_text()
    expected = {}
    for line in raw.splitlines():
        match = re.match(r'^\s*[✓❯]\s+\|integration\|\s+(.*?)\s+\((\d+) tests?[^)]*\)', line)
        if match and match[1] in FILES:
            assert match[1] not in expected
            expected[match[1]] = int(match[2])
    assert expected == {FILES[0]: 11, FILES[1]: 17}
    receipt['expectedPerFileCases'] = expected
    libc = ctypes.CDLL(None, use_errno=True)
    if libc.prctl(36, 1, 0, 0, 0): raise OSError(ctypes.get_errno(), 'subreaper')
    scratch = Path(tempfile.mkdtemp(prefix='history-unit-diagnostic-', dir='/home/orca/.tmp'))
    scratch.chmod(0o700)
    receipt['privateScratch'] = str(scratch)
    env = dict(os.environ)
    env.update(TMPDIR=str(scratch), TMP=str(scratch), TEMP=str(scratch))
    env['PATH'] = str(Path(S.NODE).parent) + os.pathsep + env.get('PATH', '')
    handlers = {sig: signal.signal(sig, S.interrupt) for sig in (signal.SIGINT, signal.SIGTERM)}
    tc = {'argv': ['npm', 'run', 'typecheck']}
    receipt['commands'].append(tc)
    began = time.monotonic()
    with (OUT / 'typecheck.log').open('wb') as log:
        child = subprocess.Popen(tc['argv'], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        while True:
            try:
                tc['returncode'] = child.wait(timeout=45)
                break
            except subprocess.TimeoutExpired:
                print(json.dumps({'state': 'typecheck-running', 'seconds': time.monotonic() - began}), flush=True)
    tc['seconds'] = time.monotonic() - began
    assert tc['returncode'] == 0
    command = [S.NODE, 'node_modules/vitest/vitest.mjs', 'run', '--project', 'integration', *FILES, '--reporter=default', '--reporter=json', '--outputFile', str(OUT / 'vitest.json')]
    record = {'argv': command}
    receipt['commands'].append(record)
    began = time.monotonic()
    with (OUT / 'vitest.log').open('wb') as log:
        child = subprocess.Popen(command, cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        while True:
            try:
                record['returncode'] = child.wait(timeout=45)
                break
            except subprocess.TimeoutExpired:
                print(json.dumps({'state': 'running', 'seconds': time.monotonic() - began}), flush=True)
    record['seconds'] = time.monotonic() - began
    data = json.loads((OUT / 'vitest.json').read_text())
    actual = {str(Path(row['name']).relative_to(ROOT)): len(row['assertionResults']) for row in data['testResults']}
    assert actual == expected
    statuses = [test['status'] for row in data['testResults'] for test in row['assertionResults']]
    assert set(statuses) <= {'passed', 'failed', 'skipped', 'pending', 'todo'}
    receipt['counts'] = {status: statuses.count(status) for status in sorted(set(statuses))}
    receipt['reportedCounts'] = {key: data.get(key) for key in ['numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'numTodoTests']}
    assert data['numTotalTests'] == sum(expected.values()) == len(statuses)
    receipt['testsPassed'] = record['returncode'] == 0 and data.get('success') is True and statuses.count('passed') == len(statuses) and all(not row.get('message') for row in data['testResults'])
    assert not any(value for key, value in data.items() if re.search(r'(?:unhandled|runtimeerror|onfinished|errors?$)', key, re.I))
    assert not re.search(r'^\s*(?:Unhandled Errors|Unhandled Rejection|Unhandled Exception)\s*$', (OUT / 'vitest.log').read_text(errors='replace'), re.M)
except BaseException as failure:
    receipt['errors'].append({'type': type(failure).__name__, 'message': str(failure)})
finally:
    for sig in handlers: signal.signal(sig, signal.SIG_IGN)
    try: receipt['noOwnedChildren'] = S.drain(child, receipt['reaped'])
    except BaseException as failure: receipt['errors'].append({'phase': 'drain', 'message': str(failure)})
    if before is not None:
        try:
            after = S.snapshot()
            S.checkpoint(OUT, 'source-after.json', after)
            receipt['sourceUnchanged'] = after == before
        except BaseException as failure: receipt['errors'].append({'phase': 'freeze', 'message': str(failure)})
    if scratch is not None:
        try:
            if receipt.get('noOwnedChildren'): shutil.rmtree(scratch)
            receipt['privateScratchRemoved'] = not scratch.exists()
        except BaseException as failure: receipt['errors'].append({'phase': 'scratch', 'message': str(failure)})
    receipt['complete'] = bool(receipt.get('testsPassed') and receipt.get('noOwnedChildren') and receipt.get('sourceUnchanged') and receipt.get('privateScratchRemoved') and not receipt['errors'])
    receipt['artifacts'] = [{'file': p.name, 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(OUT.iterdir()) if p.is_file()]
    S.checkpoint(OUT, 'terminal.json', receipt)
    for sig, old in handlers.items(): signal.signal(sig, old)
print(json.dumps({'complete': receipt['complete'], 'receipt': str(OUT / 'terminal.json'), 'errors': receipt['errors']}))
raise SystemExit(0 if receipt['complete'] else 1)
