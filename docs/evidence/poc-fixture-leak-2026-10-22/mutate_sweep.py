#!/usr/bin/env python3
"""Rule-6 run for the owner-pid naming and the dead-process sweep of the POC surface fixtures.

Usage: mutate_sweep.py <worktree> <out.json> <private-tmpdir>

Each mutant is a list of (file, old, new) edits to the sources below; the two test files run
ALONE under a private TMPDIR (so a mutant that leaks, leaks there and not into a shared /tmp,
and the app project's global setup sweeps that directory and nothing else), and every edited
file is restored byte for byte afterwards. A control (the unmutated tree) runs first and must
pass and leave no fixture directory. A fragment that does not occur exactly once in its file is
recorded as FRAGMENT-COUNT-n and never guessed.

Host load is not a kill. The host this runs on is loaded (average 60-100), and a test can fail for
that alone: a time limit, or `closeDisposableBrowser`'s drain. A run is scored `killed` only when a
failing test has a first error line that is not one of LOAD_SIGNATURES, `SURVIVED` only when it exits
0, and a run whose every failure is a load failure is run again, up to ATTEMPTS times, then scored
`INCONCLUSIVE-LOAD`. A run that fails with no failing test (a mutant that does not load) is
`ERROR-NO-FAILING-TEST`. Every attempt is recorded. The directory argument is emptied recursively,
so a shared or non-empty directory is refused (review round 2, N10).

Records, per mutant: the edits (old and new fragments), the command, the commit the run was
made at and every failing test with its first error line (from vitest's JSON reporter). The
edited files and the two test files must be committed before the run.
"""
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile



def private_directory(path: pathlib.Path) -> pathlib.Path:
    """This script empties the directory it is given, recursively. Refuse a directory that is, or contains, a shared one
    (/, the temp directory, $TMPDIR, $HOME) and one that already holds anything this script did not make: whoever
    re-runs it removes a leftover by hand, after reading it (syzygy-bpyt.4.10, review round 2, N10)."""
    resolved = path.resolve()
    shared = [pathlib.Path('/'), pathlib.Path(tempfile.gettempdir()), pathlib.Path(os.environ.get('TMPDIR') or '/tmp'), pathlib.Path.home()]
    for directory in (d.resolve() for d in shared):
        if resolved == directory or resolved in directory.parents:
            raise SystemExit(f'refusing {resolved}: it is, or contains, the shared directory {directory}')
    if resolved.exists() and (not resolved.is_dir() or any(resolved.iterdir())):
        raise SystemExit(f'refusing {resolved}: it exists and is not an empty directory')
    return resolved


WT, OUT, PRIVATE_TMP = pathlib.Path(sys.argv[1]).resolve(), pathlib.Path(sys.argv[2]).resolve(), private_directory(pathlib.Path(sys.argv[3]))
ATTEMPTS = 3
LOAD_SIGNATURES = ('drain did not verify', 'still held by', 'timed out', 'STACK_TRACE_ERROR')
FD = 'apps/three-surface-poc/src/fixture-directories.ts'
GS = 'apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts'
TM = 'apps/three-surface-poc/src/test-model-fixture.ts'
VC = 'vitest.config.ts'
TESTS = ['apps/three-surface-poc/src/fixture-directories.test.ts', 'apps/three-surface-poc/src/test-model-fixture.test.ts']
GLOBAL_SETUP_LINE = "          // Once per run: removes the fixture directories of killed runs (syzygy-bpyt.4.10).\n          globalSetup: [fileURLToPath(new URL('./apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts', import.meta.url))],\n"
TRY = ("    try {\n      const stat = lstatSync(entry);\n      if (stat.isDirectory() && (user === undefined || stat.uid === user)) rmSync(entry, { recursive: true, force: true });\n"
       "    } catch {\n      // Left for the next run.\n    }\n")
GUARD = 'if (stat.isDirectory() && (user === undefined || stat.uid === user)) rmSync('
DECIDE = 'if (owner === null || owner[2] !== namespace || ownerMayBeAlive(Number(owner[1]))) continue;'
LIST = "  let names: string[];\n  try {\n    names = readdirSync(directory);\n  } catch {\n    return;\n  }\n"

