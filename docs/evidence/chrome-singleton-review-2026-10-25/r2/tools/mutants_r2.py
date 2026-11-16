"""Round-2 reviewer's rule-6 mutants for PR 515 (syzygy-bpyt.4.11).

Usage: python3 -I mutants_r2.py <clone> <lane-edits.json> <out.json>

Runs a control, then the lane's seven named mutants exactly as recorded (the old/new fragments
in <lane-edits.json>, extracted by check_records_r2.py from mutants-cdp-r1-2026-10-25.json),
then the reviewer's own. Each mutant replaces exactly one occurrence of each fragment, runs the
unit and real-Chrome files in a fresh private TMPDIR (/tmp/r515b-m<n>-<attempt>), records every
failing test with its first error line and what the TMPDIR held afterwards, restores every file
and checks its sha256. Killed: a failing test whose first error line is not a load signature.
Survived: exit 0. Otherwise retried up to three times, then INCONCLUSIVE-LOAD.
A mutant with runner 'root' runs the unit file only, inside bwrap as uid 0 with every
capability of its user namespace, so permission bits no longer stop a removal (N5).
"""
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys

clone = pathlib.Path(sys.argv[1]).resolve()
lane = json.loads(pathlib.Path(sys.argv[2]).read_text())
out = pathlib.Path(sys.argv[3]).resolve()
SRC = 'apps/three-surface-poc/src/cdp-browser.ts'
UNIT = 'apps/three-surface-poc/src/cdp-browser.test.ts'
BROWSER = 'apps/three-surface-poc/src/cdp-browser.browser.test.ts'
LOAD = ('drain did not verify', 'still held by', 'timed out', 'Test timed out', 'STACK_TRACE_ERROR')
ROOT = ['bwrap', '--dev-bind', '/', '/', '--unshare-user', '--uid', '0', '--gid', '0', '--cap-add', 'ALL']

LANE_ORDER = ['profile-owner-not-checked', 'link-owner-not-checked', 'link-trusted-whoever-made-it',
              'identity-inode-not-compared', 'identity-device-not-compared', 'identity-not-compared', 'name-case-insensitive']

IMPORT_OLD = "import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, statSync, type BigIntStats } from 'node:fs';"
IMPORT_NEW = "import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, statSync, type BigIntStats } from 'node:fs';"
CHECK_OLD = "    if (!ownedByRunningUser(lstat(profile)) || !ownedByRunningUser(lstat(link))) return undefined;\n"

