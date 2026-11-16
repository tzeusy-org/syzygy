#!/usr/bin/env python3
"""Does scratch_trace.cjs see what it claims to see? Run it on a fixture, then on mutated copies of itself.

Usage: trace_selftest.py <worktree> <out.json> <private-directory>

trace_fixture.mjs makes, directly in its temp directory: three directories by mkdtemp (sync, promise, callback), two by mkdir,
two files by writeFile, one symlink, and one more mkdtemp from a child Node process; and, inside one of the directories, two entries
the trace must not log (they are not directly in the temp directory). The expectation is stated as literals below, never read from
the preload. Each mutant of the preload (one wrapper family dropped, the directly-in-temp test removed, the prefix not recorded,
the log variable ignored) must fail the expectation; the unmutated preload must meet it; and a run without the log variable must write
no trace file. <private-directory> must not exist or be empty and be a short absolute path outside the shared temp directory.
"""
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
WT, OUT, PRIVATE = pathlib.Path(sys.argv[1]).resolve(), pathlib.Path(sys.argv[2]).resolve(), pathlib.Path(sys.argv[3])
resolved = PRIVATE.resolve()
assert PRIVATE.is_absolute() and len(str(PRIVATE)) <= 30, 'give a short absolute path'
assert str(resolved) not in ('/', str(pathlib.Path.home().resolve()), str(pathlib.Path(tempfile.gettempdir()).resolve())), 'a shared directory'
assert not resolved.exists() or (resolved.is_dir() and not any(resolved.iterdir())), 'it exists and is not an empty directory'
PRELOAD = HERE / 'scratch_trace.cjs'
SOURCE = PRELOAD.read_text()

EXPECTED = {('mkdtemp', 'st-sync-'), ('mkdtemp', 'st-promise-'), ('mkdtemp', 'st-callback-'), ('mkdtemp', 'st-child-'),
            ('mkdir', 'st-fixed-dir'), ('mkdir', 'st-promise-dir'), ('writeFile', 'st-file.txt'), ('writeFile', 'st-promise-file.txt'), ('symlink', 'st-link')}
FORBIDDEN_NAMES = ('nested', 'st-nested-')  # inside st-fixed-dir: never logged
LISTING = re.compile(r'st-(sync|promise|callback|child)-[A-Za-z0-9]{6}|st-fixed-dir|st-promise-dir|st-file\.txt|st-promise-file\.txt|st-link')  # every name the fixture itself leaves


def run(preload: pathlib.Path, with_log: bool = True) -> dict:
    case = PRIVATE / f'case-{preload.stem}-{int(with_log)}'
    tmp = case / 'tmp'
    tmp.mkdir(parents=True)
    log = case / 'trace.jsonl'
    env = {**os.environ, 'TMPDIR': str(tmp), 'SCRATCH_TRACE_ROOT': str(WT), 'NODE_OPTIONS': f'--require {preload}'}
    if with_log:
        env['SCRATCH_TRACE_LOG'] = str(log)
    else:
        env.pop('SCRATCH_TRACE_LOG', None)
    ran = subprocess.run(['node', str(HERE / 'trace_fixture.mjs')], cwd=WT, env=env, capture_output=True, text=True, timeout=120)
    lines = [json.loads(l) for l in log.read_text().splitlines()] if log.exists() else []
    listing = sorted(p.name for p in tmp.iterdir())
    got = {(l['kind'], l.get('prefix') if l['kind'] == 'mkdtemp' else os.path.basename(l['path'])) for l in lines}
    stray = [n for n in listing if not LISTING.fullmatch(n)]
    return {'exit': ran.returncode, 'traceFileExists': log.exists(), 'lines': len(lines), 'got': sorted(got, key=str), 'listing': listing, 'strayEntriesInTheTempDirectory': stray,
            'missing': sorted(EXPECTED - got, key=str), 'unexpected': sorted(got - EXPECTED, key=str),
            'forbiddenLogged': [l['path'] for l in lines if any(f in l['path'] for f in FORBIDDEN_NAMES)],
            'creatorFrameNamesTheFixture': all(any('trace_fixture.mjs' in f for f in l['frames']) for l in lines if l['kind'] != 'mkdtemp' or l.get('prefix') != 'st-child-'),
            'childTraced': len({l['pid'] for l in lines}) == 2,
            'meets': got == EXPECTED and ran.returncode == 0 and not stray and not any(any(f in l['path'] for f in FORBIDDEN_NAMES) for l in lines)}