MUTANTS = [
    ('live-pid-removed', 'a directory whose pid is alive is removed too',
     [(FD, DECIDE, 'if (owner === null || owner[2] !== namespace) continue;')]),
    ('foreign-namespace-swept', 'a dead pid from another PID namespace is judged by this namespace and removed (review round 1, F1)',
     [(FD, DECIDE, 'if (owner === null || ownerMayBeAlive(Number(owner[1]))) continue;')]),
    ('every-error-means-dead', 'EPERM and an out-of-range pid count as dead',
     [(FD, "return (error as NodeJS.ErrnoException).code !== 'ESRCH';", 'return false;')]),
    ('name-without-pid-is-dead', 'a name with no pid segment is swept as pid 4194305',
     [(FD, 'const owner = FIXTURE_NAME_WITH_OWNER.exec(name);', "const owner = FIXTURE_NAME_WITH_OWNER.exec(name) ?? [name, '4194305', namespace];")]),
    ('hyphen-after-namespace-dropped', 'a namespace with no hyphen after it matches',
     [(FD, 'p(\\d+)-n(\\d+)-/;', 'p(\\d+)-n(\\d+)/;')]),
    ('anchor-dropped', 'the prefix may sit inside a longer name',
     [(FD, 'const FIXTURE_NAME_WITH_OWNER = /^syzygy-', 'const FIXTURE_NAME_WITH_OWNER = /syzygy-')]),
    ('template-form-unmatched', 'a template directory of a dead process is never swept',
     [(FD, '(?:template-)?p(\\d+)-n(\\d+)-/;', 'p(\\d+)-n(\\d+)-/;')]),
    ('is-directory-guard-dropped', 'a regular file or a symlink with a dead-pid name is removed, not only a directory (review round 1, F3)',
     [(FD, GUARD, 'if (user === undefined || stat.uid === user) rmSync(')]),
    ('uid-guard-dropped', 'a directory of another user with a dead-pid name is entered and removed (review round 1, F3)',
     [(FD, GUARD, 'if (stat.isDirectory()) rmSync(')]),
    ('stat-follows-symlink', 'a symlink to a directory is judged by its target, not by itself',
     [(FD, "import { lstatSync, readdirSync, readlinkSync, rmSync } from 'node:fs';", "import { lstatSync, readdirSync, readlinkSync, rmSync, statSync } from 'node:fs';"),
      (FD, 'const stat = lstatSync(entry);', 'const stat = statSync(entry);')]),
    ('removal-failure-propagates', 'a directory that cannot be removed fails the run that sweeps',
     [(FD, TRY, "    const stat = lstatSync(entry);\n    if (stat.isDirectory() && (user === undefined || stat.uid === user)) rmSync(entry, { recursive: true, force: true });\n")]),
    ('readdir-outside-try', 'a temp directory that cannot be listed fails the run that sweeps (review round 1, N1)',
     [(FD, LIST, '  const names = readdirSync(directory);\n')]),
    ('lists-the-parent', 'the sweep lists the parent of the directory it is given',
     [(FD, 'names = readdirSync(directory);', "names = readdirSync(join(directory, '..'));")]),
    ('tmpdir-read-from-the-variable', 'the default directory is the TMPDIR variable itself, not what the operating system answers for the temp directory',
     [(FD, 'directory: string = tmpdir()', "directory: string = process.env['TMPDIR'] as string")]),
    ('copy-name-without-pid', 'a copy is named as before, with no pid',
     [(FD, "`${FIXTURE_PREFIX}p${process.pid}-n${pidNamespace() ?? '0'}-`", '`${FIXTURE_PREFIX}`')]),
    ('copy-name-without-namespace', 'a copy is named with its pid but not its PID namespace',
     [(FD, "`${FIXTURE_PREFIX}p${process.pid}-n${pidNamespace() ?? '0'}-`", '`${FIXTURE_PREFIX}p${process.pid}-`')]),
    ('template-name-without-pid', 'the template is named as before, with no pid',
     [(FD, "`${FIXTURE_PREFIX}template-p${process.pid}-n${pidNamespace() ?? '0'}-`", '`${FIXTURE_PREFIX}template-`')]),
    ('template-name-without-namespace', 'the template is named with its pid but not its PID namespace',
     [(FD, "`${FIXTURE_PREFIX}template-p${process.pid}-n${pidNamespace() ?? '0'}-`", '`${FIXTURE_PREFIX}template-p${process.pid}-`')]),
    ('unreadable-namespace-reads-as-0', 'a namespace that cannot be read is namespace 0, as before review round 2 (F5): every sandbox without /proc reads as one namespace and sweeps the others',
     [(FD, "  } catch {\n    return undefined;\n  }\n", "  } catch {\n    return '0';\n  }\n")]),
    ('unparseable-namespace-reads-as-0', 'a link that names no inode is namespace 0 (F5)',
     [(FD, "readlinkSync('/proc/self/ns/pid'))?.[1];", "readlinkSync('/proc/self/ns/pid'))?.[1] ?? '0';")]),
    ('unreadable-namespace-still-lists', 'a process that cannot read its namespace lists the directory before it finds nothing to remove (F5: it must return first)',
     [(FD, '  if (namespace === undefined) return;\n', '')]),
    ('namespace-prefix-match', 'a name whose namespace is a proper prefix of this one is taken for this namespace\'s own (review round 2, N8)',
     [(FD, 'owner[2] !== namespace', '!namespace.startsWith(owner[2] as string)')]),
    ('namespace-extension-match', 'a name whose namespace extends this one is taken for this namespace\'s own (review round 2, N8)',
     [(FD, 'owner[2] !== namespace', '!(owner[2] as string).startsWith(namespace)')]),
    ('global-setup-does-not-sweep', 'the global setup runs and sweeps nothing',
     [(GS, '  removeFixturesOfDeadProcesses();\n', '')]),
    ('global-setup-not-registered', 'the app project registers no global setup: no sweep at all',
     [(VC, GLOBAL_SETUP_LINE, '')]),
    ('global-setup-on-every-project', 'the global setup is registered at the root, so every project runs it',
     [(VC, "    maxWorkers: '50%',\n", "    maxWorkers: '50%',\n    globalSetup: [fileURLToPath(new URL('./apps/three-surface-poc/src/test-fixture-sweep.global-setup.ts', import.meta.url))],\n")]),
    ('sweep-per-file', 'every file sweeps when it makes its template, as well as the global setup',
     [(TM, "import { ownedCopyPrefix, ownedTemplatePrefix } from './fixture-directories.js';", "import { ownedCopyPrefix, ownedTemplatePrefix, removeFixturesOfDeadProcesses } from './fixture-directories.js';"),
      (TM, '  const root = mkdtempSync(join(tmpdir(), ownedTemplatePrefix()));', '  removeFixturesOfDeadProcesses();\n  const root = mkdtempSync(join(tmpdir(), ownedTemplatePrefix()));')]),
]

