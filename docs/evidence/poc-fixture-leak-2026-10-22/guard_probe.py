#!/usr/bin/env python3
"""Do the four fixture-leak tools refuse a scratch directory they must not empty (review round 2, N10)?

Usage: guard_probe.py <worktree> <out.json> <private-parent>

kill_then_fresh_run.py, interrupt_probe.py, cli_sweep_probe.py and mutate_sweep.py empty their directory argument
recursively. Each calls `private_directory` on it before the first removal. This probe never gives them a real shared
directory: it builds <private-parent> (which must not exist or be empty) with a fake home and a fake temp directory,
points HOME and TMPDIR at them, and passes six arguments to each tool:
  home                     the fake $HOME (it holds a canary file)
  temp                     the fake $TMPDIR (also what `tempfile.gettempdir()` answers; holds a canary)
  contains-shared          <private-parent>, which contains both (holds a canary)
  occupied                 a directory that already holds a file
  home-empty               an EMPTY fake $HOME: only the shared-directory clause refuses it
  contains-missing-shared  an EMPTY directory whose child is the (not yet made) $TMPDIR: only the ancestor clause refuses it
Every tool must exit non-zero with "refusing" on its output, leave the canary files, and write no output file. Then the
predicate is mutated (rule 6): the source of `private_directory` is cut out of each tool and run in this process with
one clause dropped, and each mutant must accept the one case that only that clause refuses. Last, a static check: in
each tool the call to `private_directory` comes before the first line that removes or makes a directory, and a copy of
the tool without that call fails the check.
"""
import ast
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

WT, OUT, PARENT = pathlib.Path(sys.argv[1]).resolve(), pathlib.Path(sys.argv[2]).resolve(), pathlib.Path(sys.argv[3]).resolve()
TOOLS = pathlib.Path(__file__).resolve().parent
HEAD = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=WT, capture_output=True, text=True, check=True).stdout.strip()
INVOCATIONS = {
    'kill_then_fresh_run.py': lambda d, out: [str(WT), HEAD, out, d, 'sweep'],
    'interrupt_probe.py': lambda d, out: [str(WT), HEAD, out, d, 'KILL', '3'],
    'cli_sweep_probe.py': lambda d, out: [str(WT), HEAD, out, d, 'head'],
    'mutate_sweep.py': lambda d, out: [str(WT), out, d],
}
VARIABLE = {'kill_then_fresh_run.py': 'TMP', 'interrupt_probe.py': 'TMP', 'cli_sweep_probe.py': 'TMP', 'mutate_sweep.py': 'PRIVATE_TMP'}

assert not PARENT.exists() or not any(PARENT.iterdir()), f'{PARENT} must not exist or be empty'
home, temp, occupied = PARENT / 'home', PARENT / 'tmp', PARENT / 'work' / 'occupied'
for directory in (home, temp, occupied):
    directory.mkdir(parents=True)
    (directory / 'canary').write_text('must survive\n')
(PARENT / 'canary').write_text('must survive\n')
empty_home, ancestor = PARENT / 'empty-home', PARENT / 'work' / 'ancestor'
empty_home.mkdir()
ancestor.mkdir()
# case -> (the directory argument, $HOME, $TMPDIR)
CASES = {
    'home': (home, home, temp),
    'temp': (temp, home, temp),
    'contains-shared': (PARENT, home, temp),
    'occupied': (occupied, home, temp),
    'home-empty': (empty_home, empty_home, temp),
    'contains-missing-shared': (ancestor, home, ancestor / 'not-yet-made'),
}
canaries = [home / 'canary', temp / 'canary', occupied / 'canary', PARENT / 'canary']

head: list[dict] = []
for tool, arguments in INVOCATIONS.items():
    for case, (directory, case_home, case_temp) in CASES.items():
        out = PARENT / 'work' / f'{tool}.{case}.json'
        env = {**os.environ, 'HOME': str(case_home), 'TMPDIR': str(case_temp)}
        ran = subprocess.run([sys.executable, '-I', str(TOOLS / tool), *arguments(str(directory), str(out))], cwd=WT, capture_output=True, text=True, env=env, timeout=120)
        text = ran.stdout + ran.stderr
        head.append({'tool': tool, 'case': case, 'exit': ran.returncode, 'refused': 'refusing' in text, 'firstLine': (text.strip().splitlines() or [''])[-1][:200],
                     'canariesSurvive': all(c.exists() for c in canaries), 'outputWritten': out.exists(),
                     'holds': ran.returncode != 0 and 'refusing' in text and all(c.exists() for c in canaries) and not out.exists()})
        print(tool, case, head[-1]['holds'], flush=True)


