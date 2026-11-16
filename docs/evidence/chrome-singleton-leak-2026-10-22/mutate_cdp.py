#!/usr/bin/env python3
"""Rule-6 run for the Chrome singleton directory removal and the draft-preview launch.

Usage: mutate_cdp.py <worktree> <out.json> <private-tmpdir>

Each mutant is a list of (file, old, new) edits. The suites run ALONE under a private TMPDIR, and every edited file
is restored byte for byte afterwards. A control (the unmutated tree) runs first and must pass and leave no Chrome
directory. A fragment that does not occur exactly once in its file is recorded as FRAGMENT-COUNT-n and never guessed.

Two kinds of mutant, each with its own kill criterion:
  `tests`   killed when the run exits non-zero. The run is `cdp-browser.test.ts` (unit, fake directories) and
            `cdp-browser.browser.test.ts` (a real Chrome whose leader is made to miss its close grace and be killed);
            the failing tests and their first error lines are recorded.
  `leak`    killed when a failed browser launch leaves `polaris-draft-browser-*` behind: `draft-preview.browser.test.ts`
            runs with SYZYGY_POC_BROWSER=/bin/false, so the launch throws and the test fails by design. The criterion
            is the directory, not the exit code (see launch_failure_probe.py).

Host load is not a kill. The host this runs on is loaded (average 75-100), and a real-Chrome case can fail for that alone:
`closeDisposableBrowser` throws "private browser profile drain did not verify two empty scans before deadline" when its 3 s
drain misses, and a case can time out. A failing test whose first error line carries one of LOAD_SIGNATURES is a load
failure; a `tests` run is scored `killed` only when a failing test has some other first error line, `SURVIVED` only when
the run exits 0, and a run whose every failure is a load failure is run again, up to ATTEMPTS times, and scored
`INCONCLUSIVE-LOAD` if none decides. A run that fails with no failing test (a compile or collection error: a mutant that
does not load) is `ERROR-NO-FAILING-TEST`, never a kill. The control gets the same retries; every attempt is recorded.

Records, per mutant: the edits (old and new fragments), the command, the commit the run was made at, every attempt, and the outcome.
The edited files and the suites must be committed before the run.
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

WT, OUT, PRIVATE_TMP = pathlib.Path(sys.argv[1]).resolve(), pathlib.Path(sys.argv[2]).resolve(), pathlib.Path(sys.argv[3]).resolve()
CDP = 'apps/three-surface-poc/src/cdp-browser.ts'
DRAFT = 'apps/three-surface-poc/src/polaris-generation/draft-preview.browser.test.ts'
TESTS = ['apps/three-surface-poc/src/cdp-browser.test.ts', 'apps/three-surface-poc/src/cdp-browser.browser.test.ts']
PROJECT = '@syzygy/three-surface-poc-app'
ATTEMPTS = 3
LOAD_SIGNATURES = ('drain did not verify', 'still held by', 'timed out', 'STACK_TRACE_ERROR')
REGEX = r"const CHROME_SINGLETON_DIRECTORY = /^\.?(?:com\.google\.Chrome|org\.chromium\.Chromium)\.[A-Za-z0-9]+$/;"
CHROME_NAME = re.compile(r'^\.?(com\.google\.Chrome|org\.chromium\.Chromium)\.')  # a leftover directory of Chrome's, dotted (Chrome 120) or not (147 and later)
READ = '  const singleton = options.singleton ?? chromeSingletonDirectory(profile);\n'
REMOVE_PROFILE = '  removeTemporaryDirectory(profile, options);\n'
REMOVAL = '  if (singleton !== undefined) removeChromeSingletonDirectory(singleton);\n'
GUARD = 'if (entry.isDirectory() && (user === undefined || entry.uid === user)) rmSync('
REMOVE_TRY = ("  try {\n    const entry = lstatSync(directory);\n    const user = process.getuid?.();\n"
              "    if (entry.isDirectory() && (user === undefined || entry.uid === user)) rmSync(directory, { recursive: true, force: true });\n"
              "  } catch { /* left for the temp directory's owner */ }\n")
DRAFT_EDITS = [  # the three edits that put the launch inside the try, reversed: (head text, text before the fix)
    ("import { findBrowserExecutable, launchBrowser, type Browser } from '../cdp-browser.js';",
     "import { findBrowserExecutable, launchBrowser } from '../cdp-browser.js';"),
    ("  // The launch is inside the try: a launch that fails still removes the directory (syzygy-bpyt.4.11).\n  let browser: Browser | undefined;\n  try {\n    browser = await launchBrowser(executable);\n",
     "  const browser = await launchBrowser(executable);\n  try {\n"),
    ("  } finally {\n    try { await browser?.close(); }\n    finally { await rm(directory, { recursive: true, force: true }); }\n  }\n",
     "  } finally { await browser.close(); await rm(directory, { recursive: true, force: true }); }\n"),
]

MUTANTS = [
    ('singleton-option-ignored', 'tests', 'the directory read while Chrome ran is not used: only the link is read, at removal, when Chrome has already unlinked it',
     [(CDP, READ, '  const singleton = chromeSingletonDirectory(profile);\n')]),
    ('link-not-read-at-removal', 'tests', 'only the directory read while Chrome ran is used: a Chrome killed before it announced itself leaves its directory',
     [(CDP, READ, '  const singleton = options.singleton;\n')]),
    ('link-read-after-profile-removed', 'tests', 'the link is read after the profile that holds it is gone',
     [(CDP, READ + REMOVE_PROFILE, REMOVE_PROFILE + READ)]),
    ('singleton-never-removed', 'tests', 'the removal call is dropped: the behavior before syzygy-bpyt.4.11',
     [(CDP, REMOVAL, '  if (singleton !== undefined) void singleton;\n')]),
    ('profile-not-removed', 'tests', 'the profile removal is skipped',
     [(CDP, REMOVE_PROFILE, '  void options;\n')]),
    ('parent-not-checked', 'tests', 'a directory with Chrome\'s name anywhere is removed, not only directly under the temp directory',
     [(CDP, 'return dirname(directory) === tmpdir() && CHROME_SINGLETON_DIRECTORY.test(basename(directory));', 'return CHROME_SINGLETON_DIRECTORY.test(basename(directory));')]),
    ('name-not-checked', 'tests', 'any directory directly under the temp directory is removed',
     [(CDP, 'return dirname(directory) === tmpdir() && CHROME_SINGLETON_DIRECTORY.test(basename(directory));', 'return dirname(directory) === tmpdir();')]),
    ('name-anchor-dropped', 'tests', 'Chrome\'s prefix may sit inside a longer name',
     [(CDP, REGEX, REGEX.replace('= /^\\.', '= /\\.'))]),
    ('name-suffix-unrestricted', 'tests', 'any suffix after the prefix, symbols included',
     [(CDP, REGEX, REGEX.replace('[A-Za-z0-9]+$', '.*$'))]),
    ('leading-dot-required', 'tests', 'the pattern needs the leading dot again: the pre-fix behavior, which leaves the directory a Chrome 147 or later makes (hosted run 39768592736)',
     [(CDP, REGEX, REGEX.replace('/^\\.?(?:', '/^\\.(?:'))]),
    ('leading-dot-forbidden', 'tests', 'the pattern takes no leading dot: the dotted name of Chrome 120 is no longer removed',
     [(CDP, REGEX, REGEX.replace('/^\\.?(?:', '/^(?:'))]),
    ('leading-dot-repeatable', 'tests', 'any number of leading dots: a name with two dots is removed',
     [(CDP, REGEX, REGEX.replace('/^\\.?(?:', '/^\\.*(?:'))]),
    ('leading-character-any', 'tests', 'the optional leading character is any character, not a dot: a name with a letter before Chrome\'s prefix is removed',
     [(CDP, REGEX, REGEX.replace('/^\\.?(?:', '/^.?(?:'))]),
    ('chromium-form-dropped', 'tests', 'the Chromium form of the name is not removed',
     [(CDP, REGEX, REGEX.replace('(?:com\\.google\\.Chrome|org\\.chromium\\.Chromium)', '(?:com\\.google\\.Chrome)'))]),
    ('stat-follows-links', 'tests', 'a link to a directory is judged by its target',
     [(CDP, 'const entry = lstatSync(directory);', 'const entry = statSync(directory);')]),
    ('is-directory-guard-dropped', 'tests', 'a plain file or a link with Chrome\'s name is removed too',
     [(CDP, GUARD, 'if (user === undefined || entry.uid === user) rmSync(')]),
    ('uid-guard-dropped', 'tests', 'a directory of another user is entered and removed',
     [(CDP, GUARD, 'if (entry.isDirectory()) rmSync(')]),
    ('removal-failure-propagates', 'tests', 'a singleton directory that cannot be removed fails the run that closes the browser',
     [(CDP, REMOVE_TRY, "  const entry = lstatSync(directory);\n  const user = process.getuid?.();\n  if (entry.isDirectory() && (user === undefined || entry.uid === user)) rmSync(directory, { recursive: true, force: true });\n")]),
    ('singleton-not-read-while-running', 'tests', 'launchBrowser never reads the directory while Chrome runs',
     [(CDP, '  singleton = chromeSingletonDirectory(profile);\n', '')]),
    ('cleanup-not-passed-on-close', 'tests', 'browser.close() removes the profile as before, without the singleton directory it read',
     [(CDP, "      await closeDisposableBrowser(connection, child, profile, group, cleanup);\n    },", "      await closeDisposableBrowser(connection, child, profile, group);\n    },")]),
    ('draft-preview-launch-outside-try', 'leak', 'the draft-preview test launches its browser before its try: a failed launch skips the removal of its directory',
     [(DRAFT, head, before) for head, before in DRAFT_EDITS]),
]

run = lambda *a: subprocess.run(a, cwd=WT, capture_output=True, text=True, check=True).stdout.strip()
commit = run('git', 'rev-parse', 'HEAD')
FILES = sorted({f for _, _, _, edits in MUTANTS for f, _, _ in edits} | set(TESTS))
dirty = run('git', 'status', '--porcelain', '--', *FILES)
assert dirty == '', f'{FILES} must be committed before a rule-6 run: {dirty}'
originals = {name: (WT / name).read_text() for name in FILES}
digests = {name: hashlib.sha256(text.encode()).hexdigest() for name, text in originals.items()}
report = pathlib.Path(tempfile.mkdtemp(prefix='zz-mutate-cdp-')) / 'report.json'  # removed in the final `finally`


def vitest(files: list[str], extra_env: dict) -> tuple[int, int, list[dict], list[str]]:
    shutil.rmtree(PRIVATE_TMP, ignore_errors=True)
    PRIVATE_TMP.mkdir(parents=True)
    report.unlink(missing_ok=True)
    command = ['npx', 'vitest', 'run', *files, '--project', PROJECT, '--reporter=json', f'--outputFile={report}']
    proc = subprocess.run(command, cwd=WT, capture_output=True, text=True, env={**os.environ, 'TMPDIR': str(PRIVATE_TMP), **extra_env}, timeout=1200)
    data = json.loads(report.read_text()) if report.exists() else {'testResults': []}
    cases = [a for suite in data['testResults'] for a in suite['assertionResults']]
    failing = [{'test': a['fullName'], 'firstErrorLine': (a['failureMessages'][0].splitlines() or [''])[0] if a['failureMessages'] else ''} for a in cases if a['status'] == 'failed']
    left = sorted(p.name for p in PRIVATE_TMP.iterdir() if p.name != 'node-compile-cache')
    return proc.returncode, len(cases), failing, left


def classify(exit_code: int, failing: list[dict]) -> str:
    if exit_code == 0:
        return 'passed'
    if not failing:
        return 'no-failing-test'
    return 'failed' if any(not any(sig in f['firstErrorLine'] for sig in LOAD_SIGNATURES) for f in failing) else 'load'


def decide(files: list[str], extra_env: dict) -> tuple[str, int, int, list[dict], list[str], list[dict]]:
    """Runs until the status is not `load`, at most ATTEMPTS times; returns the last run and every attempt."""
    attempts = []
    for attempt in range(1, ATTEMPTS + 1):
        exit_code, total, failing, left = vitest(files, extra_env)
        status = classify(exit_code, failing)
        attempts.append({'attempt': attempt, 'exit': exit_code, 'status': status, 'testsRun': total, 'failing': failing, 'left': left})
        if status != 'load':
            break
    return status, exit_code, total, failing, left, attempts


results = []
control = {}
try:
    status, exit_code, total, failing, left, attempts = decide(TESTS, {})
    chrome_left = [n for n in left if CHROME_NAME.match(n)]
    control = {'command': 'npx vitest run ' + ' '.join(TESTS) + ' --project ' + PROJECT, 'exit': exit_code, 'testsRun': total, 'failing': failing, 'left': left, 'attempts': attempts,
               'holds': exit_code == 0 and total > 0 and not chrome_left}
    print('control tests', control['holds'], total, left, flush=True)
    assert control['holds'], 'the unmutated tree must pass both suites and leave no Chrome directory'
    exit_code, total, failing, left = vitest([DRAFT], {'SYZYGY_POC_BROWSER': '/bin/false'})
    control_leak = {'command': 'SYZYGY_POC_BROWSER=/bin/false npx vitest run ' + DRAFT + ' --project ' + PROJECT, 'exit': exit_code, 'testsRun': total, 'failing': failing, 'left': left,
                    'draftPreviewDirectoriesLeft': sum(1 for n in left if n.startswith('polaris-draft-browser-'))}
    control_leak['holds'] = exit_code != 0 and bool(failing) and control_leak['draftPreviewDirectoriesLeft'] == 0
    print('control leak', control_leak['holds'], left, flush=True)
    assert control_leak['holds'], 'the unmutated draft-preview test must fail on the launch and leave no directory'
    for name, kind, meaning, edits in MUTANTS:
        record = {'id': name, 'kind': kind, 'meaning': meaning, 'edits': [{'file': f, 'old': old, 'new': new} for f, old, new in edits]}
        counts = [originals[f].count(old) for f, old, _ in edits]
        if any(c != 1 for c in counts):
            results.append(record | {'outcome': 'FRAGMENT-COUNT-' + '/'.join(map(str, counts))})
            print(name, results[-1]['outcome'], flush=True)
            continue
        try:
            for f, old, new in edits:
                (WT / f).write_text((WT / f).read_text().replace(old, new, 1))
            if kind == 'tests':
                status, exit_code, total, failing, left, attempts = decide(TESTS, {})
                outcome = {'failed': 'killed', 'passed': 'SURVIVED', 'load': 'INCONCLUSIVE-LOAD', 'no-failing-test': 'ERROR-NO-FAILING-TEST'}[status]
                killed = status == 'failed'
                extra = {'attempts': attempts}
            else:
                exit_code, total, failing, left = vitest([DRAFT], {'SYZYGY_POC_BROWSER': '/bin/false'})
                draft_left = sum(1 for n in left if n.startswith('polaris-draft-browser-'))
                killed = draft_left > 0
                outcome = 'killed' if killed else 'SURVIVED'
                extra = {'draftPreviewDirectoriesLeft': draft_left}
        finally:
            for f in {f for f, _, _ in edits}:
                (WT / f).write_text(originals[f])
        results.append(record | {'exit': exit_code, 'outcome': outcome, 'testsRun': total, 'failing': failing, 'left': left} | extra)
        print(name, results[-1]['outcome'], len(failing), flush=True)
finally:
    for name, text in originals.items():
        (WT / name).write_text(text)
    shutil.rmtree(PRIVATE_TMP, ignore_errors=True)
    shutil.rmtree(report.parent, ignore_errors=True)
for name, text in originals.items():
    assert hashlib.sha256((WT / name).read_bytes()).hexdigest() == digests[name], f'{name} not restored'
browser = os.environ.get('SYZYGY_POC_BROWSER') or shutil.which('google-chrome') or 'google-chrome'  # what findBrowserExecutable finds
browser_version = subprocess.run([browser, '--version'], capture_output=True, text=True).stdout.strip()
record = {'tool': 'mutate_cdp.py', 'treeCommit': commit, 'sha256AtCommit': digests, 'browserExecutable': browser, 'browserVersion': browser_version, 'project': PROJECT, 'control': control, 'controlLaunchFailure': control_leak,
          'mutants': len(MUTANTS), 'killed': sum(1 for r in results if r['outcome'] == 'killed'), 'results': results}
OUT.write_text(json.dumps(record, indent=1) + '\n')
print('killed', record['killed'], 'of', record['mutants'])