def mutant(name: str, old: str, new: str) -> pathlib.Path:
    assert SOURCE.count(old) == 1, (name, SOURCE.count(old))
    path = PRIVATE / f'mutant-{name}.cjs'
    path.write_text(SOURCE.replace(old, new))
    return path


MUTANTS = {
    'sync-wrappers-dropped': ("for (const [name, kind, pick] of [['mkdtempSync'", "for (const [name, kind, pick] of [] || [['mkdtempSync'"),
    'callback-wrappers-dropped': ("for (const [name, kind, pick] of [['mkdtemp', 'mkdtemp', created.mkdtemp], ['mkdir', 'mkdir', created.path], ['writeFile', 'writeFile', created.path], ['symlink', 'symlink', created.link]]) wrapCallback", "for (const [name, kind, pick] of []) wrapCallback"),
    'promise-wrappers-dropped': ("for (const [name, kind, pick] of [['mkdtemp', 'mkdtemp', created.mkdtemp], ['mkdir', 'mkdir', created.path], ['writeFile', 'writeFile', created.path], ['symlink', 'symlink', created.link]]) wrapPromise", "for (const [name, kind, pick] of []) wrapPromise"),
    'directly-in-temp-test-removed': ("return path.dirname(resolved) === path.resolve(os.tmpdir()) ? resolved : undefined;", "return resolved;"),
    'prefix-not-recorded': ("kind === 'mkdtemp' ? { prefix: prefixOf(args[0]) } : {});\n      return result;", "{});\n      return result;"),
    'log-variable-defaults-to-the-temp-directory': ("const log = process.env.SCRATCH_TRACE_LOG;", "const log = process.env.SCRATCH_TRACE_LOG || require('node:path').join(require('node:os').tmpdir(), 'trace-default.jsonl');"),
}
shutil.rmtree(PRIVATE, ignore_errors=True)
PRIVATE.mkdir(parents=True)
try:
    record: dict = {'tool': 'trace_selftest.py', 'preloadSha256': __import__('hashlib').sha256(SOURCE.encode()).hexdigest(), 'expected': sorted(EXPECTED),
                    'forbiddenNames': list(FORBIDDEN_NAMES)}
    record['unmutated'] = run(PRELOAD)
    record['withoutLogVariable'] = run(PRELOAD, with_log=False)
    record['withoutLogVariable']['meets'] = not record['withoutLogVariable']['traceFileExists'] and record['withoutLogVariable']['exit'] == 0 and not record['withoutLogVariable']['strayEntriesInTheTempDirectory']
    record['mutants'] = {}
    for name, (old, new) in MUTANTS.items():
        path = mutant(name, old, new)
        result, bare = run(path), run(path, with_log=False)
        bare_meets = not bare['traceFileExists'] and bare['exit'] == 0 and not bare['strayEntriesInTheTempDirectory']
        record['mutants'][name] = {'old': old, 'new': new, 'killed': not result['meets'] or not bare_meets, 'killedByTheRunWithTheLogVariable': not result['meets'], 'killedByTheRunWithoutIt': not bare_meets,
                                   'missing': result['missing'], 'unexpected': result['unexpected'], 'forbiddenLogged': result['forbiddenLogged'], 'strayWithoutTheVariable': bare['strayEntriesInTheTempDirectory'], 'exit': result['exit']}
finally:
    shutil.rmtree(PRIVATE, ignore_errors=True)
record['holds'] = record['unmutated']['meets'] and record['withoutLogVariable']['meets'] and all(m['killed'] for m in record['mutants'].values())
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({'unmutated': record['unmutated']['meets'], 'noLogVariable': record['withoutLogVariable']['meets'], 'killed': {n: m['killed'] for n, m in record['mutants'].items()}, 'holds': record['holds']}))
