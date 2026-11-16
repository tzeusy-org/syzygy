"""Rule-6 mutants for syzygy-bpyt.8.30, a test-only change to launched.test.ts: the launch-form marker snapshot now compares the
marker's change time (lstat ctimeNs) beside its mode, inode and size (PR #516 review R-GP-IMPL-LAUNCH-FORM-SNAPSHOT-1, N1, option a).
Adapted from the syzygy-bpyt.8.24 harness (docs/evidence/launch-form-snapshot-oracle-mutants-2026-10-22.json, harnessSource).

Each mutant is run against launched.test.ts at this change's base (`base`, the snapshot without the change time, main ce322e1a) and at
the fix (`fix`). The acceptance mutant is the review's R-chmod-cycle-rewrite (raw section 3 item 4): it chmods a mode-000 marker to 0600,
rewrites it at the same size and chmods it back, so mode, inode and size are unchanged and the bytes are never read. Every mutant of the
syzygy-bpyt.8.24 record is re-run unchanged (the D1 family, D3-repair-to-launched, D4-truncate, M-every-form-drains-then-refuses and the
test-side T-ask-of-an-unplanted-run), with the review's own R-same-size-rewrite, R-fill-dangling-target and R-fifo-to-empty-file. The
unmutated fix is then run REPEATS more times, each over 51 asks, to show that no faithful ask moves the change time.

Each mutant replaces exact fragments (each must occur exactly once), runs the test file alone in its own process group with vitest's
JSON reporter, restores the bytes and verifies their digests. Killed: at least one test failed, or the run did not finish within the
timeout. Each failed test is stored with the first line of its first failure message.
Usage: python3 mutants.py <worktree> <base commit> <scratch dir> <out.json>
"""
import hashlib, json, os, signal, subprocess, sys
from pathlib import Path

ROOT, BASE, SCRATCH, OUT = Path(sys.argv[1]).resolve(), sys.argv[2], Path(sys.argv[3]).resolve(), Path(sys.argv[4])
TIMEOUT = 300
REPEATS = 20
READER = 'packages/polaris-dossier/src/launched.ts'
TEST = 'packages/polaris-dossier/src/launched.test.ts'
REPORT = SCRATCH / 'mutant-vitest.json'
COMMAND = ['npx', 'vitest', 'run', '--project', '@syzygy/polaris-dossier', '--reporter=json', f'--outputFile={REPORT}', TEST]
ROW = 'launch forms in a run whose marker is unreadable count neither a declared form nor a syzygy-launched one: '

MESSAGE = ("'the run\\'s launched marker is present but cannot be read as the one Syzygy writes, so no launch form counts, declared or "
           "syzygy-launched'")
REFUSAL_LINE = f"  if (state === 'unreadable') return {MESSAGE};"
REFUSAL_WITH = lambda body: f"  if (state === 'unreadable') {{ {body}\n    return {MESSAGE}; }}"
REMOVE_ANY = ("try { fs.rmSync(path.join(runDir, RUN_LAYOUT.launched), { recursive: true, force: true }); } catch { /* reviewer mutant */ } "
              "try { fs.unlinkSync(path.join(runDir, RUN_LAYOUT.launched)); } catch { /* reviewer mutant */ }")
REMOVER = lambda body: [(READER, REFUSAL_LINE, REFUSAL_WITH(body))]
MEMO = (READER, "export function launchedMarkerState(runDir: string): LaunchedMarkerState {\n  const file = path.join(runDir, RUN_LAYOUT.launched);",
        "const REMEMBERED = new Map<string, LaunchedMarkerState>();\nexport function launchedMarkerState(runDir: string): LaunchedMarkerState {\n"
        "  const hit = REMEMBERED.get(runDir); if (hit) return hit;\n  const state = launchedMarkerStateOnce(runDir); REMEMBERED.set(runDir, state); return state;\n}\n\n"
        "function launchedMarkerStateOnce(runDir: string): LaunchedMarkerState {\n  const file = path.join(runDir, RUN_LAYOUT.launched);")

