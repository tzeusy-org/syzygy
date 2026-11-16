#!/usr/bin/env python3
"""What does a passing run of every Chrome-driven test file leave in a fresh private TMPDIR?

Usage: browser_files_run.py <worktree> <tree-commit> <out.json> <private-parent> <label>

The Chrome-driven files are found by two methods and both lists are recorded:
  A. test files under apps/three-surface-poc/src that name `launchBrowser`, `findBrowserExecutable` or
     `withBrowserPage` (`git grep -l -E`); the file that only fakes the browser (cdp-browser.test.ts) is
     in this list and is run too, as it passes the fake through the same helper;
  B. the `*.browser.test.ts` files.
List A is run. Each file runs ALONE (`npx vitest run <file> --project @syzygy/three-surface-poc-app`) in a fresh
TMPDIR under <private-parent>, up to ATTEMPTS times until one attempt exits 0, because the host this runs on is
loaded and a Chrome-driven test can time out for that alone; every attempt is recorded, with its failing tests'
first error lines and what the TMPDIR held afterwards. The criterion is on the passing attempt: no
`.com.google.Chrome.*` (or Chromium's `.org.chromium.Chromium.*`) and no `polaris-draft-browser-*` directory.
After the per-file runs, ALL files run once together in one fresh TMPDIR, as a suite would, and that run is
recorded as it ended, passing or not.

<label> (`base` or `head`) only names the record; the worktree decides which sources run. The sources are not edited.
The record carries `sha256AtCommit`, the digest of each of the four code files of syzygy-bpyt.4.11 as <tree-commit> holds
it (`git show <tree-commit>:<path>`), so a rebase or squash that re-hashes the commit does not cut the record from the
bytes it ran (rule 11).
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

WT, COMMIT, OUT, PARENT, LABEL = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]).resolve(), pathlib.Path(sys.argv[4]).resolve(), sys.argv[5]
ATTEMPTS = 3
PROJECT = '@syzygy/three-surface-poc-app'
git = lambda *a: subprocess.run(['git', *a], cwd=WT, capture_output=True, text=True, check=True).stdout.strip()
CODE_FILES = ['apps/three-surface-poc/src/cdp-browser.ts', 'apps/three-surface-poc/src/cdp-browser.test.ts', 'apps/three-surface-poc/src/cdp-browser.browser.test.ts',
              'apps/three-surface-poc/src/polaris-generation/draft-preview.browser.test.ts']
digest_at = lambda path: hashlib.sha256(subprocess.run(['git', 'show', f'{COMMIT}:{path}'], cwd=WT, capture_output=True, check=True).stdout).hexdigest()
assert git('rev-parse', 'HEAD') == git('rev-parse', COMMIT), 'the worktree must be at <tree-commit>'
assert git('status', '--porcelain', '--', 'apps', 'packages', 'vitest.config.ts') == '', 'the tree must be committed'

list_a = sorted(set(git('grep', '-l', '-E', 'launchBrowser|findBrowserExecutable|withBrowserPage', '--', 'apps/three-surface-poc/src/*.test.ts').splitlines()))
list_b = sorted(set(git('ls-files', 'apps/three-surface-poc/src/*.browser.test.ts').splitlines()))
chrome = re.compile(r'^\.?(com\.google\.Chrome|org\.chromium\.Chromium)\.')


def classify(directory: pathlib.Path) -> dict:
    names = sorted(p.name for p in directory.iterdir() if p.name != 'node-compile-cache')
    return {'entries': names, 'chromeSingletonDirectories': sum(1 for n in names if chrome.match(n)),
            'draftPreviewDirectories': sum(1 for n in names if n.startswith('polaris-draft-browser-')),
            'browserProfiles': sum(1 for n in names if n.startswith('syzygy-poc-browser-')),
            'other': [n for n in names if not chrome.match(n) and not n.startswith(('polaris-draft-browser-', 'syzygy-poc-browser-'))]}


def run(files: list[str], tmp: pathlib.Path) -> dict:
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    report = pathlib.Path(tempfile.mkdtemp(prefix='zz-browser-files-')) / 'report.json'
    try:
        proc = subprocess.run(['npx', 'vitest', 'run', *files, '--project', PROJECT, '--reporter=json', f'--outputFile={report}'], cwd=WT, capture_output=True, text=True,
                              env={**os.environ, 'TMPDIR': str(tmp)}, timeout=1800)
        data = json.loads(report.read_text()) if report.exists() else {'testResults': []}
    finally:
        shutil.rmtree(report.parent, ignore_errors=True)
    cases = [a for suite in data['testResults'] for a in suite['assertionResults']]
    failing = [{'test': a['fullName'], 'firstErrorLine': (a['failureMessages'][0].splitlines() or [''])[0] if a['failureMessages'] else ''} for a in cases if a['status'] == 'failed']
    suite_failures = [{'file': s['name'].replace(str(WT) + '/', ''), 'message': (s.get('message') or '').splitlines()[:1]} for s in data['testResults'] if s['status'] == 'failed' and not s['assertionResults']]
    return {'exit': proc.returncode, 'tests': len(cases), 'passed': sum(1 for a in cases if a['status'] == 'passed'), 'skipped': sum(1 for a in cases if a['status'] in ('pending', 'skipped')),
            'failing': failing, 'suiteFailures': suite_failures, 'left': classify(tmp)}


per_file = []
for index, file in enumerate(list_a):
    attempts = []
    for attempt in range(1, ATTEMPTS + 1):
        result = run([file], PARENT / f'f{index}')
        attempts.append(result | {'attempt': attempt})
        print(file, attempt, 'exit', result['exit'], 'chrome dirs', result['left']['chromeSingletonDirectories'], flush=True)
        shutil.rmtree(PARENT / f'f{index}', ignore_errors=True)
        if result['exit'] == 0:
            break
    passing = next((a for a in attempts if a['exit'] == 0), None)
    per_file.append({'file': file, 'attempts': attempts, 'passed': passing is not None, 'testsOnPassingAttempt': passing['tests'] if passing else None,
                     'skippedOnPassingAttempt': passing['skipped'] if passing else None})
combined = run(list_a, PARENT / 'all')
shutil.rmtree(PARENT / 'all', ignore_errors=True)
shutil.rmtree(PARENT, ignore_errors=True)
left_on_passing = [{'file': f['file'], 'chromeSingletonDirectories': a['left']['chromeSingletonDirectories'], 'draftPreviewDirectories': a['left']['draftPreviewDirectories']}
                   for f in per_file for a in f['attempts'] if a['exit'] == 0]
summary = {
    'filesInListA': len(list_a), 'filesInListB': len(list_b), 'inAButNotB': sorted(set(list_a) - set(list_b)), 'inBButNotA': sorted(set(list_b) - set(list_a)),
    'filesWithAPassingAttempt': sum(1 for f in per_file if f['passed']),
    'chromeSingletonDirectoriesLeftOnPassingAttempts': sum(r['chromeSingletonDirectories'] for r in left_on_passing),
    'draftPreviewDirectoriesLeftOnPassingAttempts': sum(r['draftPreviewDirectories'] for r in left_on_passing),
    'combinedRunExit': combined['exit'], 'combinedRunChromeSingletonDirectoriesLeft': combined['left']['chromeSingletonDirectories'],
    'combinedRunDraftPreviewDirectoriesLeft': combined['left']['draftPreviewDirectories'],
}
summary['everyFilePassedAloneAndLeftNone'] = (summary['filesWithAPassingAttempt'] == len(list_a) and summary['chromeSingletonDirectoriesLeftOnPassingAttempts'] == 0
                                             and summary['draftPreviewDirectoriesLeftOnPassingAttempts'] == 0)
executable = os.environ.get('SYZYGY_POC_BROWSER') or 'google-chrome'  # what findBrowserExecutable finds: the variable, else the first on PATH
version = subprocess.run([executable, '--version'], capture_output=True, text=True).stdout.strip()
record = {'tool': 'browser_files_run.py', 'treeCommit': COMMIT, 'sha256AtCommit': {path: digest_at(path) for path in CODE_FILES}, 'label': LABEL, 'browserExecutable': executable, 'browserVersion': version, 'project': PROJECT, 'attemptsPerFile': ATTEMPTS, 'listA': list_a, 'listB': list_b,
          'perFile': per_file, 'combinedRun': combined, 'summary': summary}
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps(summary, indent=1))