OWN = [
    ('own-profile-check-follows-profile',
     'the profile check reads where the profile leads (its resolved path), not the profile entry itself, so a profile '
     'path that is another user\'s link to a directory of ours is trusted',
     [(SRC, IMPORT_OLD, IMPORT_NEW),
      (SRC, CHECK_OLD, "    if (!ownedByRunningUser(lstat(realpathSync(profile))) || !ownedByRunningUser(lstat(link))) return undefined;\n")],
     'normal'),
    ('own-profile-check-reads-parent',
     'the profile check reads the directory that holds the profile, not the profile',
     [(SRC, CHECK_OLD, "    if (!ownedByRunningUser(lstat(dirname(profile))) || !ownedByRunningUser(lstat(link))) return undefined;\n")],
     'normal'),
    ('own-link-check-reads-target',
     'the link check reads the socket the link names, not the link',
     [(SRC, CHECK_OLD, "    if (!ownedByRunningUser(lstat(profile)) || !ownedByRunningUser(lstat(readlinkSync(link)))) return undefined;\n")],
     'normal'),
    ('own-identity-of-socket-file',
     'the identity recorded at the read is the socket file\'s, not the directory\'s',
     [(SRC, '    const { dev, ino } = lstat(path);\n', "    const { dev, ino } = lstat(join(path, 'SingletonSocket'));\n")],
     'normal'),
    ('own-removal-ignores-injected-lstat',
     'the removal reads the directory with the default lstat whatever the caller injected',
     [(SRC, '  if (singleton !== undefined) removeChromeSingletonDirectory(singleton, options.lstat);\n',
       '  if (singleton !== undefined) removeChromeSingletonDirectory(singleton);\n')],
     'normal'),
    ('own-n5-skip-dropped-as-root',
     'N5: the root skip is dropped, and the unit file runs as uid 0 with its namespace\'s capabilities',
     [(UNIT, "    skip(process.getuid?.() === 0, 'running as root');\n", '')],
     'root'),
    ('own-n5-skip-dropped-as-user',
     'the same edit as the running user: an equivalent mutant there, which shows the skip changes nothing off root',
     [(UNIT, "    skip(process.getuid?.() === 0, 'running as root');\n", '')],
     'unit'),
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def failing_tests(report):
    failed = []
    for file_result in report.get('testResults', []):
        for assertion in file_result.get('assertionResults', []):
            if assertion.get('status') == 'failed':
                messages = assertion.get('failureMessages') or ['']
                first = next((line for line in messages[0].splitlines() if line.strip()), '')
                failed.append({'test': assertion.get('fullName'), 'firstErrorLine': first[:300]})
        if file_result.get('status') == 'failed' and not file_result.get('assertionResults'):
            failed.append({'test': f"<file> {file_result.get('name')}", 'firstErrorLine': (file_result.get('message') or '')[:300]})
    return failed


mutants = [('control', 'no change', [], 'normal'), ('control-root', 'no change, unit file as uid 0', [], 'root')]
for mid in LANE_ORDER:
    mutants.append((mid, 'lane fragment, as recorded', [(e['file'], e['old'], e['new']) for e in lane[mid]], 'normal'))
mutants += OWN
# Necessity: the same lane fragments with the four round-2 cases that keep a directory skipped. A mutant that the
# round-2 cases alone kill survives here; one that an older case also kills is killed here too.
ROUND2_KEEP_CASES = ["  it('keeps the directory a link names when the profile is not", "  it('keeps the directory a link names when the link is not",
                     "  it('keeps a directory made under the same name", "  it('keeps a directory with the recorded inode number"]
SKIPS = [(UNIT, c, c.replace("  it('", "  it.skip('")) for c in ROUND2_KEEP_CASES]
mutants.append(('control-without-round2-cases', 'no change to the source; the four round-2 keep cases skipped', SKIPS, 'normal'))
for mid in LANE_ORDER[:6]:
    mutants.append((f'{mid}--without-round2-cases', 'lane fragment, as recorded, with the four round-2 keep cases skipped',
                    [(e['file'], e['old'], e['new']) for e in lane[mid]] + SKIPS, 'normal'))
only = set(sys.argv[4].split(',')) if len(sys.argv) > 4 else None

touched = sorted({SRC, UNIT})
originals = {p: (clone / p).read_bytes() for p in touched}
original_sha = {p: hashlib.sha256(b).hexdigest() for p, b in originals.items()}
head = subprocess.run(['git', '-C', str(clone), 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
dirty = subprocess.run(['git', '-C', str(clone), 'status', '--porcelain', '--untracked-files=no'], capture_output=True, text=True, check=True).stdout
if dirty:
    sys.exit(f'refusing: tracked files modified before the run:\n{dirty}')
results = []
for index, (mid, meaning, edits, runner) in enumerate(mutants):
    if only and mid not in only:
        continue
    record = {'id': mid, 'meaning': meaning, 'runner': runner,
              'edits': [{'file': f, 'old': o, 'new': n} for f, o, n in edits], 'attempts': []}
    texts = {p: originals[p].decode() for p in touched}
    applied = True
    for f, o, n in edits:
        count = texts[f].count(o)
        if count != 1:
            record['outcome'] = f'NOT-APPLIED ({count} occurrences of a fragment in {f})'
            applied = False
            break
        texts[f] = texts[f].replace(o, n)
    if not applied:
        results.append(record)
        print(mid, record['outcome'], flush=True)
        continue
    for p in touched:
        (clone / p).write_text(texts[p])
    try:
        for attempt in range(1, 4):
            tmp = pathlib.Path(f'/tmp/r515b-m{index}-{attempt}')
            shutil.rmtree(tmp, ignore_errors=True)
            tmp.mkdir()
            report_path = out.parent / f'r2m{index}-{attempt}.report.json'
            files = [UNIT] if runner in ('root', 'unit') else [UNIT, BROWSER]
            cmd = ['npx', 'vitest', 'run', '--project', '@syzygy/three-surface-poc-app', *files,
                   '--reporter=json', f'--outputFile={report_path}']
            if runner == 'root':
                cmd = ROOT + cmd
            env = dict(os.environ, TMPDIR=str(tmp))
            proc = subprocess.run(cmd, cwd=clone, env=env, capture_output=True, text=True, timeout=900)
            report = json.loads(report_path.read_text()) if report_path.exists() else {}
            report_path.unlink(missing_ok=True)
            failed = failing_tests(report)
            left = sorted(name for name in os.listdir(tmp) if name != 'node-compile-cache')
            shutil.rmtree(tmp, ignore_errors=True)
            real = [f for f in failed if not any(s in f['firstErrorLine'] for s in LOAD)]
            entry = {'attempt': attempt, 'exit': proc.returncode, 'testsRun': report.get('numTotalTests'),
                     'passed': report.get('numPassedTests'), 'skipped': report.get('numPendingTests'),
                     'failing': failed, 'left': left}
            if not report:
                entry['stderrTail'] = proc.stderr[-1500:]
            record['attempts'].append(entry)
            if not edits:
                outcome = 'CONTROL-PASS' if proc.returncode == 0 and not left else ('CONTROL-FAIL' if real or left or not report else 'INCONCLUSIVE-LOAD')
            elif real:
                outcome = 'killed'
            elif proc.returncode == 0:
                outcome = 'SURVIVED'
            else:
                outcome = 'INCONCLUSIVE-LOAD'
            record['outcome'] = outcome
            if outcome != 'INCONCLUSIVE-LOAD':
                break
    finally:
        for p in touched:
            (clone / p).write_bytes(originals[p])
        record['restored'] = all(sha(clone / p) == original_sha[p] for p in touched)
    results.append(record)
    last = record['attempts'][-1]
    print(mid, record['outcome'], [a['exit'] for a in record['attempts']], last['testsRun'], last['passed'], last['skipped'],
          [f['test'][-70:] + ' :: ' + f['firstErrorLine'][:90] for f in last['failing']][:3], last['left'], flush=True)

out.write_text(json.dumps({'tool': 'mutants_r2.py', 'treeCommit': head, 'sha256AtCommit': original_sha,
                           'loadSignatures': LOAD, 'rootRunner': ROOT, 'results': results}, indent=2) + '\n')
