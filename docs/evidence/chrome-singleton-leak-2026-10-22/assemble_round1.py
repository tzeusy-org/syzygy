#!/usr/bin/env python3
"""Write verification-round1-2026-10-25.json: the repair of round 1 of the PR 515 review, checked against the records.

Usage: assemble_round1.py <scratch-out> <evidence-dir> <worktree> <reviewed-commit> <code-commit> <main-commit> <raw-review.md>

<scratch-out> holds the outputs of this round's runs: mutants-cdp-r1.json (mutate_cdp_r1.py), browser-files-head-r1.json and
browser-files-head-chrome154-r1.json (browser_files_run.py), chrome-matrix-head-r1.json (chrome_matrix.py), test-lists-r1.json
(compare_test_lists.py) and the gate logs gate-typecheck.log, gate-governance.log, gate-quotations.log, gate-authority.log,
each ending in a line `exit <n>`. The five run records are copied to <evidence-dir> under dated names first.
<reviewed-commit> is the head the review read, <code-commit> the last commit that changes a file under apps/ or
vitest.config.ts, <main-commit> origin/main as merged. The raw review is hashed here and its verdict line read here.

Every figure is read from a record or computed from git; the table `findings` says, for each finding or note, what was
changed, which tests pin it (each name must occur in cdp-browser.test.ts, checked here) and which mutants of
mutants-cdp-r1 kill its predicate (each must be recorded `killed`, checked here). A missing test name, a mutant that
survived or an unexpected outcome stops the script instead of writing a record.
"""
import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import sys

DATE = '2026-10-25'
scratch, evidence, tree = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
reviewed, code, main, raw = sys.argv[4], sys.argv[5], sys.argv[6], pathlib.Path(sys.argv[7])
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
rev = lambda ref: git('rev-parse', ref).strip()

COPIES = (('mutants-cdp-r1', 'mutants-cdp-r1'), ('browser-files-head-r1', 'browser-files-head-r1'), ('browser-files-head-chrome154-r1', 'browser-files-head-chrome154-r1'),
          ('chrome-matrix-head-r1', 'chrome-matrix-head-r1'), ('test-lists-r1', 'test-lists-r1'))
for source, target in COPIES:
    shutil.copyfile(scratch / f'{source}.json', evidence / f'{target}-{DATE}.json')
load = lambda name: json.loads((evidence / f'{name}-{DATE}.json').read_text())
mut, files120, files154, matrix, lists = (load(n) for n in ('mutants-cdp-r1', 'browser-files-head-r1', 'browser-files-head-chrome154-r1', 'chrome-matrix-head-r1', 'test-lists-r1'))
outcome = {r['id']: r['outcome'] for r in mut['results']}
unit = (tree / 'apps/three-surface-poc/src/cdp-browser.test.ts').read_text()

# finding -> (what changed, the test names that pin it, the mutants that kill its predicate)
SINGLETON = 'Chrome singleton directory (syzygy-bpyt.4.11) '
FINDINGS = {
    'F1-fix-1': ('the four browser profile cleanup cases pass a path that does not exist in a private root each case makes and removes, not /tmp/syzygy-browser-profile', [],
                 ['read-failure-propagates']),
    'F1-fix-2': ('the profile and the link are read only when both are the running user\'s (lstat uid)',
                 ["keeps the directory a link names when the profile is not the running user's, as in a shared temp directory where another user made it first",
                  "keeps the directory a link names when the link is not the running user's",
                  "removes the directory a profile's link names when the profile and the link are the running user's, whatever removes the profile"],
                 ['profile-owner-not-checked', 'link-owner-not-checked', 'link-trusted-whoever-made-it']),
    'N1': ('launchBrowser records the directory\'s device and inode when it reads the link; the removal requires the same pair',
           ['keeps a directory made under the same name after the one that was read, as when Chrome exits cleanly and another Chrome follows', 'keeps a directory with the recorded inode number on another device'],
           ['identity-inode-not-compared', 'identity-device-not-compared', 'identity-not-compared']),
    'N2': ('three case variants join the near-miss names', ["keeps a directory whose name is not exactly Chrome's: another prefix, no suffix, a longer name, a symbol in the suffix"], ['name-case-insensitive']),
    'N3': ('the comments say 145 (cdp-browser.ts, cdp-browser.browser.test.ts); the unit test name is unchanged', [], []),
    'N4': ('browser_files_run.py writes sha256AtCommit; add_sha256_at_commit.py added it to the three browser-files records of 2026-10-22', [], []),
    'N5': ('the unreadable-directory case skips when run as root', ['does not fail the run when the singleton directory cannot be removed'], []),
    'N6': ('disclosed in the PR body as a residual; Chrome\'s spawn environment is unchanged', [], []),
    'N7': ('filed as syzygy-bpyt.4.21 (inject the clock in the drain-timeout case); not in this PR', [], []),
}
findings = {}
for key, (changed, tests, mutants) in FINDINGS.items():
    missing = [t for t in tests if f"'{t.replace(chr(39), chr(92) + chr(39))}'" not in unit and f'"{t}"' not in unit]
    assert not missing, f'{key}: test names not in cdp-browser.test.ts: {missing}'
    bad = {m: outcome.get(m) for m in mutants if outcome.get(m) != 'killed'}
    assert not bad, f'{key}: mutants not killed: {bad}'
    findings[key] = {'changed': changed, 'tests': tests, 'mutantsKilled': mutants}
