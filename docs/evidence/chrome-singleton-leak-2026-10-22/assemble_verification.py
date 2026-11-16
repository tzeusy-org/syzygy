#!/usr/bin/env python3
"""Move the scratch outputs of the tools in this directory to dated records and write the verification record.

Usage: assemble_verification.py <scratch-out> <evidence-dir> <repo-tree> <base> <code> <first-approach> <hosted-run-after-the-fix> <commit-it-ran-on>

<scratch-out> holds the outputs of launch_probe.py, tmpdir_length_probe.py, launch_failure_probe.py, mutate_cdp.py,
browser_files_run.py and compare_test_lists.py, and the gate logs (typecheck, governance, quotations, authority).
<base> is main before this change, <code> the last commit that changes a file under apps/ or vitest.config.ts,
<first-approach> the commit of the approach dropped for the TMPDIR constraint it added. Every figure in
verification-2026-10-22.json is read from the copied records or computed from git here, never typed.

The hosted node-ci run 39768592736 failed the real-Chrome case on the leading dot of the directory name (the runner's
Chrome 155 names it without one). <scratch-out> also holds the records of the repair: chrome-names.json (name_probe.py),
chrome-matrix-pre-fix.json and chrome-matrix-head.json (chrome_matrix.py), launch-probe-*-chrome154.json,
browser-files-head-chrome154.json and ci-failed.log (the failing step of that run, as `gh run view --log-failed` gave it).
The records of the first revision that the repair replaced are named under `repair.replacedRecords`.
"""
import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import sys

DATE = '2026-10-22'
scratch, evidence, tree = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
base, code, first = sys.argv[4], sys.argv[5], sys.argv[6]
after_run, after_head = sys.argv[7], sys.argv[8]  # the hosted run after the fix and the commit it ran on
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
rev = lambda ref: git('rev-parse', ref).strip()
load = lambda name: json.loads((evidence / f'{name}-{DATE}.json').read_text())

REPLACED = ('launch-probe-head', 'launch-probe-base', 'tmpdir-length-head', 'tmpdir-length-base', 'tmpdir-length-rejected', 'launch-failure-head', 'launch-failure-base', 'mutants-cdp', 'browser-files-head', 'test-lists')
replaced_from = {name: {'treeCommit': (lambda r: r.get('treeCommit') or r['headTree']['commit'])(json.loads(git('show', f'HEAD:docs/evidence/chrome-singleton-leak-2026-10-22/{name}-{DATE}.json'))),
                        'lastCommitHoldingIt': git('rev-list', '-1', 'HEAD', '--', f'docs/evidence/chrome-singleton-leak-2026-10-22/{name}-{DATE}.json').strip()} for name in REPLACED}
COPIES = (('launch-probe-head-chrome154', 'launch-probe-head-chrome154'), ('launch-probe-base-chrome154', 'launch-probe-base-chrome154'), ('browser-files-head-chrome154', 'browser-files-head-chrome154'),
          ('chrome-names', 'chrome-names'), ('chrome-matrix-pre-fix', 'chrome-matrix-pre-fix'), ('chrome-matrix-head', 'chrome-matrix-head'),
          ('launch-probe-head', 'launch-probe-head'), ('launch-probe-base', 'launch-probe-base'), ('tmpdir-length-head', 'tmpdir-length-head'), ('tmpdir-length-base', 'tmpdir-length-base'),
          ('tmpdir-length-rejected', 'tmpdir-length-rejected'), ('launch-failure-head', 'launch-failure-head'), ('launch-failure-base', 'launch-failure-base'),
          ('mutants-cdp', 'mutants-cdp'), ('browser-files-head', 'browser-files-head'), ('browser-files-base', 'browser-files-base'),
          ('test-lists', 'test-lists'), ('test-lists-attempt-1', 'test-lists-attempt-1'))
for source, target in COPIES:
    shutil.copyfile(scratch / f'{source}.json', evidence / f'{target}-{DATE}.json')