MUTANTS = [
    ('D1-with-memoized-reader', 'acceptance', [*REMOVER(REMOVE_ANY), MEMO]),
    ('D1-terminal-only', 'acceptance', REMOVER(f"if (form['value'] === 'terminal') {{ {REMOVE_ANY} }}")),
    ('D1-bang-only', 'acceptance', REMOVER(f"if (form['value'] === 'bang') {{ {REMOVE_ANY} }}")),
    ('D1-syzygy-launched-only', 'acceptance', REMOVER(f"if (form['value'] === SYZYGY_LAUNCHED) {{ {REMOVE_ANY} }}")),
    ('D1-any-remover', 'acceptance', REMOVER(REMOVE_ANY)),
    ('D3-repair-to-launched', 'extra', REMOVER(f"{REMOVE_ANY} try {{ writeLaunchedMarker(runDir, 'run-x', 0); }} catch {{ /* reviewer mutant */ }}")),
    ('D4-truncate', 'extra', REMOVER("try { fs.truncateSync(path.join(runDir, RUN_LAYOUT.launched), 0); } catch { /* reviewer mutant */ }")),
    ('M-every-form-drains-then-refuses', 'extra', [
        (READER, "    if (!stat.isFile() || stat.size > MARKER_BYTES_MAX) return 'unreadable';", "    if (stat.size > MARKER_BYTES_MAX) return 'unreadable';"),
        (READER, "    if (length > MARKER_BYTES_MAX) return 'unreadable';", "    if (length > MARKER_BYTES_MAX || !stat.isFile()) return 'unreadable';")]),
    ('T-ask-of-an-unplanted-run', 'extra', [(TEST, "      const dir = planted();", "      const dir = runDir();")]),
    ('R-chmod-cycle-rewrite', 'acceptance', REMOVER("try { const p = path.join(runDir, RUN_LAYOUT.launched); const s = fs.lstatSync(p); if (s.isFile() && (s.mode & 0o777) === 0) { fs.chmodSync(p, 0o600); fs.writeFileSync(p, ' '.repeat(s.size)); fs.chmodSync(p, 0o000); } } catch { /* reviewer mutant */ }")),
    ('R-same-size-rewrite', 'extra', REMOVER("try { const p = path.join(runDir, RUN_LAYOUT.launched); const s = fs.statSync(p); if (s.isFile() && s.size > 0) fs.writeFileSync(p, ' '.repeat(s.size)); } catch { /* reviewer mutant */ }")),
    ('R-fill-dangling-target', 'extra', REMOVER("try { const p = path.join(runDir, RUN_LAYOUT.launched); if (fs.lstatSync(p).isSymbolicLink()) { const t = fs.readlinkSync(p); if (!fs.existsSync(t)) fs.writeFileSync(t, '{\"format\": \"polaris-dossier-launched/1\"}'); } } catch { /* reviewer mutant */ }")),
    ('R-fifo-to-empty-file', 'extra', REMOVER("try { const p = path.join(runDir, RUN_LAYOUT.launched); if (fs.lstatSync(p).isFIFO()) { fs.unlinkSync(p); fs.writeFileSync(p, ''); } } catch { /* reviewer mutant */ }")),
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(*args):
    return subprocess.run(['git', '-C', str(ROOT), *args], capture_output=True, text=True, check=True).stdout


def run_suite():
    REPORT.unlink(missing_ok=True)
    proc = subprocess.Popen(COMMAND, cwd=ROOT, env={**os.environ, 'CI': '1'}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True)
    try:
        proc.communicate(timeout=TIMEOUT)
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL)
        proc.communicate()
        return None, None, []
    if not REPORT.exists():
        return proc.returncode, None, []
    report = json.loads(REPORT.read_text())
    failed = [{'test': test['fullName'],
               'firstErrorLine': next((line for message in test['failureMessages'] for line in message.splitlines() if line.strip()), None)}
              for file in report['testResults'] for test in file['assertionResults'] if test['status'] == 'failed']
    return proc.returncode, {k: report[k] for k in ('numTotalTests', 'numPassedTests', 'numFailedTests')}, failed


def rows(failed):
    return sorted(t['test'][len(ROW):] for t in failed if t['test'].startswith(ROW))