assert mut['control']['holds'] and mut['controlLaunchFailure']['holds'], 'the mutant control must hold'
survivors = {k: v for k, v in outcome.items() if v != 'killed'}

# Assertions unchanged, against main: every line the change removes from a test file that main has (an import line is counted apart).
ASSERTION = re.compile(r'\bexpect\b|\bassert\b|\.to[A-Z]\w*\(|\.resolves\b|\.rejects\b')
MATCHER = re.compile(r'\.to[A-Z]\w*\(|\.resolves\b|\.rejects\b')
removed = {}
for f in (f for f in git('diff', '--name-only', main, code).splitlines() if f.endswith('.test.ts')):
    lines = [l[1:] for l in git('diff', '-U0', main, code, '--', f).splitlines() if l.startswith('-') and not l.startswith('---')]
    removed[f] = {'removedLines': len(lines), 'removedImportLines': sum(1 for l in lines if l.lstrip().startswith('import')),
                  'removedLinesNamingAnAssertion': sum(1 for l in lines if not l.lstrip().startswith('import') and ASSERTION.search(l)),
                  'removedLinesNamingAMatcher': sum(1 for l in lines if MATCHER.search(l)), 'removed': lines}
outside = [f for f in git('diff', '--name-only', main, code).splitlines() if not f.startswith('docs/evidence/chrome-singleton-leak-2026-10-22/')]

tools = sorted(p.name for p in evidence.iterdir() if p.suffix in ('.py', '.mjs'))
raw_text = raw.read_text().splitlines()
gates = {}
for key, name in (('typecheck', 'gate-typecheck.log'), ('checkGovernance', 'gate-governance.log'), ('checkQuotations', 'gate-quotations.log'), ('authoritySweep', 'gate-authority.log'),
                  ('unitAndRealChromeFiles', 'gate-two-files.log')):
    path = scratch / name
    lines = [l for l in path.read_text().splitlines() if l.strip()]
    exit_line = next((l for l in reversed(lines) if re.fullmatch(r'exit \d+', l)), None)
    gates[key] = {'log': name, 'exit': int(exit_line.split()[1]) if exit_line else None, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                  'resultLines': [l.strip() for l in lines if re.search(r'^\s*(Test Files|Tests)\s|\d+ OK, \d+ WARN|QC-1', l)]}