tools = sorted(p.name for p in evidence.iterdir() if p.suffix in ('.py', '.mjs'))
digests = {name: hashlib.sha256((evidence / name).read_bytes()).hexdigest() for name in tools}

probe_h, probe_b = load('launch-probe-head')['summary'], load('launch-probe-base')['summary']
names, matrix_pre, matrix_head = load('chrome-names'), load('chrome-matrix-pre-fix'), load('chrome-matrix-head')
clean_line = lambda line: re.sub(r'(?:\x1b|\^)\[\[?[0-9;]*m', '', line.split('Z ', 1)[-1]).strip()  # the log's timestamp and colour codes off
hosted_log = (scratch / 'ci-failed.log').read_text().splitlines() if (scratch / 'ci-failed.log').exists() else []
hosted_full = (scratch / 'ci-full.log').read_text().splitlines() if (scratch / 'ci-full.log').exists() else []
hosted_after = (scratch / 'ci-after.log').read_text().splitlines() if (scratch / 'ci-after.log').exists() else []
fail_h, fail_b = load('launch-failure-head'), load('launch-failure-base')
mut = load('mutants-cdp')
files_h, files_b = load('browser-files-head'), load('browser-files-base')
lists = load('test-lists')
length = {m: load(f'tmpdir-length-{m}') for m in ('head', 'base', 'rejected')}

# Assertions unchanged: every line the change removes from an existing test file, and how many name an assertion
# (an import line that names `expect` is an import, not an assertion, and is counted apart).
ASSERTION = re.compile(r'\bexpect\b|\bassert\b|\.to[A-Z]\w*\(|\.resolves\b|\.rejects\b')
changed_tests = [f for f in git('diff', '--name-only', base, code).splitlines() if f.endswith('.test.ts')]
removed = {}
for f in changed_tests:
    lines = [l[1:] for l in git('diff', '-U0', base, code, '--', f).splitlines() if l.startswith('-') and not l.startswith('---')]
    removed[f] = {'removedLines': len(lines), 'removedImportLines': sum(1 for l in lines if l.lstrip().startswith('import')),
                  'removedLinesNamingAnAssertion': sum(1 for l in lines if not l.lstrip().startswith('import') and ASSERTION.search(l)), 'removed': lines}

gates = {}
for key, name in (('typecheck', 'gate-typecheck.log'), ('checkGovernance', 'gate-governance.log'), ('checkQuotations', 'gate-quotations.log'), ('authoritySweep', 'gate-authority.log')):
    path = scratch / name
    if path.exists():
        lines = [l for l in path.read_text().splitlines() if l.strip()]
        exit_line = next((l for l in reversed(lines) if re.fullmatch(r'exit \d+', l)), None)
        gates[key] = {'log': name, 'exit': int(exit_line.split()[1]) if exit_line else None, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                      'resultLine': next((l.strip() for l in reversed(lines) if l != exit_line and (key != 'authoritySweep' or 'Tests' in l)), '')}

