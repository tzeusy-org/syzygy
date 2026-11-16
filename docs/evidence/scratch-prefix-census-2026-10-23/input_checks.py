#!/usr/bin/env python3
"""Does assemble_census.py refuse inputs that are not the ones its records name, and does each refusal die when its check is removed?

Usage: input_checks.py <worktree> <commit> <static-sites.json> <runs-directory> <scratch-directory> <out.json>

Copies <runs-directory> into <scratch-directory> (a short absolute path that does not exist or is empty), runs the assembler on the
copy as a control (it must succeed, write its record, and leave nothing in its probe directory), then on copies each corrupted in
one way, and requires the assembler to stop with a non-zero exit and the message named below. The corruptions: one byte of a trace
changed; one line of a trace removed; a run record naming another commit; the static census naming another commit; a run's sampler
record missing; one byte of a run's sampler record changed; a run's entry removed from sampler-digests.json.

Then, for three mutants of the assembler (the text of one check replaced, old and new stored), it reruns the case that check
guards and requires that the case is no longer refused (or, for the probe directory, that the control no longer meets). The
mutated assembler runs from a copy of the six tool files. It removes <scratch-directory> at the end.
"""
import gzip
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
WT, COMMIT, STATIC, RUNS, SCRATCH, OUT = (pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]).resolve(), pathlib.Path(sys.argv[4]).resolve(),
                                          pathlib.Path(sys.argv[5]), pathlib.Path(sys.argv[6]).resolve())
assert SCRATCH.is_absolute() and len(str(SCRATCH)) <= 12 and (not SCRATCH.exists() or (SCRATCH.is_dir() and not any(SCRATCH.iterdir()))), 'give a short absolute scratch directory (at most 12 bytes: the assembler\'s probe path must stay within 30) that is empty'
LABEL = 'k2-kill-75s'
OTHER_COMMIT = '0' * 40
TOOLS = ('assemble_census.py', 'census_run.py', 'collect_runs.py', 'scratch_trace.cjs', 'static_sites.py', 'tmp_sampler.py')
SAMPLER_MESSAGE = 'the sampler record is not the one the digest file names'


def case(name: str, change, assembler: pathlib.Path = HERE / 'assemble_census.py', directory: str = '') -> dict:
    root = SCRATCH / (directory or name)
    runs, static = root / 'runs', root / 'static.json'
    shutil.copytree(RUNS, runs)
    shutil.copyfile(STATIC, static)
    change(runs, static)
    ran = subprocess.run([sys.executable, '-I', str(assembler), str(WT), COMMIT, str(static), str(runs), str(root / 'probe'), str(root / 'out.json')],
                         capture_output=True, text=True, timeout=600)
    return {'exit': ran.returncode, 'lastLine': (ran.stderr.strip().splitlines() or [''])[-1][:200], 'wroteTheRecord': (root / 'out.json').exists(), 'probeDirectoryLeftBehind': (root / 'probe').exists()}


def trace_edit(edit):
    def apply(runs, static):
        path = runs / f'{LABEL}.trace.jsonl.gz'
        raw = gzip.decompress(path.read_bytes())
        path.write_bytes(gzip.compress(edit(raw), mtime=0))
    return apply


def record_edit(runs, static):
    path = runs / f'{LABEL}.json'
    record = json.loads(path.read_text())
    record['treeCommit'] = OTHER_COMMIT
    path.write_text(json.dumps(record))


def static_edit(runs, static):
    record = json.loads(static.read_text())
    record['treeCommit'] = OTHER_COMMIT
    static.write_text(json.dumps(record))


def sampler_byte_changed(runs, static):
    path = runs / f'{LABEL}.samples.json'
    raw = bytearray(path.read_bytes())
    at = raw.index(b'"seconds": ') + len(b'"seconds": ')
    assert chr(raw[at]).isdigit(), 'the byte to change is a digit, so the record stays valid JSON and only its digest can refuse it'
    raw[at] = ord(str((int(chr(raw[at])) + 1) % 10))
    path.write_bytes(bytes(raw))


def sampler_digest_removed(runs, static):
    path = runs / 'sampler-digests.json'
    record = json.loads(path.read_text())
    del record['sha256'][LABEL]
    path.write_text(json.dumps(record))