summary = lambda r: {k: r['summary'][k] for k in r['summary']}
verification = {
    'subject': {'review': {'file': raw.name, 'sha256': hashlib.sha256(raw.read_bytes()).hexdigest(), 'verdict': raw_text[1], 'reviewedCommit': rev(reviewed)},
                'codeCommit': rev(code), 'mainMerged': rev(main), 'headAtRecording': rev('HEAD'), 'gatesRunAtCommit': rev('HEAD'),
                'appsAndConfigDiffSinceCodeCommit': git('diff', '--stat', code, 'HEAD', '--', 'apps', 'vitest.config.ts', 'package.json').strip(),
                'sha256AtCommit': {f: hashlib.sha256(subprocess.run(['git', 'show', f'{code}:{f}'], cwd=tree, capture_output=True, check=True).stdout).hexdigest() for f in mut['sha256AtCommit']}},
    'toolDigests': {name: hashlib.sha256((evidence / name).read_bytes()).hexdigest() for name in tools},
    'findings': findings,
    'mutants': {'record': f'mutants-cdp-r1-{DATE}.json', 'treeCommit': mut['treeCommit'], 'total': mut['mutants'], 'killed': mut['killed'], 'notKilled': survivors,
                'outcomes': outcome, 'controlHolds': mut['control']['holds'], 'controlLaunchFailureHolds': mut['controlLaunchFailure']['holds'], 'browserVersion': mut['browserVersion']},
    'ac1': {'claim': 'after a passing run of every Chrome-driven vitest file with a fresh private TMPDIR, that TMPDIR holds no .com.google.Chrome.* or polaris-draft-browser-* directory',
            'chrome120': {'record': f'browser-files-head-r1-{DATE}.json', 'treeCommit': files120['treeCommit'], 'browserVersion': files120['browserVersion'], **summary(files120)},
            'chrome154': {'record': f'browser-files-head-chrome154-r1-{DATE}.json', 'treeCommit': files154['treeCommit'], 'browserVersion': files154['browserVersion'], **summary(files154)},
            'matrix': {'record': f'chrome-matrix-head-r1-{DATE}.json', 'treeCommit': matrix['treeCommit'], 'holds': matrix['holds'],
                       'runs': [{'version': r['version'], 'status': r['status'], 'singletonShapedLeft': len(r['singletonShapedLeft'])} for r in matrix['rows']]}},
    'tests': {'record': f'test-lists-r1-{DATE}.json', 'testsLine': lists['testsLine'], 'baseTree': lists['baseTree'], 'headTree': lists['headTree'], 'baseLines': lists['baseLines'], 'headLines': lists['headLines'],
              'addedByFile': lists['addedByFile'], 'removedByFile': lists['removedByFile']},
    'changedOutsideTheEvidenceDirectory': outside,
    'ac3': {'claim': 'no existing assertion changes (against main as merged)', 'changedTestFiles': removed,
            'note': 'the lines of cdp-browser.test.ts that name `expect` are the two `expect(() => removeBrowserProfile(<profile>, {` openings whose first argument changed from /tmp/syzygy-browser-profile to a path in a private root (F1 fix 1); the matcher lines below them (`.toThrow(...)`) are not removed, so no matcher and no expected value changes'},
    'gates': gates,
    'residuals': {
        'N6': 'when TMPDIR is unset and TMP or TEMP is set, Node\'s os.tmpdir() and Chrome\'s temp directory disagree, the parent check fails closed and a killed Chrome\'s directory is left in /tmp as at the base; Chrome\'s spawn environment is not changed',
        'N7': 'a load flake in the untouched unit case "waits for private Chrome group members before removal and retains the profile on drain timeout" (real clock, 100 ms drain); syzygy-bpyt.4.21',
        'inodeReuse': 'the identity pair cannot tell a directory from a later one if the file system reuses the inode number and the device is the same and another process makes the same 6-character name in the same window',
        'lstatRemoveWindow': 'between the removal\'s lstat and its rmSync the directory can still be replaced; a replacement by a link removes the link only (the reviewer\'s run 12), a replacement by a directory is not detected',
    },
}
(evidence / f'verification-round1-{DATE}.json').write_text(json.dumps(verification, indent=1) + '\n')
print(json.dumps({'tests': lists['testsLine'], 'mutants': f"{mut['killed']}/{mut['mutants']}", 'notKilled': survivors, 'gates': {k: v['exit'] for k, v in gates.items()},
                  'ac1': {'120': files120['summary']['everyFilePassedAloneAndLeftNone'], '154': files154['summary']['everyFilePassedAloneAndLeftNone'], 'matrix': matrix['holds']}}, indent=1))