def main():
    assert git('status', '--porcelain', '--untracked-files=no') == ''
    head_test = (ROOT / TEST).read_bytes()
    tests = {'base': git('show', f'{BASE}:{TEST}').encode('utf8'), 'fix': head_test}
    originals = {READER: (ROOT / READER).read_bytes(), TEST: head_test}
    assert git('show', f'{BASE}:{READER}').encode('utf8') == originals[READER], 'the reader differs between the base and the fix'
    results, unmutated = [], {}
    try:
        for side, test_bytes in tests.items():
            (ROOT / TEST).write_bytes(test_bytes)
            code, counts, failed = run_suite()
            unmutated[side] = {'testSha256': sha(test_bytes), 'exitCode': code, 'counts': counts, 'failedTests': failed}
            print('unmutated', side, counts, flush=True)
            for mutant_id, kind, edits in MUTANTS:
                current = {READER: originals[READER].decode('utf8'), TEST: test_bytes.decode('utf8')}
                applicable = all(current[file].count(old) == 1 for file, old, _ in edits)
                if not applicable:
                    results.append({'id': mutant_id, 'kind': kind, 'tests': side, 'edits': [{'file': f, 'old': o, 'new': n} for f, o, n in edits],
                                    'outcome': 'not-applicable', 'reason': 'an old fragment does not occur exactly once in this side'})
                    print(mutant_id, side, 'not-applicable', flush=True)
                    continue
                for file, old, new in edits:
                    current[file] = current[file].replace(old, new)
                for file in current:
                    (ROOT / file).write_bytes(current[file].encode('utf8'))
                try:
                    code, counts, failed = run_suite()
                finally:
                    (ROOT / READER).write_bytes(originals[READER])
                    (ROOT / TEST).write_bytes(test_bytes)
                blocked = code is None
                results.append({'id': mutant_id, 'kind': kind, 'tests': side, 'edits': [{'file': f, 'old': o, 'new': n} for f, o, n in edits],
                                'exitCode': code, 'counts': counts, 'failedTests': failed, 'failedRows': rows(failed), 'blocked': blocked,
                                'outcome': 'killed' if blocked or (code != 0 and failed) else 'survived',
                                'restored': sha((ROOT / READER).read_bytes()) == sha(originals[READER]) and sha((ROOT / TEST).read_bytes()) == sha(test_bytes)})
                print(mutant_id, side, results[-1]['outcome'], counts, len(results[-1]['failedRows']), flush=True)
        (ROOT / TEST).write_bytes(head_test)
        repeats = []
        for _ in range(REPEATS):
            code, counts, failed = run_suite()
            repeats.append({'exitCode': code, 'counts': counts, 'failedTests': failed})
        print('repeats', [r['exitCode'] for r in repeats], flush=True)
    finally:
        for file, data in originals.items():
            (ROOT / file).write_bytes(data)
    record = {
        'title': 'syzygy-bpyt.8.30 rule-6 mutants: the launch-form marker snapshot compares the change time, so an in-place rewrite at the same size and mode fails',
        'bead': 'syzygy-bpyt.8.30', 'subject': [TEST], 'testSha256': {side: sha(data) for side, data in tests.items()},
        'readerSha256': sha(originals[READER]), 'base': git('rev-parse', BASE).strip(), 'commit': git('rev-parse', 'HEAD').strip(),
        'command': ' '.join(COMMAND).replace(str(REPORT), '<scratch>/mutant-vitest.json'), 'timeoutSeconds': TIMEOUT,
        'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(),
        'kernel': os.uname().release,
        'tmpdir': {'path': os.environ.get('TMPDIR', '/tmp'),
                   'filesystem': subprocess.run(['stat', '-f', '-c', '%T', os.environ.get('TMPDIR', '/tmp')], capture_output=True, text=True).stdout.strip()},
        'unmutatedFixRepeats': {'runs': len(repeats), 'asksPerRun': 51,
                                'allPassed': all(r['exitCode'] == 0 and r['counts'] and r['counts']['numFailedTests'] == 0 for r in repeats),
                                'results': repeats},
        'unmutated': unmutated, 'mutants': results,
        'trackedTreeCleanAfter': git('status', '--porcelain', '--untracked-files=no') == '',
        'summary': {f'{m} ({kind}) / {side} tests': next(f"{r['outcome']}" + (f", {len(r['failedRows'])} of 17 rows" if r['outcome'] != 'not-applicable' else '')
                                                         for r in results if r['id'] == m and r['tests'] == side)
                    for m, kind, _ in MUTANTS for side in tests},
        'harnessSource': Path(__file__).read_text(),
    }
    OUT.write_text(json.dumps(record, indent=2) + '\n')
    print('summary', json.dumps(record['summary'], indent=1))


main()
