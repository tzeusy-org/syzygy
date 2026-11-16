#!/usr/bin/env python3
"""Does the accessibility CLI sweep the fixture directories of dead processes once, at its start?

Usage: cli_sweep_probe.py <worktree> <tree-commit> <out.json> <private-tmpdir> <mode>

<mode> is `head` (the tree as committed) or `mutant` (the call to removeFixturesOfDeadProcesses
and its import removed from apps/three-surface-poc/src/polaris-accessibility-main.ts, rebuilt,
and restored and rebuilt afterwards: the `accessibility-cli-does-not-sweep` mutant).

The CLI (`npm run poc:accessibility-check`) builds its models with the fixture helper but is not
a Vitest run, so the app project's global setup never runs for it. The probe builds the app
(`npx tsc -b apps/three-surface-poc`), seeds <private-tmpdir> (emptied first) with
  - a copy and a template of a process that is gone and of this probe's PID namespace,
  - a copy of this probe (alive),
  - a legacy name with no pid,
runs `node apps/three-surface-poc/dist/polaris-accessibility-main.js` with TMPDIR=<private-tmpdir>,
no PATH and no SYZYGY_POC_BROWSER, so it finds no browser, prints its refusal and exits 2 before
it measures anything, and lists the directory again. The sweep is the first statement of the CLI's
`main`, so it has run by then. Nothing is typed: the listings are read from the directory.
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


WT, COMMIT, OUT, TMP, MODE = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]).resolve(), pathlib.Path(sys.argv[4]).resolve(), sys.argv[5]
assert MODE in ('head', 'mutant'), MODE
SRC = 'apps/three-surface-poc/src/polaris-accessibility-main.ts'
CALL = "  // The fixture helper this CLI builds its models with leaves a directory behind when a run is killed;\n  // Vitest's global setup sweeps those for test runs and never runs here (syzygy-bpyt.4.10).\n  removeFixturesOfDeadProcesses();\n"
IMPORT = "import { removeFixturesOfDeadProcesses } from './fixture-directories.js';\n"
PREFIX = 'syzygy-poc-surface-fixture-'
git = lambda *a: subprocess.run(['git', *a], cwd=WT, capture_output=True, text=True, check=True).stdout.strip()
assert git('rev-parse', 'HEAD') == git('rev-parse', COMMIT), 'the worktree must be at <tree-commit>'
assert git('status', '--porcelain', '--', 'apps', 'packages', 'vitest.config.ts') == '', 'the tree must be committed'
build = lambda: subprocess.run(['npx', 'tsc', '-b', 'apps/three-surface-poc'], cwd=WT, capture_output=True, text=True)
namespace = re.search(r'\[(\d+)\]$', os.readlink('/proc/self/ns/pid')).group(1)

TMP = private_directory(TMP)
TMP.mkdir(parents=True)
dead_child = subprocess.Popen([sys.executable, '-c', ''])
dead_child.wait()
dead = dead_child.pid
try:
    os.kill(dead, 0)
    raise SystemExit('the dead pid answers')
except ProcessLookupError:
    pass
seeded = [f'{PREFIX}p{dead}-n{namespace}-CliProbe', f'{PREFIX}template-p{dead}-n{namespace}-CliProbe', f'{PREFIX}p{os.getpid()}-n{namespace}-CliLive1', f'{PREFIX}CliLegacy']
for name in seeded:
    (TMP / name / 'repo').mkdir(parents=True)
    (TMP / name / 'repo' / 'README.md').write_text('# seeded by cli_sweep_probe.py\n')

original = (WT / SRC).read_text()
digest = hashlib.sha256(original.encode()).hexdigest()
record: dict = {'tool': 'cli_sweep_probe.py', 'treeCommit': git('rev-parse', 'HEAD'), 'mode': MODE, 'file': SRC, 'sha256AtCommit': digest,
                'seededDeadPid': dead, 'pidNamespace': namespace, 'seeded': seeded}
try:
    if MODE == 'mutant':
        assert original.count(CALL) == 1 and original.count(IMPORT) == 1, 'the call and its import must each occur once'
        (WT / SRC).write_text(original.replace(CALL, '', 1).replace(IMPORT, '', 1))
        record['mutant'] = {'id': 'accessibility-cli-does-not-sweep', 'file': SRC, 'edits': [{'old': CALL, 'new': ''}, {'old': IMPORT, 'new': ''}]}
    built = build()
    record['build'] = {'command': 'npx tsc -b apps/three-surface-poc', 'exit': built.returncode, 'firstLine': (built.stdout + built.stderr).strip().splitlines()[:1]}
    assert built.returncode == 0, built.stdout + built.stderr
    node = shutil.which('node')
    ran = subprocess.run([node, 'apps/three-surface-poc/dist/polaris-accessibility-main.js'], cwd=WT, capture_output=True, text=True,
                         env={'TMPDIR': str(TMP), 'HOME': os.environ.get('HOME', '/'), 'PATH': ''}, timeout=120)
    record['run'] = {'command': 'node apps/three-surface-poc/dist/polaris-accessibility-main.js (TMPDIR=<private>, PATH empty, SYZYGY_POC_BROWSER unset)', 'exit': ran.returncode,
                     'stderrFirstLine': ran.stderr.strip().splitlines()[:1], 'stdoutBytes': len(ran.stdout)}
finally:
    (WT / SRC).write_text(original)
    rebuilt = build()
    assert rebuilt.returncode == 0, rebuilt.stdout + rebuilt.stderr
assert hashlib.sha256((WT / SRC).read_bytes()).hexdigest() == digest, 'source not restored'
left = sorted(p.name for p in TMP.iterdir())
record['left'] = left
record['deadProcessDirectoriesLeft'] = [n for n in left if f'p{dead}-' in n]
record['liveAndLegacyKept'] = [n for n in seeded if 'p%d-' % dead not in n and n in left]
record['holds'] = (record['run']['exit'] == 2 and (not record['deadProcessDirectoriesLeft'] if MODE == 'head' else len(record['deadProcessDirectoriesLeft']) == 2)
                   and record['liveAndLegacyKept'] == [n for n in seeded if 'p%d-' % dead not in n])
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({k: record[k] for k in ('mode', 'run', 'deadProcessDirectoriesLeft', 'liveAndLegacyKept', 'holds')}, indent=1))
shutil.rmtree(TMP, ignore_errors=True)