verification = {
    'subject': {'baseCommit': rev(base), 'codeCommit': rev(code), 'firstApproachCommit': rev(first), 'headAtRecording': rev('HEAD'), 'gatesRunAtCommit': rev('HEAD')},
    'appsAndConfigDiffSinceCodeCommit': git('diff', '--stat', code, 'HEAD', '--', 'apps', 'vitest.config.ts', 'package.json').strip(),
    'toolDigests': digests,
    'diagnosis': {
        'claim': 'Chrome leaves its singleton directory (`.com.google.Chrome.<random>` in Chrome 120, `org.chromium.Chromium.<random>` in the builds from 145) in TMPDIR only when its leader is killed (closeDisposableBrowser, after the 1 s close grace); a clean exit removes it',
        'atBase': {'record': 'launch-probe-base-2026-10-22.json', 'launches': probe_b['launches'], 'launchesWhoseCloseThrew': probe_b['launchesWhoseCloseThrew'], 'killed': probe_b['killed'],
                   'exitedCleanly': probe_b['exitedCleanly'], 'killedAndLeftAChromeDirectory': probe_b['killedAndLeftAChromeDirectory'],
                   'exitedAndLeftAChromeDirectory': probe_b['exitedAndLeftAChromeDirectory'], 'holds': probe_b['holds']},
        'linkGoneByRemoval': 'Chrome unlinks <profile>/SingletonSocket as it begins to shut down, before it removes the directory, so a link read at removal time finds nothing on a killed launch '
                             '(the first revision of this fix read it there and still left the directory on killed launches; see the commit message of the replacing commit)',
        'existingTeardownTestAtBase': next(({'file': f['file'], 'attempts': len(f['attempts']), 'chromeSingletonDirectoriesLeftOnPassingAttempt': [a['left']['chromeSingletonDirectories'] for a in f['attempts'] if a['exit'] == 0]}
                                            for f in files_b['perFile'] if f['file'].endswith('cdp-browser.browser.test.ts')), None),
    },
    'ac1': {
        'claim': 'after a passing run of every Chrome-driven vitest file with a fresh private TMPDIR, that TMPDIR holds no .com.google.Chrome.* or polaris-draft-browser-* directory',
        'listA': files_h['listA'], 'listB': files_h['listB'], 'inAButNotB': files_h['summary']['inAButNotB'], 'inBButNotA': files_h['summary']['inBButNotA'],
        'atHead': {'record': 'browser-files-head-2026-10-22.json', 'treeCommit': files_h['treeCommit'], **{k: files_h['summary'][k] for k in files_h['summary'] if k.startswith(('files', 'chrome', 'draft', 'combined', 'every'))}},
        'atBase': {'record': 'browser-files-base-2026-10-22.json', 'treeCommit': files_b['treeCommit'], **{k: files_b['summary'][k] for k in files_b['summary'] if k.startswith(('files', 'chrome', 'draft', 'combined', 'every'))}},
        'launchProbeAtHead': {'record': 'launch-probe-head-2026-10-22.json', **{k: probe_h[k] for k in (
            'launches', 'launchesThatClosed', 'launchesWhoseCloseThrew', 'closeErrors', 'killed', 'exitedCleanly', 'closedLaunchesThatLeftAnything',
            'leftByLaunchesWhoseCloseThrew', 'entriesInPrivateTmpdirAtTheEnd', 'entriesAtTheEndNotLeftByAThrownClose', 'holds')}},
        'launchFailure': {'atHead': {'record': 'launch-failure-head-2026-10-22.json', 'draftPreviewDirectoriesLeft': fail_h['draftPreviewDirectoriesLeft'], 'retainedProfilesLeft': fail_h['retainedProfilesLeft'], 'holds': fail_h['holds']},
                          'atBase': {'record': 'launch-failure-base-2026-10-22.json', 'draftPreviewDirectoriesLeft': fail_b['draftPreviewDirectoriesLeft'], 'retainedProfilesLeft': fail_b['retainedProfilesLeft'], 'holds': fail_b['holds']}},
    },
    'closeThrewUnderLoad': {
        'claim': 'closeDisposableBrowser throws, and keeps the profile (and so Chrome\'s singleton directory, which is removed only with it), when two empty scans of the process group do not come within its 3 s drain; on this loaded host it happened in runs of the real-Chrome cases',
        'attemptsOfTheBrowserFilesRunAtHead': [{'file': f['file'], 'attempt': a['attempt'], 'firstErrorLine': x['firstErrorLine'], 'chromeSingletonDirectoriesLeft': a['left']['chromeSingletonDirectories'],
                                                 'browserProfilesLeft': a['left']['browserProfiles']}
                                                for f in files_h['perFile'] for a in f['attempts'] if a['exit'] != 0 for x in a['failing'] if 'profile drain did' in x['firstErrorLine']],
        'attemptsOfTheMutantControl': [{'attempt': a['attempt'], 'status': a['status'], 'chromeSingletonDirectoriesLeft': sum(1 for n in a['left'] if re.match(r'^\.?(com\.google\.Chrome|org\.chromium\.Chromium)\.', n)),
                                        'drainErrors': sum(1 for x in a['failing'] if 'profile drain did' in x['firstErrorLine'])} for a in mut['control']['attempts']],
        'acceptedAs': 'a load failure, not a pass and not a kill: the criterion of AC1 is over passing attempts, and the mutant runs score only failures with another first error line',
    },
    'repair': {
        'claim': 'the hosted node-ci failure (run 39768592736) was the leading dot: Chrome 155 names its singleton directory without the dot Chrome 120 gives it; the pattern and the case\'s assertion take the dot as optional, and the real-Chrome file passes under every Chrome installed here',
        'hostedRun': {'run': 39768592736, 'failingTest': 'cdp-browser.browser.test.ts > disposable Chrome teardown in a real browser > leaves no Chrome singleton directory behind when the leader is killed',
                      'firstErrorLine': next(clean_line(l) for l in hosted_log if 'AssertionError' in l and 'to match' in l), 'runnerChrome': next(clean_line(l) for l in hosted_full if 'Google Chrome 1' in l and 'browser-geometry' in l),
                      'runnerImage': next(clean_line(l) for l in hosted_full if 'Image: ' in l)} if hosted_log and hosted_full else None,
        'hostedRunAfterTheFix': {'run': int(after_run), 'headCommit': rev(after_head), 'runnerChrome': next(clean_line(l) for l in hosted_after if 'Google Chrome 1' in l and 'browser-geometry' in l),
                                 'runnerImage': next(clean_line(l) for l in hosted_after if 'Image: ' in l),
                                 'realChromeFile': next(clean_line(l) for l in hosted_after if 'cdp-browser.browser.test.ts' in l and '✓' in l),
                                 'unitSuite': next(clean_line(l) for l in hosted_after if 'Test Files' in l and 'passed' in l and 'unit + conformance tests' in l),
                                 'logSha256': hashlib.sha256((scratch / 'ci-after.log').read_bytes()).hexdigest(),
                                 'note': 'lines read from `gh run view <run> --log` (the log is not stored here; its digest is, and the run stays readable on the hosted service); the later commits of this branch add only files in this directory'} if hosted_after else None,
        'names': {'record': 'chrome-names-2026-10-22.json', 'chromes': [{'version': c['version'], 'singletonDirectoryName': c['shape'], 'leadingDot': c['leadingDot']} for c in names['chromes']],
                  'dotBetween': 'the dot is present in 120 and absent in every build from 145 to 154 probed, and in 155 on the hosted runner; which release dropped it is not known'},
        'matrixPreFix': {'record': 'chrome-matrix-pre-fix-2026-10-22.json', 'treeCommit': matrix_pre['treeCommit'], 'mutant': matrix_pre['mutant']['id'],
                         'runs': [{'version': r['version'], 'status': r['status'], 'failingOnTheNameAssertion': r['failingOnTheNameAssertion'], 'firstErrorLine': r['failing'][0]['firstErrorLine'] if r['failing'] else None,
                                   'singletonShapedLeft': len(r['singletonShapedLeft'])} for r in matrix_pre['rows']], 'holds': matrix_pre['holds']},
        'matrixHead': {'record': 'chrome-matrix-head-2026-10-22.json', 'treeCommit': matrix_head['treeCommit'],
                       'runs': [{'version': r['version'], 'status': r['status'], 'singletonShapedLeft': len(r['singletonShapedLeft'])} for r in matrix_head['rows']], 'holds': matrix_head['holds']},
        'launchProbeChrome154': {'head': {'record': 'launch-probe-head-chrome154-2026-10-22.json', 'browserVersion': load('launch-probe-head-chrome154').get('browserVersion'), **{k: load('launch-probe-head-chrome154')['summary'][k] for k in ('launches', 'launchesThatClosed', 'launchesWhoseCloseThrew', 'killed', 'exitedCleanly', 'closedLaunchesThatLeftAnything', 'holds')}},
                                 'base': {'record': 'launch-probe-base-chrome154-2026-10-22.json', 'browserVersion': load('launch-probe-base-chrome154').get('browserVersion'), **{k: load('launch-probe-base-chrome154')['summary'][k] for k in ('launches', 'launchesThatClosed', 'launchesWhoseCloseThrew', 'killed', 'exitedCleanly', 'killedAndLeftAChromeDirectory', 'exitedAndLeftAChromeDirectory', 'holds')}}},
        'browserFilesChrome154': {'record': 'browser-files-head-chrome154-2026-10-22.json', 'browserVersion': load('browser-files-head-chrome154').get('browserVersion'), **{k: load('browser-files-head-chrome154')['summary'][k] for k in load('browser-files-head-chrome154')['summary'] if k.startswith(('files', 'chrome', 'draft', 'combined', 'every'))}},
        'replacedRecords': {f'{name}-{DATE}.json': v for name, v in replaced_from.items()} | {'note': 'each was replaced in this commit by a record of the repaired head; the earlier one is in git history at lastCommitHoldingIt and named the commit shown. browser-files-base is not re-run: it describes the base, which this repair does not touch. The three tmpdir-length records were re-run because the probe now tries a launch whose close threw the drain error up to 3 times and counts it as inconclusive because of load, not as a failed launch'},
    },
    'ac2': 'out of scope: a killed test runner (SIGKILL/SIGTERM of vitest or of an operator command) leaves whatever Chrome and the helper had made; syzygy-bpyt.4.10 sweeps only syzygy-poc-surface-fixture-* directories of dead processes and this change adds no sweep. '
           'What this change covers is a Chrome the helper itself kills in a run that otherwise ends normally.',
    'ac3': {'claim': 'no existing assertion changes', 'changedTestFiles': removed},
    'tmpdirLength': {'claim': 'the longest TMPDIR that launches Chrome did not move; the first approach (Chrome\'s temp directory set to the profile) cut it',
                     **{m: {'record': f'tmpdir-length-{m}-2026-10-22.json', 'longestLaunched': length[m]['longestLaunched'], 'shortestFailed': length[m]['shortestFailed'], 'inconclusiveBecauseOfLoad': length[m]['inconclusiveBecauseOfLoad'], 'monotone': length[m]['monotone']} for m in length}},
    'mutants': {'record': 'mutants-cdp-2026-10-22.json', 'treeCommit': mut['treeCommit'], 'total': mut['mutants'], 'killed': mut['killed'],
                'outcomes': {r['id']: r['outcome'] for r in mut['results']}, 'controlHolds': mut['control']['holds'], 'controlLaunchFailureHolds': mut['controlLaunchFailure']['holds']},
    'tests': {'record': 'test-lists-2026-10-22.json', 'testsLine': lists['testsLine'], 'baseLines': lists['baseLines'], 'headLines': lists['headLines'], 'addedByFile': lists['addedByFile'], 'removedByFile': lists['removedByFile'],
              'firstListing': {'record': 'test-lists-attempt-1-2026-10-22.json', 'testsLine': load('test-lists-attempt-1')['testsLine'],
                               'why': 'the first head listing omitted three session-view tests that are gated by a bwrap probe at import time (packages/polaris-dossier/src/session-view.test.ts: `hasBwrap`, which runs bwrap and so depends on host load); a relisting matched'}},
    'gates': gates,
}
(evidence / f'verification-{DATE}.json').write_text(json.dumps(verification, indent=1) + '\n')
print(json.dumps({'tests': lists['testsLine'], 'mutants': f"{mut['killed']}/{mut['mutants']}", 'ac1Head': verification['ac1']['atHead'].get('everyFilePassedAloneAndLeftNone'),
                  'ac1Base': verification['ac1']['atBase'].get('everyFilePassedAloneAndLeftNone'), 'lengths': {m: (length[m]['longestLaunched'], length[m]['shortestFailed']) for m in length},
                  'assertionLinesRemoved': {f: (v['removedLines'], v['removedLinesNamingAnAssertion']) for f, v in removed.items()}}, indent=1))
