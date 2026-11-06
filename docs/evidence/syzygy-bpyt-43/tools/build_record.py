#!/usr/bin/env python3
"""Build the syzygy-bpyt.43 successor record; historical CPU evidence stays historical.

usage: python3 -I build_record.py TREE SUBJECT OUT.json CAMPAIGN-DIRECTORY

The masked emit comparison proves equality only of the named TypeScript-transpiled JavaScript bytes with comments
removed and CPU constants masked, under the identified compiler/options. It does not compare runner pragmas,
configuration/environment, imported modules or actual CPU. Type-only edits can pass; a @vitest-/@jest- pragma or
transitive busy loop can change execution while preserving that comparison. Equal emits do not characterize every
source difference. Current timing remains Unknown unless separately measured or justified by exact applicability.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

TREE, SUBJECT, OUT, CAMPAIGNS = Path(sys.argv[1]).resolve(), sys.argv[2], Path(sys.argv[3]), Path(sys.argv[4])
HERE = Path(__file__).resolve().parent
PREDECESSOR = 'docs/evidence/syzygy-bpyt-4-5'
TEST = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
INPUTS = ['apps/syzygy/src/main.ts', 'packages/polaris-dossier/src/state-directory.ts', 'packages/http-host/src/shutdown.ts', TEST]
HOOK = 'the daemon path never loads the POC app, and the `dossier render` branch does'
TEXT = 'every mention of the POC app in main.ts lies inside the `dossier` or the `polaris` branch'
PIN = 'each import is dynamic and inside the `dossier` or `polaris` branch'


def refuse(message):
    raise SystemExit(message)


def git(*args):
    return subprocess.check_output(['git', *args], cwd=TREE)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def population(commit):
    paths = [p for p in git('ls-tree', '-r', '-z', '--name-only', commit).decode().split('\0')
             if re.match(r'^(apps|packages)/', p) and re.search(r'\.test\.(?:ts|mts|js|mjs)$', p)]
    rows = []
    for path in paths:
        for line, text in enumerate(git('show', f'{commit}:{path}').decode().split('\n'), 1):
            if 'expect(cpuMsSince(' in text:
                match = re.search(r'\.toBeLessThan\((\w+)\)', text)
                if match is None:
                    refuse(f'{path}:{line}: unsupported timed assertion')
                rows.append({'path': path, 'line': line, 'bound': match.group(1)})
    return {'commit': commit, 'testFiles': len(paths), 'testPathsSha256': sha('\0'.join(paths).encode()), 'rows': rows}


SUBJECT = git('rev-parse', SUBJECT).decode().strip()
subject_inputs = {path: sha(git('show', f'{SUBJECT}:{path}')) for path in INPUTS}
predecessor = json.loads((TREE / PREDECESSOR / 'bounds-and-pins.json').read_text())
old_subject = predecessor['subject']
historical_args = [old_subject['base'], old_subject['main'], old_subject['evidenceCommit'],
                   predecessor['daemonEntry']['priorTestFrom'], predecessor['daemonEntry']['roundOneTestFrom'], SUBJECT]
with tempfile.TemporaryDirectory(prefix='clock-record-') as scratch:
    historical_output = Path(scratch) / 'historical.json'
    environment = {**os.environ, 'SYZYGY_CLOCK_HISTORICAL_OUTPUT': str(historical_output)}
    checked = subprocess.run([sys.executable, '-I', str(HERE / 'historical_record.py'), str(TREE), *historical_args],
                             capture_output=True, text=True, env=environment)
    if checked.returncode:
        refuse(checked.stderr.strip() or checked.stdout.strip())
    historical = json.loads(historical_output.read_text())

campaigns = {}
for name in ['head', 'base-test', 'prior-test', 'round1-test']:
    path = CAMPAIGNS / f'daemon-entry-{name}.json'
    campaigns[name] = json.loads(path.read_text())
    if campaigns[name]['commonInputs'] != subject_inputs:
        refuse(f'{name}: common current source/test inputs differ from the subject')
    selected = SUBJECT if name == 'head' else {'base-test': historical_args[0], 'prior-test': historical_args[3], 'round1-test': historical_args[4]}[name]
    expected_copy = sha(git('show', f'{selected}:{TEST}'))
    for row in campaigns[name]['results']:
        if row['selectedTestSha256'] != expected_copy:
            refuse(f'{name}: selected test-copy digest differs')
        mutant = row['mutant'] or {'id': 'control', 'kind': 'control'}
        if row.get('skipped'):
            if name == 'head' or mutant['kind'] != 'hook':
                refuse(f'{name}/{mutant["id"]}: an inadmissible skip')
        elif row.get('timeout') or row.get('buildFailure') or not row['rows']:
            refuse(f'{name}/{mutant["id"]}: no nonempty executed test population')
        if mutant['id'] == 'control' and (row['failed'] or not row['passed']):
            refuse(f'{name}: control failed or ran nothing')

head = campaigns['head']['results']
identities = [(row['mutant'] or {'id': 'control', 'kind': 'control'}) for row in head]
for name, campaign in campaigns.items():
    if [(r['mutant'] or {'id': 'control', 'kind': 'control'}) for r in campaign['results']] != identities:
        refuse(f'{name}: campaign mutant identities/fragments/population differ')


def failures(row):
    return {kind for title in row['failed'] for kind, text in [('hook', HOOK), ('text', TEXT), ('pin', PIN)] if text in title}


pin_false_refusals = ['E-comment-in-branch', 'E-renamed-binding', 'E-branch-swap', 'L2-nested-function-in-dossier',
                     'L3-nested-try-in-polaris', 'G1-allman-brace-and-wrapped-import', 'G2-commented-else-if-chain',
                     'G3-else-if-order-swap', 'G5-double-quoted-condition', 'G6-unspaced-condition', 'G7-parenthesised-condition']
attribution = []
for row in head:
    mutant = row['mutant'] or {'id': 'control', 'kind': 'control'}
    mid, kind = mutant['id'], mutant['kind']
    failed = failures(row)
    if kind == 'defect' and not row['failed']:
        refuse(f'{mid}: repaired test passes a daemon-path defect')
    if kind == 'hook' and 'hook' not in failed:
        refuse(f'{mid}: broken hook passes its positive control')
    if kind == 'static-defect':
        intended = [r for r in row['staticRows'] if r['status'] == 'failed'
                    and any('unsupported loader' in message for message in r['failureMessages'])]
        if not intended:
            refuse(f'{mid}: existing static loader predicate did not name the defect')
    if kind == 'equivalent':
        expected = {'pin', 'text'} if mid == 'C1-comment-outside-branches' else {'pin'} if mid in pin_false_refusals or mid == 'E-type-only-import' else set()
        if failed != expected or len(row['failed']) != len(expected):
            refuse(f'{mid}: equivalent row attribution {sorted(failed)} differs from {sorted(expected)}')
    if mid.startswith('Y') and 'text' not in failed:
        refuse(f'{mid}: compiler branch/control-flow predicate passes the defect')
    if mid in ['X2-close-failure-in-http-host', 'P-machine-transitive'] and 'hook' not in failed:
        refuse(f"{mid}: the runtime path's intended hook assertion did not fail")
    # Assertion failures must be identifiable; collection exceptions and timeouts cannot stand in for kills.
    for test in row['rows']:
        if test['status'] == 'failed' and (not test['failureMessages'] or any('timed out' in message.lower() for message in test['failureMessages'])):
            refuse(f'{mid}: timeout or unattributed failure is not a kill')
    attribution.append({'id': mid, 'kind': kind, 'failedRows': row['failed'], 'rowKinds': sorted(failed),
                        'passed': row['passed'], 'staticFailed': [r['title'] for r in row['staticRows'] if r['status'] == 'failed']})

current = population(SUBJECT)
old = population(old_subject['evidenceCommit'])
old_keys = {(r['path'], r['bound']) for r in old['rows']}
current_remainder = [r for r in current['rows'] if (r['path'], r['bound']) not in old_keys]
source_moves = [{'path': path, 'historicalSha256': sha(git('show', f'{old_subject["evidenceCommit"]}:{path}')),
                 'currentSha256': sha(git('show', f'{SUBJECT}:{path}'))} for path in sorted({r['path'] for r in old['rows']})]
record = {
    'schema': 'syzygy-bpyt-43-successor/1', 'bead': 'syzygy-bpyt.43',
    'subject': {'commit': SUBJECT, 'sourceInputs': subject_inputs,
                'diffFromBaselineSha256': sha(git('diff', '740279435178a882f1c2d526a2a7ea0bf2b52cbc', SUBJECT, '--', TEST))},
    'predecessor': {'path': f'{PREDECESSOR}/bounds-and-pins.json', 'sha256': sha((TREE / PREDECESSOR / 'bounds-and-pins.json').read_bytes()),
                    'subject': old_subject, 'role': 'historical; immutable; never relabeled as this landing subject'},
    'historicalCpuValidation': {'timings': 'historical', 'currentTiming': 'Unknown', 'args': historical_args,
                              'bounds': {site['bound']: site['separation'] for site in historical['sites'] if 'bound' in site},
                              'note': 'Stronger checks validate retained populations and margins at their recorded subjects. They do not establish present CPU behavior.'},
    'timedPopulations': {'historical': old, 'current': current, 'additionalCurrentSites': current_remainder,
                        'sourceMoves': source_moves, 'currentTiming': 'Unknown',
                        'note': 'Current whole population is emitted, including later .52/rmax bounds; none is silently declared measured by the historical four-site separation.'},
    'daemonEntry': {'campaigns': {name: {'commit': r['commit'], 'testFileFrom': r['testFileFrom'], 'rows': len(r['results']),
                                      'sha256': sha((CAMPAIGNS / f'daemon-entry-{name}.json').read_bytes())} for name, r in campaigns.items()},
                    'attribution': attribution, 'pinFalseRefusals': pin_false_refusals},
    'emitClaim': {'proves': 'Equality of masked TypeScript-transpiled JavaScript for named files under the recorded compiler/options only.',
                  'limits': ['leading runner pragmas', 'runner config/environment', 'imported modules', 'actual region CPU'],
                  'counterexamples': ['@vitest-/@jest-environment pragma', 'transitive region-module busy loop']},
    'tools': [{'name': p.name, 'sha256': sha(p.read_bytes())} for p in sorted(HERE.iterdir()) if p.is_file()],
}
OUT.write_text(json.dumps(record, indent=2, ensure_ascii=False) + '\n')
print(json.dumps({'subject': SUBJECT, 'campaigns': len(campaigns), 'mutantsPerCampaign': len(head),
                  'currentTimedFiles': current['testFiles'], 'currentTimedAssertions': len(current['rows']),
                  'additionalCurrentAssertions': len(current_remainder), 'currentTiming': 'Unknown', 'sha256': sha(OUT.read_bytes())}))