CASES = {
    'trace-byte-changed': (trace_edit(lambda raw: raw[:100] + bytes([raw[100] ^ 1]) + raw[101:]), 'the trace is not the one the record names'),
    'trace-line-removed': (trace_edit(lambda raw: raw.split(b'\n', 1)[1]), 'the trace is not the one the record names'),
    'run-record-names-another-commit': (record_edit, 'the run names another commit'),
    'static-census-names-another-commit': (static_edit, 'the static census names another commit'),
    'sampler-record-missing': (lambda runs, static: (runs / f'{LABEL}.samples.json').unlink(), 'FileNotFoundError'),
    'sampler-record-byte-changed': (sampler_byte_changed, SAMPLER_MESSAGE),
    'sampler-digest-entry-removed': (sampler_digest_removed, SAMPLER_MESSAGE),
}
# Each mutant replaces the text of one check in the assembler; `case` names the check it guards ('control' for the probe directory).
MUTANTS = {
    'sampler-digest-not-compared': ('and hashlib.sha256(raw_samples).hexdigest() == sampler_digests[label],', 'and True,', 'sampler-record-byte-changed'),
    'sampler-digest-entry-not-required': ('assert label in sampler_digests and hashlib.sha256(raw_samples).hexdigest() == sampler_digests[label],',
                                          'assert hashlib.sha256(raw_samples).hexdigest() == sampler_digests.get(label, hashlib.sha256(raw_samples).hexdigest()),', 'sampler-digest-entry-removed'),
    'probe-directory-left-behind': ("    shutil.rmtree(PROBE / 'tmp', ignore_errors=True)\n    if probe_made_here:\n        PROBE.rmdir()\n", '    pass\n', 'control'),
}


def refused(got: dict, message: str) -> bool:
    return got['exit'] != 0 and message in got['lastLine'] and not got['wroteTheRecord']


shutil.rmtree(SCRATCH, ignore_errors=True)
SCRATCH.mkdir(parents=True)
try:
    record = {'tool': 'input_checks.py', 'treeCommit': COMMIT, 'assemblerSha256': hashlib.sha256((HERE / 'assemble_census.py').read_bytes()).hexdigest(), 'runsChecked': LABEL}
    record['control'] = case('control', lambda runs, static: None)
    record['control']['meets'] = record['control']['exit'] == 0 and record['control']['wroteTheRecord'] and not record['control']['probeDirectoryLeftBehind']
    record['cases'] = {}
    for name, (change, message) in CASES.items():
        got = case(name, change)
        got['expectedMessage'] = message
        got['refused'] = refused(got, message)
        record['cases'][name] = got
    record['mutants'] = {}
    source = (HERE / 'assemble_census.py').read_text()
    for index, (name, (old, new, guarded)) in enumerate(MUTANTS.items()):
        assert source.count(old) == 1, (name, source.count(old))
        tools = SCRATCH / f't{index}'
        tools.mkdir()
        for tool in TOOLS:
            shutil.copyfile(HERE / tool, tools / tool)
        (tools / 'assemble_census.py').write_text(source.replace(old, new, 1))
        change, message = (lambda runs, static: None, None) if guarded == 'control' else CASES[guarded]
        got = case(name, change, tools / 'assemble_census.py', f'm{index}')
        if guarded == 'control':
            got['meets'] = got['exit'] == 0 and got['wroteTheRecord'] and not got['probeDirectoryLeftBehind']
            killed = not got['meets']
        else:
            got['refused'] = refused(got, message)
            killed = not got['refused']
        record['mutants'][name] = {'old': old, 'new': new, 'guards': guarded, 'result': got, 'killed': killed}
finally:
    shutil.rmtree(SCRATCH, ignore_errors=True)
record['holds'] = record['control']['meets'] and all(c['refused'] for c in record['cases'].values()) and all(m['killed'] for m in record['mutants'].values())
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({'control': record['control']['meets'], 'refused': {n: c['refused'] for n, c in record['cases'].items()}, 'mutantsKilled': {n: m['killed'] for n, m in record['mutants'].items()}, 'holds': record['holds']}))
sys.exit(0 if record['holds'] else 1)