def function_source(tool: str) -> str:
    source = (TOOLS / tool).read_text()
    node = next(n for n in ast.parse(source).body if isinstance(n, ast.FunctionDef) and n.name == 'private_directory')
    return ast.get_source_segment(source, node) or ''


def refuses(source: str, case: str) -> bool:
    directory, case_home, case_temp = CASES[case]
    saved = {k: os.environ.get(k) for k in ('HOME', 'TMPDIR')}
    os.environ['HOME'], os.environ['TMPDIR'] = str(case_home), str(case_temp)
    tempfile.tempdir = None
    namespace = {'pathlib': pathlib, 'os': os, 'tempfile': tempfile}
    try:
        exec(compile(source, 'private_directory', 'exec'), namespace)
        namespace['private_directory'](directory)
        return False
    except SystemExit as stop:
        return 'refusing' in str(stop)
    finally:
        tempfile.tempdir = None
        for key, value in saved.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


MUTANTS = {  # clause dropped -> the one case that only it refuses
    'shared-directory-clause-dropped': ('        if resolved == directory or resolved in directory.parents:\n', '        if False:\n', 'home-empty'),
    'ancestor-clause-dropped': ('resolved == directory or resolved in directory.parents', 'resolved == directory', 'contains-missing-shared'),
    'occupied-clause-dropped': ('    if resolved.exists() and (not resolved.is_dir() or any(resolved.iterdir())):\n', '    if False:\n', 'occupied'),
}
mutants: list[dict] = []
for tool in INVOCATIONS:
    source = function_source(tool)
    base = {case: refuses(source, case) for case in CASES}
    for name, (old, new, case) in MUTANTS.items():
        assert source.count(old) == 1, (tool, name, source.count(old))
        mutated = refuses(source.replace(old, new, 1), case)
        mutants.append({'tool': tool, 'mutant': name, 'old': old, 'new': new, 'case': case, 'headRefuses': base[case], 'mutantRefuses': mutated, 'killed': base[case] and not mutated})

def wired(source: str) -> bool:
    """The call to `private_directory` (not its definition) comes before the first line that removes or makes a directory."""
    lines = source.splitlines()
    definition = next(i for i, line in enumerate(lines) if line.startswith('def private_directory'))
    after = definition + 1
    while after < len(lines) and (lines[after].startswith((' ', '\t')) or not lines[after].strip()):
        after += 1  # past the function body
    call = next((i for i in range(after, len(lines)) if 'private_directory(' in lines[i]), None)
    action = next((i for i in range(after, len(lines)) if re.search(r'rmtree\(|\.mkdir\(', lines[i])), None)
    return call is not None and action is not None and call < action


UNGUARD = {  # the tool's call, and what stands in for it
    'kill_then_fresh_run.py': ('TMP = private_directory(TMP)', 'TMP = TMP.resolve()'),
    'interrupt_probe.py': ('TMP = private_directory(TMP)', 'TMP = TMP.resolve()'),
    'cli_sweep_probe.py': ('TMP = private_directory(TMP)', 'TMP = TMP.resolve()'),
    'mutate_sweep.py': ('private_directory(pathlib.Path(sys.argv[3]))', 'pathlib.Path(sys.argv[3]).resolve()'),
}
wiring: list[dict] = []
for tool, (call, stand_in) in UNGUARD.items():
    source = (TOOLS / tool).read_text()
    assert source.count(call) == 1, (tool, call)
    unguarded = source.replace(call, stand_in, 1)
    wiring.append({'tool': tool, 'old': call, 'new': stand_in, 'guardBeforeFirstRemovalOrMkdir': wired(source), 'mutantWithoutTheCall': wired(unguarded),
                   'killed': wired(source) and not wired(unguarded)})

record = {'tool': 'guard_probe.py', 'treeCommit': HEAD, 'toolSha256': {t: hashlib.sha256((TOOLS / t).read_bytes()).hexdigest() for t in INVOCATIONS},
          'head': head, 'mutants': mutants, 'wiring': wiring,
          'holds': all(r['holds'] for r in head) and all(m['killed'] for m in mutants) and all(w['killed'] for w in wiring)}
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({'head': f"{sum(r['holds'] for r in head)}/{len(head)}", 'mutantsKilled': f"{sum(m['killed'] for m in mutants)}/{len(mutants)}",
                  'wiringKilled': f"{sum(w['killed'] for w in wiring)}/{len(wiring)}", 'holds': record['holds']}))
shutil.rmtree(PARENT, ignore_errors=True)