run = lambda *a: subprocess.run(a, cwd=WT, capture_output=True, text=True, check=True).stdout.strip()
commit = run('git', 'rev-parse', 'HEAD')
FILES = sorted({f for _, _, edits in MUTANTS for f, _, _ in edits} | set(TESTS))
dirty = run('git', 'status', '--porcelain', '--', *FILES)
assert dirty == '', f'{FILES} must be committed before a rule-6 run: {dirty}'
originals = {name: (WT / name).read_text() for name in FILES}
digests = {name: hashlib.sha256(text.encode()).hexdigest() for name, text in originals.items()}
report = pathlib.Path(tempfile.mkdtemp(prefix='zz-mutate-sweep-')) / 'report.json'  # removed in the final `finally`
command = ['npx', 'vitest', 'run', *TESTS, '--project', '@syzygy/three-surface-poc-app', '--reporter=json', f'--outputFile={report}']


def vitest() -> tuple[int, int, list[dict], int]:
    shutil.rmtree(PRIVATE_TMP, ignore_errors=True)
    PRIVATE_TMP.mkdir(parents=True)
    report.unlink(missing_ok=True)
    proc = subprocess.run(command, cwd=WT, capture_output=True, text=True, env={**os.environ, 'TMPDIR': str(PRIVATE_TMP)})
    data = json.loads(report.read_text()) if report.exists() else {'testResults': []}
    cases = [a for suite in data['testResults'] for a in suite['assertionResults']]
    failing = [{'test': a['fullName'], 'firstErrorLine': (a['failureMessages'][0].splitlines() or [''])[0] if a['failureMessages'] else ''}
               for a in cases if a['status'] == 'failed']
    leaked = sum(1 for p in PRIVATE_TMP.iterdir() if p.name.startswith('syzygy-poc-surface-fixture-'))
    return proc.returncode, len(cases), failing, leaked


