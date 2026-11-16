"""Rule-6 mutants for syzygy-bpyt.8.33, a test-only change to launched.test.ts: the launch-form marker snapshot now also compares the
change time of the regular file a symbolic link leads to (review R-GP-IMPL-LAUNCH-FORM-CTIME-1, N2, option a), and its comment says
what moves the change time (N1). Adapted from the syzygy-bpyt.8.30 harness
(docs/evidence/launch-form-snapshot-ctime-2026-10-23/mutants.py).

Each mutant runs against launched.test.ts at this change's base (`base`, the snapshot comparing only the marker's own change time) and at
the fix (`fix`). No fragment is retyped:
  - the 13 mutants of the syzygy-bpyt.8.30 record are read from that record's stored fix-side edits (the D1 family,
    D3-repair-to-launched, D4-truncate, M-every-form-drains-then-refuses, T-ask-of-an-unplanted-run, R-chmod-cycle-rewrite and the
    review's R-same-size-rewrite, R-fill-dangling-target and R-fifo-to-empty-file);
  - the round-1 review's O1-O8 are read from its retained run (results/rev519-mutants-tmpfs.json, the head side's edits).
Each mutant replaces exact fragments (each must occur exactly once), runs the test file alone in its own process group with vitest's
JSON reporter, restores the bytes and verifies their digests. Killed: at least one test failed, or the run did not finish within the
timeout. Each failed test is stored with the first line of its first failure message. For each 8.30 mutant the fix's failed rows are
compared with that record's fix-side rows (unchanged or stronger means a superset).

The unmutated fix then runs REPEATS times one after another and PARALLEL times all at once, each run under its own TMPDIR below the
one given, with the load average stored beside each run.
Usage: python3 mutants.py <worktree> <base commit> <scratch dir> <out.json>   (TMPDIR names the file system under test)
"""
import hashlib, json, os, signal, subprocess, sys
from pathlib import Path

ROOT, BASE, SCRATCH, OUT = Path(sys.argv[1]).resolve(), sys.argv[2], Path(sys.argv[3]).resolve(), Path(sys.argv[4])
TIMEOUT = 300
REPEATS = 20
PARALLEL = 12
TMP = os.environ.get('TMPDIR', '/tmp')
READER = 'packages/polaris-dossier/src/launched.ts'
TEST = 'packages/polaris-dossier/src/launched.test.ts'
RECORD_830 = 'docs/evidence/launch-form-snapshot-ctime-mutants-2026-10-23.json'
REVIEW_RUN = 'docs/evidence/launch-form-ctime-review-2026-10-24/results/rev519-mutants-tmpfs.json'
ROW = 'launch forms in a run whose marker is unreadable count neither a declared form nor a syzygy-launched one: '
LINK_ROW = 'a symbolic link to the marker Syzygy writes'


def command(report):
    return ['npx', 'vitest', 'run', '--project', '@syzygy/polaris-dossier', '--reporter=json', f'--outputFile={report}', TEST]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(*args):
    return subprocess.run(['git', '-C', str(ROOT), *args], capture_output=True, text=True, check=True).stdout


def load():
    return [round(x, 2) for x in os.getloadavg()]


def start(report, tmpdir):
    report.unlink(missing_ok=True)
    os.makedirs(tmpdir, exist_ok=True)
    return subprocess.Popen(command(report), cwd=ROOT, env={**os.environ, 'CI': '1', 'TMPDIR': tmpdir}, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL, start_new_session=True)


def finish(proc, report):
    try:
        proc.wait(timeout=TIMEOUT)
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL)
        proc.wait()
        return None, None, []
    if not report.exists():
        return proc.returncode, None, []
    data = json.loads(report.read_text())
    failed = [{'test': test['fullName'],
               'firstErrorLine': next((line for message in test['failureMessages'] for line in message.splitlines() if line.strip()), None)}
              for file in data['testResults'] for test in file['assertionResults'] if test['status'] == 'failed']
    return proc.returncode, {k: data[k] for k in ('numTotalTests', 'numPassedTests', 'numFailedTests')}, failed


def run_suite(tmpdir):
    report = SCRATCH / 'mutant-vitest.json'
    return finish(start(report, tmpdir), report)


def rows(failed):
    return sorted(t['test'][len(ROW):] for t in failed if t['test'].startswith(ROW))


def mutants():
    record = json.loads((ROOT / RECORD_830).read_text())
    found = [(m['id'], m['kind'], [(e['file'], e['old'], e['new']) for e in m['edits']], sorted(m['failedRows']))
             for m in record['mutants'] if m['tests'] == 'fix']
    review = json.loads((ROOT / REVIEW_RUN).read_text())
    for m in review['mutants']:
        if m['side'] == 'head' and m['id'].startswith('O'):
            found.append((m['id'], 'review', [(e['file'], e['old'], e['new']) for e in m['edits']], None))
    return found


