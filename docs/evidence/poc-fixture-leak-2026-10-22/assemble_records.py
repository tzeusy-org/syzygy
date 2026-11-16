#!/usr/bin/env python3
"""Move the scratch outputs of the tools in this directory into dated records.

Usage: assemble_records.py <scratch-out> <evidence-dir> <repo-tree> <base> <main> <code> <first-record-commit> <full-run-tmpdir> <round2-scratch> <round2-code> <round2-head>

Copies the scratch outputs of the tools in this directory (and of compare_test_lists.py) to their
dated names, and writes two records:
  diagnosis-2026-10-22.json     the record of the first revision of this branch (read from
                                <first-record-commit>), with the records of the per-file hook it
                                dropped taken out and the final code commit's scan added
  verification-2026-10-22.json  the figures of the acceptance criteria, read from the copied records
                                and the gate logs in <scratch-out>, never typed
<full-run-tmpdir> is the private TMPDIR of the full-suite run; its listing is read here, so the
directory must still exist. <base> is main before this change, <main> the origin/main merged into
the branch, <code> the commit of test-model-fixture.ts and its test.

Review round 2 (F5, N7 to N11) changed fixture-directories.ts and its test: <round2-code> is the last commit that
changes a file under apps/, packages/ or vitest.config.ts, <round2-head> the commit the round-2 runs were made at
(the tools' own commits follow <round2-code> and touch nothing the runs execute), and <round2-scratch> holds their
outputs (the guard and namespace probes, the 27-mutant run, the SIGKILL run and its sweep-disabled mutant, the clean
run, the CLI probes, the TERM interrupt probe, the test lists and the gate logs). The records of <code> that the round-2
change does not reach stay as recorded, and the verification record says which and why.
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
base, main, code, first, full_tmp = sys.argv[4], sys.argv[5], sys.argv[6], sys.argv[7], pathlib.Path(sys.argv[8])
r2, code2, head2 = pathlib.Path(sys.argv[9]), sys.argv[10], sys.argv[11]
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()
rev = lambda ref: git('rev-parse', ref)
load = lambda name: json.loads((evidence / name).read_text())
lines_of = lambda name, *starts: [line.strip() for line in (scratch / name).read_text().splitlines() if line.strip().startswith(starts)]
earlier = lambda path: json.loads(git('show', f'{first}:docs/evidence/poc-fixture-leak-2026-10-22/{path}'))

REPLACED = ('clean-run-head', 'kill-then-fresh-run-head', 'kill-then-fresh-run-sweep-disabled', 'interrupt-term-head', 'mutants-sweep', 'cli-sweep-probe-head', 'cli-sweep-probe-mutant', 'test-lists')
def _replaced() -> dict:
    """The records this pass replaced, as the commit before the pass held them. A second pass over the same inputs (the gate results added after the first) reads them back from the verification record already committed, whose HEAD now holds the new records."""
    try:
        committed = json.loads(git('show', f'HEAD:docs/evidence/poc-fixture-leak-2026-10-22/verification-{DATE}.json')).get('round2', {}).get('replacedRecords')
    except subprocess.CalledProcessError:
        committed = None
    if committed:
        return {key.removesuffix(f'-{DATE}.json'): value for key, value in committed.items() if key != 'note'}
    return {name: {'treeCommit': (lambda r: r.get('treeCommit') or r['headTree'])(json.loads(git('show', f'HEAD:docs/evidence/poc-fixture-leak-2026-10-22/{name}-{DATE}.json'))),
                        'lastCommitHoldingIt': git('rev-list', '-1', 'HEAD', '--', f'docs/evidence/poc-fixture-leak-2026-10-22/{name}-{DATE}.json')} for name in REPLACED}


replaced_from = _replaced()
for source, target in (('b-drain-scan-head.json', 'drain-scan'), ('b-leak-by-file-head.json', 'leak-by-file-head'), ('b-term-then-fresh-run-head.json', 'term-then-fresh-run-head'),
                       ('interrupt-term-base.json', 'interrupt-term-base')):
    shutil.copyfile(scratch / source, evidence / f'{target}-{DATE}.json')
for source, target in (('clean-run-head.json', 'clean-run-head'), ('kill-then-fresh-run-head.json', 'kill-then-fresh-run-head'),
                       ('kill-then-fresh-run-sweep-disabled.json', 'kill-then-fresh-run-sweep-disabled'), ('interrupt-term-head.json', 'interrupt-term-head'),
                       ('mutants.json', 'mutants-sweep'), ('cli-probe-head.json', 'cli-sweep-probe-head'), ('cli-probe-mutant.json', 'cli-sweep-probe-mutant'),
                       ('guard-probe.json', 'guard-probe'), ('ns-head.json', 'ns-sandbox-probe-head'), ('ns-mutant.json', 'ns-sandbox-probe-mutant'),
                       ('orphans-kill-runs.json', 'orphan-census-kill-runs'), ('orphans-interrupt-term.json', 'orphan-census-interrupt-term')):
    shutil.copyfile(r2 / source, evidence / f'{target}-{DATE}.json')
lists = json.loads((r2 / 'test-lists.json').read_text())
(evidence / f'test-lists-{DATE}.json').write_text(json.dumps({
    'tool': 'compare_test_lists.py (docs/evidence/poc-hygiene-2026-10-22)', 'baseTree': f'{rev(code2)} with test-model-fixture.test.ts as at {rev(main)} and fixture-directories.test.ts absent', 'headTree': rev(code2),
    'command': 'npx vitest list', 'note': 'the base list is the head with those two test files put back to origin/main (one reverted, one set aside) and restored afterwards: they are the only test files under apps/ and packages/ that differ',
    **lists}, indent=1) + '\n')
# N9: three round-1 records name their commit by an abbreviation; the full hash is read here, never typed, and the records stay as they were.
abbreviated = []
for name in ('interrupt-kill-base', 'leak-by-file-base', 'tmpdir-length-probe'):
    recorded = load(f'{name}-{DATE}.json')['treeCommit']
    full = rev(recorded + '^{commit}')
    assert len(recorded) < 40 and full.startswith(recorded), (name, recorded, full)
    abbreviated.append({'record': f'{name}-{DATE}.json', 'recorded': recorded, 'full': full, 'resolvedBy': f'git rev-parse {recorded}^{{commit}}'})
(evidence / f'abbreviated-commits-{DATE}.json').write_text(json.dumps({
    'note': 'Review round 2, N9. These three records, made in round 1, name their tree commit by a short hash. They are left as recorded (a record is not rewritten after the fact); this note carries the full hash each short one resolves to in this repository, read by git rev-parse when this note was written. Records made from round 2 on carry the full 40-hex commit, and the tools assert the worktree is at the commit they are given.',
    'entries': abbreviated}, indent=1) + '\n')

scan, by_file_head, by_file_base = load(f'drain-scan-{DATE}.json'), load(f'leak-by-file-head-{DATE}.json'), load(f'leak-by-file-base-{DATE}.json')
first_scan = earlier(f'drain-scan-{DATE}.json')
new_callers = sorted({r['file'] for r in scan['rows']} - {r['file'] for r in first_scan['rows']})
summary_keys = ('treeCommit', 'testFilesInDirectory', 'fixtureUsingTestFiles', 'filesWithCopiesLeft', 'filesWithTemplatesLeft', 'copiesLeftTotal', 'templatesLeftTotal', 'nonzeroExits')

diagnosis = earlier(f'diagnosis-{DATE}.json')
# The diagnosis note names the main commit PR 507 landed at, a fact about that PR; main has moved since (the <main> argument), so the commit is read back from the note already committed.
pr507_main = re.search(r'to ([0-9a-f]{40}) with PR 507', json.loads(git('show', f'HEAD:docs/evidence/poc-fixture-leak-2026-10-22/diagnosis-{DATE}.json'))['callersThatDrainNothing']['atTheFinalCodeCommit']['note']).group(1)
diagnosis['subject'] = {
    'baseCommit': rev(base),
    'note': 'the diagnosis is of main after PR 503, before the change. Revised 2026-10-22 after the coordinator dropped the per-file removal hook this branch first carried: its records (unit mutants, non-draining probe, head interrupt probe) are removed from this directory and are in git history at ' + rev(first),
}
diagnosis['interruptedRuns'].pop('head', None)
diagnosis['interruptedRuns']['method'] = 'interrupt_probe.py: the project run as the leader of a new process group, SIGKILL (`base`) or SIGTERM (`baseSigterm`) sent to that group once three fixture copies exist, then the TMPDIR sampled for 80 seconds'
term_base = load(f'interrupt-term-base-{DATE}.json')
diagnosis['interruptedRuns']['baseSigterm'] = {k: term_base[k] for k in ('treeCommit', 'signal', 'atSignal')} | {'lastSample': term_base['series'][-1], 'record': f'interrupt-term-base-{DATE}.json'}
diagnosis['interruptedRuns']['note'] = ('the copies and templates are still there 80 seconds after the signal: no hook runs in a killed worker, so nothing a test file registers can remove them. '
                                        'The orphaned processes in the samples are Chrome crashpad handlers and `cat` pipes of killed browser launches; each probe run\'s own were stopped afterwards by PID, each re-checked against the probe\'s unique TMPDIR in its environment.')
diagnosis['callersThatDrainNothing']['atTheFinalCodeCommit'] = {
    'treeCommit': scan['treeCommit'],
    'filesNamingTheHelper': scan['filesNamingTheHelper'],
    'callers': scan['callers'],
    'scanFlaggedNoDrain': scan['noDrainFound'],
    'scanDelegatedArrays': scan['filesWithADelegatedArray'],
    'callersNotInTheScanAtTheFirstRevision': {name: {row['file']: row for row in scan['rows']}[name]['arrayDrains'] for name in new_callers},
    'perFileRun': {k: by_file_head[k] for k in summary_keys},
    'note': 'main moved from 0d4d5098 to ' + pr507_main + ' with PR 507, whose main.test.ts now calls buildFixtureModel and drains in afterAll. The six files the scan flagged are the six read by hand above; the scan flags the same six. fixture-directories.test.ts is in the population of files naming the helper only because a comment in it names test-model-fixture.test.ts; it creates no repository (createsRepositories is false), which is why the files naming the helper rise from 44 at the base to 46 and the callers from 42 to 43 (main.test.ts alone); the per-file run counts it among its 44 files and it leaves 0.',
}
diagnosis['finding'] = (
    'The leak in /tmp is not a caller that fails to drain: a clean project run leaves 0 fixture directories, all fixture-using test files leave 0 when run alone, and no caller was found that drains nothing. '
    'The directories come from runs that were killed or aborted (mtime bursts of 25 to 49 copies, and SIGKILL and SIGTERM probes that leave them in place at base): no teardown hook runs there. [Inferred for the bursts, Observed for the probes]')
(evidence / f'diagnosis-{DATE}.json').write_text(json.dumps(diagnosis, indent=1) + '\n')


def listing(directory: pathlib.Path) -> dict:
    """What a run left in its private TMPDIR, by kind. Random suffixes are masked."""
    names = sorted(p.name for p in directory.iterdir())
    mask = lambda n: re.sub(r'(?<=-)[A-Za-z0-9_]{6}(?=-|$)', 'XXXXXX', n)
    kinds: dict[str, int] = {}
    for name in names:
        kinds[mask(name)] = kinds.get(mask(name), 0) + 1
    return {'entries': len(names), 'fixtureDirectories': sum(1 for n in names if n.startswith('syzygy-poc-surface-fixture-')), 'byKind': dict(sorted(kinds.items()))}


for ancestor in (code, code2, head2):
    assert subprocess.run(['git', 'merge-base', '--is-ancestor', ancestor, 'HEAD'], cwd=tree).returncode == 0, f'the tree must contain {ancestor}'
gate_tail = lambda name: [line for line in (r2 / name).read_text().splitlines() if line.strip()][-1]
clean, killed, termed, disabled, mutants = (load(f'{name}-{DATE}.json') for name in ('clean-run-head', 'kill-then-fresh-run-head', 'term-then-fresh-run-head', 'kill-then-fresh-run-sweep-disabled', 'mutants-sweep'))
cli_head, cli_mutant, interrupt_term_head = load(f'cli-sweep-probe-head-{DATE}.json'), load(f'cli-sweep-probe-mutant-{DATE}.json'), load(f'interrupt-term-head-{DATE}.json')
guard, ns_head, ns_mutant = load(f'guard-probe-{DATE}.json'), load(f'ns-sandbox-probe-head-{DATE}.json'), load(f'ns-sandbox-probe-mutant-{DATE}.json')
orphans_kill, orphans_term = load(f'orphan-census-kill-runs-{DATE}.json'), load(f'orphan-census-interrupt-term-{DATE}.json')
for record in (termed, scan, by_file_head):  # carried: recorded at the previous code commit
    assert rev(record['treeCommit']) == rev(code), (record['tool'], record['treeCommit'])
for record in (clean, killed, disabled, mutants, cli_head, cli_mutant, interrupt_term_head, guard, ns_head, ns_mutant):  # round 2: recorded at the head
    assert rev(record['treeCommit']) == rev(head2), (record['tool'], record['treeCommit'])
assert git('diff', '--name-only', code2, head2, '--', 'apps', 'packages', 'vitest.config.ts') == '', 'nothing the runs execute may change between the round-2 code and the commit the runs were made at'
run_keys = ('exit', 'seconds', 'numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests', 'testFiles', 'testFilesFailed', 'failing')
test_names = [line.split(' > ', 1)[0].rsplit(' ', 1)[-1] + ' > ' + line.split(' > ', 1)[1] for line in (r2 / 'list-head.txt').read_text().splitlines()
              if '(syzygy-bpyt.4.10)' in line and 'apps/three-surface-poc/src/' in line]
first_verification = earlier(f'verification-{DATE}.json')


def log_facts(name: str) -> dict:
    text = (scratch / name).read_text()
    return {'log': name, 'summary': lines_of(name, 'Test Files', 'Tests ', 'Duration'),
            'failed': [line.strip()[len('FAIL  '):] for line in text.splitlines() if line.strip().startswith('FAIL')],
            'errorLines': sorted({line for line in text.splitlines() if line.startswith(('Error:', 'AssertionError:'))})}


def failing(record: dict) -> list:
    return [(f['file'], f['test'][-80:], f['firstErrorLine']) for f in record['freshRun']['failing']]


app_lines = [line for line in (scratch / 'vitest-full-3f08143c.log').read_text().splitlines() if '|@syzygy/three-surface-poc-app|' in line]
# The private TMPDIR of the full-suite run (recorded at the previous code commit) is gone by now; its listing is carried from the verification record already committed.
full_left = listing(full_tmp) if full_tmp.is_dir() else json.loads(git('show', f'HEAD:docs/evidence/poc-fixture-leak-2026-10-22/verification-{DATE}.json'))['gates']['fullVitest']['left']
full_run = {'command': 'npx vitest run (TMPDIR=<emptied private directory>)', **log_facts('vitest-full-3f08143c.log'), 'left': full_left,
            'appProject': {'filesPassed': sum(1 for l in app_lines if l.startswith(' ✓')), 'filesSkipped': sum(1 for l in app_lines if l.startswith(' ↓')), 'filesFailed': sum(1 for l in app_lines if l.startswith((' ❯', ' ×')))}}
def rerun_facts(name: str, command: str) -> dict:
    report = json.loads((scratch / name).read_text())
    return {'command': command, 'passed': report['numPassedTests'], 'failed': report['numFailedTests'], 'files': {f['name'].split('/src/')[-1]: f['status'] for f in report['testResults']},
            'failureErrorLines': sorted({(a['failureMessages'][0].splitlines() or [''])[0] for f in report['testResults'] for a in f['assertionResults'] if a['status'] == 'failed' and a['failureMessages']})}


files_failed = ' '.join(sorted({re.search(r'packages/\S+?\.test\.ts', line).group(0) for line in (scratch / 'vitest-full-3f08143c.log').read_text().splitlines() if line.strip().startswith('FAIL') and re.search(r'packages/\S+?\.test\.ts', line)}))
def act_families_outcomes() -> dict:
    runs = {}
    for log in sorted((scratch / 'act-families').glob('*.log')):
        text = log.read_text()
        runs[log.stem] = 'passed (65 tests)' if 'Tests  65 passed' in text else ('hook timed out (10 s), 65 skipped' if 'Hook timed out in 10000ms' in text else 'UNCLASSIFIED')
    tree = lambda marker: {name: outcome for name, outcome in runs.items() if marker in name}
    return {'runs': runs, 'alternating': {'mainA0406967': [runs[f'alternating-{n}-main-a0406967'] for n in (1, 2, 3)], 'branch3f08143c': [runs[f'alternating-{n}-branch-3f08143c'] for n in (1, 2, 3)]}}


full_run['rerunAlone'] = {
    'files': files_failed,
    'defaultTimeouts': rerun_facts('rerun-failed-default-timeouts.json', 'npx vitest run <the failed files together> (default timeouts)'),
    'timeoutsLifted': rerun_facts('rerun-failed.json', 'npx vitest run <the failed files together> --testTimeout=120000 --hookTimeout=120000'),
    'actFamilies': act_families_outcomes() | {
        'file': 'packages/polaris-generation-consent/src/act-families.test.ts',
        'why': 'its beforeAll renders each act record by spawning python3 (recorder-fixtures.testkit.ts, spawnSync) several times in a hook with a 10 s limit; one python3 import of the recorder took 1.9 s and 2.7 s wall in this session [Observed: time], so the hook passes or times out with the host load. It passes or fails alike on main a0406967 (alternating runs) and on this branch [Observed: runs]; the change adds a global setup to the app project only, which this file\'s project does not load [Inferred: from the config pin test and the diff].',
    },
}
verification = {
    'subject': {'baseCommit': rev(base), 'mergedMainCommit': rev(main), 'codeCommit': rev(code2), 'previousCodeCommit': rev(code), 'roundTwoRunsMadeAt': rev(head2), 'treeAtRecording': rev('HEAD')},
    'appsAndPackagesDiffSinceCodeCommit': git('diff', '--stat', code2, 'HEAD', '--', 'apps', 'packages'),
    'appsPackagesAndConfigChangedSincePreviousCodeCommit': git('diff', '--name-only', code, code2, '--', 'apps', 'packages', 'vitest.config.ts').split(),
    'appsPackagesAndConfigChangedByRoundTwo': {'from': rev('4463e454^'), 'to': rev(code2), 'files': git('diff', '--name-only', '4463e454^', code2, '--', 'apps', 'packages', 'vitest.config.ts').split(),
                                                'note': 'the first round-2 commit is 4463e454 and its parent is the merge of origin/main; the other files in the list above come from that merge (packages/ files of main, not of this change)'},
    'toolDigests': {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted([*evidence.glob('*.py'), *evidence.glob('*.mjs')]) if path.name != 'assemble_records.py'},
    'changedFilesMainToCode': git('diff', '--name-only', main, code2).split(),
    'ac1Sigterm': {
        'claim': 'a run killed with SIGTERM leaks its fixture directories too, as one killed with SIGKILL does',
        'atBase': {'record': f'interrupt-term-base-{DATE}.json', 'treeCommit': term_base['treeCommit'], 'atSignal': term_base['atSignal'], 'eightySecondsAfter': term_base['series'][-1]},
        'atHead': {'record': f'interrupt-term-head-{DATE}.json', 'treeCommit': interrupt_term_head['treeCommit'], 'atSignal': interrupt_term_head['atSignal'], 'eightySecondsAfter': interrupt_term_head['series'][-1]},
        'note': 'the run is stopped at once and no hook runs, so the directories stay until the next run sweeps them (ac3, termedRun). atHead was re-run at the round-2 head so that interrupt_probe.py, which review round 2 changed (N9, N10), is shown to run; atBase is the round-1 record of main.',
    },
    'ac2': {
        'claim': 'a clean three-surface-poc project run with a fresh TMPDIR leaves 0 syzygy-poc-surface-fixture-* directories',
        'command': 'npx vitest run --project @syzygy/three-surface-poc-app',
        'cleanRunTool': {'record': f'clean-run-head-{DATE}.json', **{k: clean['freshRun'][k] for k in run_keys}, 'fixtureDirectoriesLeft': clean['freshRun']['left']['fixtureDirectories'], 'left': clean['freshRun']['left']},
        'inTheFullSuiteRun': {'where': 'the app project inside gates.fullVitest, recorded at the previous code commit and not re-run (see round2.carried)', 'recordedAtCommit': rev(code), **full_run['appProject'], 'fixtureDirectoriesLeft': full_run['left']['fixtureDirectories']},
        'perFile': {'recordedAtCommit': rev(code), 'record': f'leak-by-file-head-{DATE}.json'} | {k: by_file_head[k] for k in summary_keys},
        'note': 'base leaves 0 too in a clean run (diagnosis), so this criterion shows the change leaves nothing new; AC3 is what the change is for. Failures in the runs of this record are listed under run, not hidden; the host\'s load average was 45 to 95 from other lanes throughout [Observed: uptime between runs].',
    },
    'ac3': {
        'claim': 'a run killed with SIGKILL or SIGTERM, followed by one fresh run, leaves 0 directories of dead processes; with the sweep disabled they stay',
        'killedRun': {'record': f'kill-then-fresh-run-head-{DATE}.json', 'killedRun': killed['killedRun'], 'freshRun': {k: killed['freshRun'][k] for k in run_keys} | {'left': killed['freshRun']['left']},
                      'failingInTheFreshRun': failing(killed), 'note': 'the criterion is the count of directories of dead processes in freshRun.left. The fresh run also exits non-zero on the tests in failingInTheFreshRun, vitest\'s timeout placeholder under load; none is a test of the fixture directories or of the sweep.'},
        'termedRun': {'record': f'term-then-fresh-run-head-{DATE}.json', 'recordedAtCommit': termed['treeCommit'], 'carried': 'review round 2 asked for one kill-then-fresh-run at the new code commit; this is the TERM one, left as recorded (round2.carried says why the change does not reach the path it exercises)', 'killedRun': termed['killedRun'], 'freshRun': {k: termed['freshRun'][k] for k in run_keys} | {'left': termed['freshRun']['left']}, 'failingInTheFreshRun': failing(termed)},
        'sweepDisabled': {'record': f'kill-then-fresh-run-sweep-disabled-{DATE}.json', 'mutant': disabled['mutant'], 'killedRun': disabled['killedRun'], 'freshRun': {k: disabled['freshRun'][k] for k in run_keys} | {'left': disabled['freshRun']['left']},
                          'failingInTheFreshRun': failing(disabled), 'note': 'the directories of the killed run stay; the fresh run exits non-zero because the unit test that pins the global setup\'s registration fails on the mutated tree, as intended'},
        'unitMutants': {k: mutants[k] for k in ('treeCommit', 'command', 'mutants', 'killed')} | {'control': mutants['control'], 'ids': [(r['id'], r['outcome']) for r in mutants['results']]},
        'accessibilityCli': {
            'claim': 'the accessibility CLI, which Vitest\'s global setup never reaches, sweeps the dead-process directories of its temp directory once, as the first statement of main (review round 1, F2)',
            'head': {'record': f'cli-sweep-probe-head-{DATE}.json', 'exit': cli_head['run']['exit'], 'deadProcessDirectoriesLeft': cli_head['deadProcessDirectoriesLeft'], 'liveAndLegacyKept': cli_head['liveAndLegacyKept'], 'holds': cli_head['holds']},
            'mutant': {'record': f'cli-sweep-probe-mutant-{DATE}.json', 'id': cli_mutant['mutant']['id'], 'exit': cli_mutant['run']['exit'], 'deadProcessDirectoriesLeft': cli_mutant['deadProcessDirectoriesLeft'], 'holds': cli_mutant['holds']},
        },
    },
    'oncePerRun': {
        'claim': 'the sweep runs once per run, from a global setup of the app project, and not once per test file',
        'unitTests': [name for name in test_names if 'global setup' in name or 'does not sweep when a file makes its template' in name],
        'mutantsThatMustDie': {r['id']: r['outcome'] for r in mutants['results'] if r['id'] in ('global-setup-does-not-sweep', 'global-setup-not-registered', 'global-setup-on-every-project', 'sweep-per-file')},
    },
    'ac4ac5': {
        'claim': 'a directory whose pid is alive survives the sweep (the current process\'s pid, in a unit test); a legacy name with no pid survives; so does a dead pid of another PID namespace; a file and a symlink survive',
        'unitTestsAdded': test_names,
        'withNoPidSegmentKept': 'thirteen name shapes in one test: legacy copy and template, pid without the namespace segment (both forms), pid with no hyphen after it, namespace with no hyphen after it, empty namespace, an m segment, pid not straight after the prefix, another prefix, the prefix inside a longer name, the prefix without its last hyphen',
        'foreignNamespace': 'one test: a copy and a template with a dead pid are kept under each of three foreign namespace values (another inode, the own inode with its last digit cut, the own inode with a digit added: review round 2, N8, so a prefix or an extension of the own namespace is not the own namespace), the own-namespace one beside them is removed',
        'unreadableNamespace': 'two tests from one parametrised case, with node:fs mocked: the namespace reading throws ENOENT, and the reading is `pid:[]` (text with no inode). In each, the names carry n0, a dead-pid n0 copy and template and a dead-pid own-namespace directory all survive the sweep, and readdirSync is never called (review round 2, F5)',
        'noSymlinkFollowed': 'one test: a symlink to a directory outside the swept one, and a file, both with dead-pid names, are kept; the outside directory is untouched',
        'otherUser': 'one test, with a spy on process.getuid returning another uid; no second uid was available to this lane, so a real foreign-owned directory was not made',
    },
    'ac6': {k: load(f'test-lists-{DATE}.json')[k] for k in ('baseTree', 'headTree', 'baseLines', 'headLines', 'added', 'removed', 'addedByFile', 'testsLine')},
    'gates': {
        'fullVitest': {'recordedAtCommit': rev(code), 'notRerunAtTheRoundTwoHead': 'about 45 minutes on this host and the hosted node-ci runs the whole suite on the pushed head; see round2.carried'} | full_run,
        'typecheck': {'command': 'npm run typecheck', 'last line of the log': gate_tail('gate-typecheck.log')},
        'checkGovernance': {'command': 'python3 scripts/check_governance.py', 'summary': [l for l in (r2 / 'gate-governance.log').read_text().splitlines() if l.endswith('derived, not asserted')], 'exit': gate_tail('gate-governance.log')},
        'checkQuotations': {'command': 'python3 scripts/check_quotations.py', 'exit': gate_tail('gate-quotations.log')},
        'authoritySweep': {'command': 'npx vitest run apps/three-surface-poc/src/polaris-authority-sweep.test.ts', 'result': [l.strip() for l in (r2 / 'gate-authority.log').read_text().splitlines() if l.strip().startswith(('Test Files', 'Tests '))]},
        'unitFiles': {'command': 'npx vitest run apps/three-surface-poc/src/fixture-directories.test.ts apps/three-surface-poc/src/test-model-fixture.test.ts --project @syzygy/three-surface-poc-app', 'result': [l.strip() for l in (r2 / 'gate-unit.log').read_text().splitlines() if l.strip().startswith(('Test Files', 'Tests '))]},
    },
    'otherLeakSeen': {
        'where': 'packages/polaris-dossier/src/waiting-sessions.test.ts:276',
        'what': 'writes <tmpdir>/dossier-signoff-XXXXXX-outside-RAW.md beside its temporary directory and never removes it; found in the full-run TMPDIR listing. Filed by the coordinator as syzygy-bpyt.4.12',
        'left': full_run['left']['byKind'],
    },
    'round2': {
        'subject': 'review round 2 of the pull request: F5 (blocking), N7 to N11, and AC3 re-run at the new code commit',
        'f5': {
            'claim': 'a process that cannot read its PID namespace neither lists nor removes, so a sweep in a PID namespace with a tmpfs over /proc removes no live run\'s directory; names still carry n0',
            'unitTests': [name for name in test_names if 'cannot be read' in name or 'names no inode' in name],
            'sandboxProbeAtHead': {'record': f'ns-sandbox-probe-head-{DATE}.json', 'treeCommit': ns_head['treeCommit'], 'holders': {k: {'nsReading': v['nsReading'], 'goneWhileAlive': v['goneWhileAlive']} for k, v in ns_head['holders'].items()},
                                    'sweepers': {k: {'nsReading': v['nsReading'], 'removed': v['removed']} for k, v in ns_head['sweeps'].items()}, 'holds': ns_head['holds']},
            'sandboxProbeWithTheOldFallback': {'record': f'ns-sandbox-probe-mutant-{DATE}.json', 'mutant': ns_mutant['mutant']['id'], 'holders': {k: {'nsReading': v['nsReading'], 'goneWhileAlive': v['goneWhileAlive'], 'goneAfterMs': v.get('goneAfterMs')} for k, v in ns_mutant['holders'].items()},
                                                'sweepers': {k: {'nsReading': v['nsReading'], 'removed': v['removed']} for k, v in ns_mutant['sweeps'].items()}, 'holds': ns_mutant['holds']},
            'mutants': {r['id']: r['outcome'] for r in mutants['results'] if r['id'] in ('unreadable-namespace-reads-as-0', 'unparseable-namespace-reads-as-0', 'unreadable-namespace-still-lists')},
        },
        'n7': 'residual, not a defect of the change: a namespace inode identifies a namespace within one running kernel, so a TMPDIR shared between kernels (an NFS mount, a directory a virtual machine shares) is out of scope. The temp directory here is a local tmpfs.',
        'n8': {'claim': 'a foreign namespace value that is a prefix or an extension of the own one is foreign', 'mutants': {r['id']: r['outcome'] for r in mutants['results'] if r['id'] in ('namespace-prefix-match', 'namespace-extension-match')}},
        'n9': {'record': f'abbreviated-commits-{DATE}.json', 'entries': abbreviated, 'newRecordsCarryTheFullCommit': True},
        'n10': {'record': f'guard-probe-{DATE}.json', 'treeCommit': guard['treeCommit'], 'argumentsRefused': f"{sum(1 for r in guard['head'] if r['holds'])}/{len(guard['head'])}",
                'predicateMutantsKilled': f"{sum(1 for m in guard['mutants'] if m['killed'])}/{len(guard['mutants'])}", 'wiringMutantsKilled': f"{sum(1 for w in guard['wiring'] if w['killed'])}/{len(guard['wiring'])}", 'holds': guard['holds']},
        'n11': 'out of scope, filed by the coordinator as syzygy-bpyt.4.18',
        'orphanedBrowserProcesses': {
            'claim': 'the evidence tools\' own check of leftover processes (`processesStillNamingThisTmpdir`, TMPDIR in a process\'s environment) is blind to a killed Chrome\'s zygote and its descendants, which have no readable environment; orphan_census.py matches the exact `--user-data-dir=<private directory>/` argument instead',
            'afterTheKillRuns': {'record': f'orphan-census-kill-runs-{DATE}.json', 'before': {e['directory']: {'processes': e['processes'], 'byKind': e['byKind']} for e in orphans_kill['before'] if e['processes']}, 'afterSigterm': {e['directory']: e['processes'] for e in orphans_kill['afterSigterm']}},
            'afterTheInterruptProbe': {'record': f'orphan-census-interrupt-term-{DATE}.json', 'before': {e['directory']: {'processes': e['processes'], 'byKind': e['byKind']} for e in orphans_term['before']}, 'afterSigterm': {e['directory']: e['processes'] for e in orphans_term['afterSigterm']}},
            'killRecordsField': {'record': f'kill-then-fresh-run-head-{DATE}.json', 'processesStillNamingThisTmpdir': killed['processesStillNamingThisTmpdir']},
            'foundEarlier': 'before this census existed, 18 and 38 Chrome processes of the two TERM probes made in round 1 were found alive after about seven hours, still re-creating their profile directories (which is what stopped the first re-run of the interrupt probe at the round-2 head: its guard refused a directory that was not empty). They were listed and stopped by the exact `--user-data-dir=` argument and the directories removed. [Observed in this session; no record was kept of that first listing.]',
        },
        'carried': {
            'recordedAtCommit': rev(code),
            'records': ['term-then-fresh-run-head', 'drain-scan', 'leak-by-file-head', 'interrupt-term-base', 'the full-suite run and its reruns in gates.fullVitest'],
            'why': 'The round-2 change adds one early return to removeFixturesOfDeadProcesses (no namespace reading, nothing listed) and makes pidNamespace() return undefined where it returned the string 0; on a host with a readable /proc/self/ns/pid, as this one, both give the earlier behavior, which the SIGKILL run, its sweep-disabled mutant, the clean run, the CLI probes and the TERM interrupt probe re-run at the round-2 head show end to end [Observed: those records]. That the TERM path is unchanged is [Inferred: from the diff; the files round 2 changed are listed in appsPackagesAndConfigChangedByRoundTwo]. The drain scan and the per-file run are about which test files drain, which round 2 did not touch.',
        },
        'replacedRecords': {f'{name}-{DATE}.json': v for name, v in replaced_from.items()} | {'note': 'each was replaced in this commit by a record of the round-2 head; the earlier one is in git history at lastCommitHoldingIt and named the commit shown'},
    },
    'oneOffCleanup': first_verification['oneOffCleanup'] | {'carriedFrom': f'verification-{DATE}.json at {rev(first)}; the directories no longer exist, so the counts cannot be re-derived'},
}
tidy_two = json.loads((scratch / 'tidy-2.json').read_text())
removed_two = (scratch / 'tmp-cleanup-2-removed-list.txt').read_text().split()
verification['oneOffCleanup']['secondPass'] = {
    'rule': verification['oneOffCleanup']['rule'], 'before': tidy_two['before'], 'removed': len(removed_two), 'after': tidy_two['after'], 'remainingOlderThan360Minutes': tidy_two['olderThan360MinutesAfter'],
    'removedNames': sorted(pathlib.PurePath(p).name for p in removed_two),
    'note': 'before and after typed from `find ... | wc -l` at the time; removed is the scripted find output saved before removal. The total was 193 at the end of the first pass and 193 again about seven hours later: no directory was added in between.',
}
(evidence / f'verification-{DATE}.json').write_text(json.dumps(verification, indent=1) + '\n')
print(json.dumps({'tests': verification['ac6']['testsLine'], 'cleanLeft': clean['freshRun']['left']['fixtureDirectories'], 'fullRunLeft': full_run['left']['fixtureDirectories'], 'appProject': full_run['appProject'],
                  'killedDead': killed['killedRun']['fiveSecondsAfterSignal']['ofDeadProcesses']['count'], 'killedFreshLeft': killed['freshRun']['left']['fixtureDirectories'],
                  'termedDead': termed['killedRun']['fiveSecondsAfterSignal']['ofDeadProcesses']['count'], 'termedFreshLeft': termed['freshRun']['left']['fixtureDirectories'],
                  'disabledLeft': disabled['freshRun']['left']['ofDeadProcesses']['count'], 'mutants': verification['ac3']['unitMutants']['killed'],
                  'cliHead': cli_head['holds'], 'cliMutant': cli_mutant['holds'], 'newCallers': new_callers, 'unitTestNames': len(test_names)}, indent=1))
