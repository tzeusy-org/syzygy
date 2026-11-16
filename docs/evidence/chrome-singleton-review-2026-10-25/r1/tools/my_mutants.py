"""Reviewer's rule-6 mutants for PR 515 (syzygy-bpyt.4.11).

Usage: python3 -I my_mutants.py <clone> <out.json>
Each mutant rewrites one fragment of cdp-browser.ts (exactly one occurrence), runs the
unit and real-Chrome files in a fresh private TMPDIR (/tmp/r515-m<n>), records every
failing test with its first error line and what the TMPDIR held afterwards, restores the
file and checks its sha256. A mutant is killed only when a failing test's first error
line is not a load signature; it survives only on exit 0; otherwise it is retried up to
three times and then recorded as inconclusive.
"""
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys

clone = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]).resolve()
SOURCE = clone / 'apps/three-surface-poc/src/cdp-browser.ts'
FILES = ['apps/three-surface-poc/src/cdp-browser.test.ts', 'apps/three-surface-poc/src/cdp-browser.browser.test.ts']
LOAD = ('drain did not verify', 'still held by', 'timed out', 'Test timed out', 'STACK_TRACE_ERROR')

MUTANTS = [
    ('control', None, None, 'no change'),
    ('leak-singleton-not-read-while-running',
     '  singleton = chromeSingletonDirectory(profile);\n', '',
     'restores the leak: launchBrowser never reads the directory while Chrome runs'),
    ('leak-removal-is-a-no-op',
     'function removeChromeSingletonDirectory(directory: string): void {\n  if (!isChromeSingletonDirectory(directory)) return;\n',
     'function removeChromeSingletonDirectory(directory: string): void {\n  if (directory !== \'\') return;\n',
     'restores the leak: the removal returns before it removes anything'),
    ('guard-lstat-becomes-stat',
     'const entry = lstatSync(directory);', 'const entry = statSync(directory);',
     'a link with Chrome\'s name is judged by its target'),
    ('guard-parent-not-checked',
     'return dirname(directory) === tmpdir() && CHROME_SINGLETON_DIRECTORY.test(basename(directory));',
     'return CHROME_SINGLETON_DIRECTORY.test(basename(directory));',
     'a Chrome-named directory anywhere is accepted'),
    ('guard-parent-prefix-comparison',
     'return dirname(directory) === tmpdir() && CHROME_SINGLETON_DIRECTORY.test(basename(directory));',
     'return dirname(directory).startsWith(tmpdir()) && CHROME_SINGLETON_DIRECTORY.test(basename(directory));',
     'any directory below the temp directory, or beside it with a longer name, is accepted'),
    ('guard-name-case-insensitive',
     'const CHROME_SINGLETON_DIRECTORY = /^\\.?(?:com\\.google\\.Chrome|org\\.chromium\\.Chromium)\\.[A-Za-z0-9]+$/;',
     'const CHROME_SINGLETON_DIRECTORY = /^\\.?(?:com\\.google\\.Chrome|org\\.chromium\\.Chromium)\\.[A-Za-z0-9]+$/i;',
     'the name is matched without case'),
    ('readlink-failure-propagates',
     "  try { directory = dirname(readlinkSync(join(profile, 'SingletonSocket'))); }\n  catch { return undefined; }\n",
     "  directory = dirname(readlinkSync(join(profile, 'SingletonSocket')));\n",
     'a profile with no link fails the removal'),
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


original = SOURCE.read_bytes()
original_sha = sha(SOURCE)
head = subprocess.run(['git', '-C', str(clone), 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
results = []
for index, (mid, old, new, meaning) in enumerate(MUTANTS):
    record = {'id': mid, 'meaning': meaning, 'file': str(SOURCE.relative_to(clone)), 'old': old, 'new': new, 'attempts': []}
    if old is not None:
        text = original.decode()
        count = text.count(old)
        if count != 1:
            record['outcome'] = f'NOT-APPLIED ({count} occurrences)'
            results.append(record)
            continue
        SOURCE.write_text(text.replace(old, new))
    try:
        for attempt in range(1, 4):
            tmp = pathlib.Path(f'/tmp/r515-m{index}-{attempt}')
            shutil.rmtree(tmp, ignore_errors=True)
            tmp.mkdir()
            report_path = out.parent / f'm{index}-{attempt}.report.json'
            env = dict(os.environ, TMPDIR=str(tmp))
            proc = subprocess.run(['npx', 'vitest', 'run', '--project', '@syzygy/three-surface-poc-app', *FILES,
                                   '--reporter=json', f'--outputFile={report_path}'],
                                  cwd=clone, env=env, capture_output=True, text=True, timeout=600)
            report = json.loads(report_path.read_text()) if report_path.exists() else {}
            report_path.unlink(missing_ok=True)
            failed = failing_tests(report)
            left = sorted(name for name in os.listdir(tmp) if name != 'node-compile-cache')
            shutil.rmtree(tmp, ignore_errors=True)
            real = [f for f in failed if not any(signature in f['firstErrorLine'] for signature in LOAD)]
            entry = {'attempt': attempt, 'exit': proc.returncode, 'testsRun': report.get('numTotalTests'),
                     'passed': report.get('numPassedTests'), 'failing': failed, 'left': left}
            record['attempts'].append(entry)
            if old is None:
                outcome = 'CONTROL-PASS' if proc.returncode == 0 and not left else ('CONTROL-FAIL' if real or left else 'INCONCLUSIVE-LOAD')
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
        SOURCE.write_bytes(original)
        record['restoredSha256'] = sha(SOURCE)
        record['restored'] = record['restoredSha256'] == original_sha
    results.append(record)
    print(mid, record['outcome'], [a['exit'] for a in record['attempts']], record['attempts'][-1]['left'] if record['attempts'] else None, flush=True)

out.write_text(json.dumps({'tool': 'my_mutants.py', 'treeCommit': head, 'sourceSha256AtCommit': original_sha,
                           'command': 'npx vitest run --project @syzygy/three-surface-poc-app ' + ' '.join(FILES),
                           'loadSignatures': LOAD, 'results': results}, indent=2) + '\n')