def main():
    assert git('status', '--porcelain', '--untracked-files=no') == '', 'the tracked tree must be clean'
    SCRATCH.mkdir(parents=True, exist_ok=True)
    head_test = (ROOT / TEST).read_bytes()
    tests = {'base': git('show', f'{BASE}:{TEST}').encode('utf8'), 'fix': head_test}
    originals = {READER: (ROOT / READER).read_bytes(), TEST: head_test}
    assert git('show', f'{BASE}:{READER}').encode('utf8') == originals[READER], 'the reader differs between the base and the fix'
    population = mutants()
    results, unmutated = [], {}
    try:
        for side, test_bytes in tests.items():
            (ROOT / TEST).write_bytes(test_bytes)
            code, counts, failed = run_suite(f'{TMP}/unmutated-{side}')
            unmutated[side] = {'testSha256': sha(test_bytes), 'exitCode': code, 'counts': counts, 'failedTests': failed}
            print('unmutated', side, counts, flush=True)
            for mutant_id, kind, edits, _ in population:
                current = {READER: originals[READER].decode('utf8'), TEST: test_bytes.decode('utf8')}
                assert all(current[file].count(old) == 1 for file, old, _ in edits), (mutant_id, side)
                for file, old, new in edits:
                    current[file] = current[file].replace(old, new)
                for file in current:
                    (ROOT / file).write_bytes(current[file].encode('utf8'))
                try:
                    code, counts, failed = run_suite(f'{TMP}/{mutant_id}-{side}')
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
        for index in range(REPEATS):
            before = load()
            code, counts, failed = run_suite(f'{TMP}/repeat-{index}')
            repeats.append({'exitCode': code, 'counts': counts, 'failedTests': failed, 'loadBefore': before, 'loadAfter': load()})
        print('repeats', [r['exitCode'] for r in repeats], flush=True)
        before = load()
        procs = [(start(SCRATCH / f'parallel-{i}.json', f'{TMP}/parallel-{i}'), SCRATCH / f'parallel-{i}.json') for i in range(PARALLEL)]
        parallel = []
        for proc, report in procs:
            code, counts, failed = finish(proc, report)
            parallel.append({'exitCode': code, 'counts': counts, 'failedTests': failed})
        parallel_load = {'before': before, 'after': load()}
        print('parallel', [r['exitCode'] for r in parallel], parallel_load, flush=True)
    finally:
        for file, data in originals.items():
            (ROOT / file).write_bytes(data)
    passed = lambda r: r['exitCode'] == 0 and r['counts'] is not None and r['counts']['numFailedTests'] == 0 and r['counts']['numPassedTests'] == 43
    by = {(r['id'], r['tests']): r for r in results}
    comparison = {}
    for mutant_id, kind, _, rows_830 in population:
        fix_rows = by[(mutant_id, 'fix')]['failedRows']
        entry = {'base': f"{by[(mutant_id, 'base')]['outcome']}, {len(by[(mutant_id, 'base')]['failedRows'])} of 17 rows",
                 'fix': f"{by[(mutant_id, 'fix')]['outcome']}, {len(fix_rows)} of 17 rows",
                 'linkRow': {'base': LINK_ROW in by[(mutant_id, 'base')]['failedRows'], 'fix': LINK_ROW in fix_rows}}
        if rows_830 is not None:
            entry['against830Fix'] = {'rows830': len(rows_830), 'rowsNow': len(fix_rows), 'unchangedOrStronger': set(rows_830) <= set(fix_rows),
                                      'added': sorted(set(fix_rows) - set(rows_830))}
        comparison[f'{mutant_id} ({kind})'] = entry
    tmpdir_fs = subprocess.run(['stat', '-f', '-c', '%T', TMP], capture_output=True, text=True).stdout.strip()
    record = {
        'title': ('syzygy-bpyt.8.33 rule-6 mutants: the launch-form marker snapshot compares the change time of the regular file a link leads '
                  'to, so an in-place change to the target that keeps its bytes fails the link row'),
        'bead': 'syzygy-bpyt.8.33', 'subject': [TEST], 'testSha256': {side: sha(data) for side, data in tests.items()},
        'readerSha256': sha(originals[READER]), 'base': git('rev-parse', BASE).strip(), 'commit': git('rev-parse', 'HEAD').strip(),
        'diffSha256': sha(subprocess.run(['git', '-C', str(ROOT), 'diff', BASE, 'HEAD', '--', 'packages'], capture_output=True, check=True).stdout),
        'diffWhat': 'git diff <base> <commit> -- packages',
        'fragmentsFrom': {'record830': {'path': RECORD_830, 'sha256': sha((ROOT / RECORD_830).read_bytes())},
                          'reviewRun': {'path': REVIEW_RUN, 'sha256': sha((ROOT / REVIEW_RUN).read_bytes())}},
        'command': ' '.join(command('<scratch>/mutant-vitest.json')), 'timeoutSeconds': TIMEOUT,
        'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(),
        'kernel': os.uname().release, 'cpus': os.cpu_count(), 'tmpdir': {'path': TMP, 'filesystem': tmpdir_fs},
        'unmutated': unmutated,
        'unmutatedFixRepeats': {'runs': len(repeats), 'asksPerRun': 51, 'allPassed43': all(passed(r) for r in repeats), 'results': repeats},
        'unmutatedFixParallel': {'runs': len(parallel), 'atOnce': PARALLEL, 'allPassed43': all(passed(r) for r in parallel), 'load': parallel_load,
                                 'results': parallel},
        'mutants': results,
        'comparison': comparison,
        'trackedTreeCleanAfter': git('status', '--porcelain', '--untracked-files=no') == '',
        'harnessSha256': sha(Path(__file__).read_bytes()),
    }
    OUT.write_text(json.dumps(record, indent=1) + '\n')
    print('comparison', json.dumps(comparison, indent=1))


main()