def classify(exit_code: int, failing: list[dict]) -> str:
    if exit_code == 0:
        return 'passed'
    if not failing:
        return 'no-failing-test'
    return 'failed' if any(not any(sig in f['firstErrorLine'] for sig in LOAD_SIGNATURES) for f in failing) else 'load'


def decide() -> tuple[str, int, int, list[dict], int, list[dict]]:
    """Runs until the status is not `load`, at most ATTEMPTS times; returns the last run and every attempt."""
    attempts = []
    for attempt in range(1, ATTEMPTS + 1):
        exit_code, total, failing, leaked = vitest()
        status = classify(exit_code, failing)
        attempts.append({'attempt': attempt, 'exit': exit_code, 'status': status, 'testsRun': total, 'failing': failing, 'fixtureDirectoriesLeftInPrivateTmpdir': leaked})
        if status != 'load':
            break
    return status, exit_code, total, failing, leaked, attempts


results = []
control = {}
try:
    status, exit_code, total, failing, leaked, attempts = decide()
    control = {'exit': exit_code, 'testsRun': total, 'failing': failing, 'fixtureDirectoriesLeftInPrivateTmpdir': leaked, 'attempts': attempts,
               'holds': exit_code == 0 and total > 0 and leaked == 0}
    print('control', control['holds'], total, leaked, flush=True)
    assert control['holds'], 'the unmutated tree must pass both test files and leave no fixture directory'
    for name, meaning, edits in MUTANTS:
        record = {'id': name, 'meaning': meaning, 'edits': [{'file': f, 'old': old, 'new': new} for f, old, new in edits]}
        counts = [originals[f].count(old) for f, old, _ in edits]
        if any(c != 1 for c in counts):
            results.append(record | {'outcome': 'FRAGMENT-COUNT-' + '/'.join(map(str, counts))})
            print(name, results[-1]['outcome'], flush=True)
            continue
        try:
            for f, old, new in edits:
                (WT / f).write_text((WT / f).read_text().replace(old, new, 1))
            status, exit_code, total, failing, leaked, attempts = decide()
        finally:
            for f in {f for f, _, _ in edits}:
                (WT / f).write_text(originals[f])
        outcome = {'failed': 'killed', 'passed': 'SURVIVED', 'load': 'INCONCLUSIVE-LOAD', 'no-failing-test': 'ERROR-NO-FAILING-TEST'}[status]
        results.append(record | {'exit': exit_code, 'outcome': outcome, 'testsRun': total, 'failing': failing, 'fixtureDirectoriesLeftInPrivateTmpdir': leaked, 'attempts': attempts})
        print(name, results[-1]['outcome'], len(failing), flush=True)
finally:
    for name, text in originals.items():
        (WT / name).write_text(text)
    shutil.rmtree(PRIVATE_TMP, ignore_errors=True)
    shutil.rmtree(report.parent, ignore_errors=True)
for name, text in originals.items():
    assert hashlib.sha256((WT / name).read_text().encode()).hexdigest() == digests[name]
OUT.write_text(json.dumps({
    'tool': 'mutate_sweep.py',
    'testFiles': TESTS,
    'command': ' '.join(command[:7]),
    'treeCommit': commit,
    'sha256AtCommit': digests,
    'control': control,
    'mutants': len(MUTANTS),
    'killed': sum(1 for r in results if r['outcome'] == 'killed'),
    'results': results,
}, indent=1) + '\n')
print('survivors:', [r['id'] for r in results if r['outcome'] != 'killed'])
