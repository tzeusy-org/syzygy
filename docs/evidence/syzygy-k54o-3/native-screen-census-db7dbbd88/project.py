#!/usr/bin/env python3
"""Validate the exact owned screen/census trace and correlate its first refusal."""
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import sys

import bootstrap_schema as baseline

OUTCOMES = baseline.SAMPLER['child']['stop']
for stage in ('verify', 'confirm'):
    baseline.SAMPLER[stage] = {'begin': {'none'}, 'return': {'true', 'false'}, 'timer': {'deadline'},
                               'rejected': {'none'}, 'settled': {'none'}}
baseline.SAMPLER['confirm-return'] = {
    'guard-refused': {'inactive', 'exited', 'capture-finished', 'stopping', 'deadline'}
}

original_cause = baseline.cause
def sample_cause(row):
    return original_cause(row) or (row['stage'] == 'confirm' and row['event'] == 'return' and row['detail'] == 'false')
baseline.cause = sample_cause

OPERATIONS = {'initial', 'request', 'response'}
SCREEN_PHASES = {'entry', 'prepare', 'worker-open', 'worker-hash', 'worker-confirm', 'node-open',
                 'node-hash', 'node-confirm', 'pre-spawn', 'spawn', 'poll', 'result', 'finished'}
CENSUS_PHASES = {'storage-open', 'storage-opendir', 'storage-next', 'storage-stat-batch', 'storage-close',
                 'process-opendir', 'process-next', 'process-task-open', 'process-task-read', 'process-task-close'}

def score_census_items(items, started, last):
    if type(items) is not list or len(items) > (2 if last else 5):
        return False
    fields = {'stage', 'ordinal', 'population', 'elapsed'} | ({'endedBeforeSnapshot'} if last else set())
    seen = set()
    for item in items:
        if (type(item) is not dict or set(item) != fields or type(item['stage']) is not str
                or item['stage'] not in CENSUS_PHASES or not baseline.ordinal(item['ordinal'])
                or not baseline.ordinal(item['population']) or item['ordinal'] > started
                or item['population'] > (4 if item['stage'] == 'storage-stat-batch' else 1)
                or not baseline.finite(item['elapsed'])
                or last and not baseline.finite(item['endedBeforeSnapshot'])
                or item['ordinal'] in seen):
            return False
        seen.add(item['ordinal'])
    return True

def validate(line, row):
    if type(row) is not dict or type(row.get('component')) is not str:
        raise ValueError(f'invalid trace object at row {line}')
    component = row['component']
    if component in {'sampler', 'collector'}:
        baseline.validate(line, row)
        return
    if not baseline.finite(row.get('at')):
        raise ValueError(f'invalid timestamp at row {line}')
    if component == 'process':
        event, detail, code = row.get('event'), row.get('detail'), row.get('code')
        valid = (set(row) == {'component', 'event', 'at', 'launch', 'detail', 'code', 'signal'}
                 and baseline.ordinal(row.get('launch')) and (code is None or type(code) is int)
                 and row['signal'] in (None, 'SIGTERM', 'SIGKILL', 'other')
                 and type(event) is str and type(detail) is str
                 and (event == 'finished' and detail in OUTCOMES or event in {'error', 'exit', 'close'} and detail == 'none'))
    elif component == 'census-io':
        valid = (set(row) == {'component', 'boundary', 'launch', 'sample', 'started', 'pending', 'latest', 'at'}
                 and row['boundary'] in ('timer', 'guard') and baseline.ordinal(row['launch'])
                 and baseline.ordinal(row['sample']) and baseline.ordinal(row['started'], 0)
                 and score_census_items(row['pending'], row['started'], False)
                 and score_census_items(row['latest'], row['started'], True)
                 and not {item['ordinal'] for item in row['pending']} & {item['ordinal'] for item in row['latest']})
    elif component in {'screen', 'screen-current'}:
        shared = {'component', 'at', 'screen', 'operation', 'stage'}
        fields = {'event'} if component == 'screen' else {'ordinal', 'result', 'elapsed'}
        valid = (set(row) == shared | fields
                 and baseline.ordinal(row['screen'])
                 and type(row['operation']) is str and row['operation'] in OPERATIONS
                 and type(row['stage']) is str and row['stage'] in SCREEN_PHASES
                 and (row['event'] in ('begin', 'return', 'refused') if component == 'screen'
                      else baseline.ordinal(row['ordinal']) and baseline.finite(row['elapsed'])
                      and row['result'] in ('true', 'false', 'exception')))
    else:
        valid = False
    if not valid:
        raise ValueError(f'invalid closed row {line}')

def parse(raw):
    rows = []
    complete = False
    for i, line in enumerate(raw.splitlines(), 1):
        if complete:
            raise ValueError('row after collector summary')
        row = json.loads(line, object_pairs_hook=baseline.no_duplicate_keys)
        validate(i, row)
        if row['component'] == 'collector':
            if row['dropped']:
                raise ValueError('collector exceeded its bounded population')
            complete = True
            continue
        if rows and row['at'] < rows[-1]['at']:
            raise ValueError('non-monotonic trace')
        rows.append(row)
    if not complete:
        raise ValueError('missing collector summary')
    return rows

def distribution(calls):
    elapsed = sorted(row['elapsed'] for row in calls)
    return {'calls': len(elapsed), 'sumMs': round(sum(elapsed), 3), 'maxMs': round(max(elapsed), 3),
            'medianMs': round((elapsed[(len(elapsed)-1)//2] + elapsed[len(elapsed)//2])/2, 3),
            'refusals': sum(row['result'] != 'true' for row in calls)}

def screen_projection(rows, sample_begin, refusal_at):
    sequences = defaultdict(list)
    for row in rows:
        if row['component'] in {'screen', 'screen-current'}:
            sequences[row['screen']].append(row)
    projection = []
    for identity, sequence in sequences.items():
        stages = [row for row in sequence if row['component'] == 'screen']
        current = defaultdict(list)
        overlap = []
        for row in sequence:
            if row['component'] != 'screen-current':
                continue
            current[row['stage']].append(row)
            if sample_begin is not None:
                start = row['at'] - row['elapsed']
                stop = row['at']
                amount = min(stop, refusal_at) - max(start, sample_begin)
                if amount > 0:
                    overlap.append({'stage': row['stage'], 'ordinal': row['ordinal'], 'durationMs': round(row['elapsed'], 3),
                                    'beganFromSampleMs': round(start-sample_begin, 3), 'endedFromSampleMs': round(stop-sample_begin, 3),
                                    'overlapMs': round(amount, 3), 'result': row['result']})
        held_hashes = []
        for name in ('worker-hash', 'node-hash'):
            begin = next((row['at'] for row in stages if row['stage'] == name and row['event'] == 'begin'), None)
            end = next((row['at'] for row in stages if row['stage'] == name and row['event'] == 'return'), None)
            if begin is not None and sample_begin is not None:
                limit = end if end is not None else refusal_at
                held_hashes.append({'phase': name, 'startFromSampleMs': round(begin-sample_begin, 3),
                                    'endFromSampleMs': None if end is None else round(end-sample_begin, 3),
                                    'overlapMs': round(max(0, min(limit, refusal_at)-max(begin, sample_begin)), 3)})
        projection.append({'screen': identity, 'operation': sequence[0]['operation'], 'stages': stages,
                           'currentPerPhase': {phase: distribution(calls) for phase, calls in sorted(current.items())},
                           'hashPhasesInFirstFailingSample': held_hashes, 'currentCallsInFirstFailingSample': overlap})
    return projection

def project(raw):
    rows = parse(raw)
    start = next((row for row in rows if row['component'] == 'sampler' and row['stage'] == 'child'
                  and row['event'] == 'spawn' and row['launch'] >= 2), None)
    out = {'traceSha256': hashlib.sha256(raw).hexdigest(), 'eventCount': len(rows),
           'componentCounts': dict(sorted(Counter(row['component'] for row in rows).items())),
           'initialScreens': [], 'resumed': None}
    cutoff = None if start is None else start['at']
    out['initialScreens'] = screen_projection([row for row in rows if cutoff is None or row['at'] < cutoff], None, None)
    if start is None:
        return out
    window = [row for row in rows if row['at'] >= cutoff]
    launch = start['launch']
    selected = baseline.projected_launch(rows, launch, cutoff)
    interval = selected['inspection']
    pending = None
    sample_at, refusal_at = None, None
    if interval is not None:
        first = interval['first']
        census = next((row for row in interval['rowsForFailingSample'] if row['stage'] == 'census'), None)
        sample_at = None if census is None else census['at']
        refusal_at = first['at']
        pending = next((row for row in window if row['component'] == 'census-io' and row['launch'] == launch
                        and row['sample'] == first['sample']), None)
    confirmed = {row['sample'] for row in window if row['component'] == 'sampler' and row['launch'] == launch
                 and row['stage'] == 'confirm' and row['event'] == 'return' and row['detail'] == 'true'}
    out['resumed'] = {
        'spawn': start, 'sampler': selected, 'confirmedSamples': len(confirmed),
        'firstFailureCensusIo': pending,
        'nativeTerminal': [row for row in window if row['component'] == 'process' and row['launch'] == launch],
        'screens': screen_projection(window, sample_at, refusal_at),
    }
    return out

def encode(rows):
    return b''.join(json.dumps(row).encode() + b'\n' for row in rows)

def selftest():
    collector = {'component': 'collector', 'dropped': 0}
    spawn = {'component': 'sampler', 'launch': 2, 'sample': 0, 'stage': 'child', 'event': 'spawn',
             'detail': 'none', 'elapsed': 0, 'at': 1}
    sample = dict(spawn, stage='census', event='begin', detail='cadence', sample=1, at=10)
    current = {'component': 'screen-current', 'screen': 1, 'operation': 'initial', 'stage': 'node-hash',
               'ordinal': 2, 'result': 'true', 'elapsed': 7, 'at': 12}
    screen = {'component': 'screen', 'screen': 1, 'operation': 'initial', 'stage': 'node-hash', 'event': 'begin', 'at': 3}
    timer = dict(sample, stage='storage', event='timer', detail='deadline', elapsed=1001, at=1011)
    stop = dict(timer, stage='child', event='stop', detail='inspection-failed', at=1012)
    io = {'component': 'census-io', 'boundary': 'timer', 'launch': 2, 'sample': 1, 'started': 3,
          'pending': [{'stage': 'storage-next', 'ordinal': 3, 'population': 1, 'elapsed': 75}],
          'latest': [], 'at': 1011.01}
    result = project(encode([spawn, screen, sample, current, timer, io, stop, collector]))['resumed']
    assert result['firstFailureCensusIo'] == io
    assert result['screens'][0]['currentCallsInFirstFailingSample'][0]['overlapMs'] == 2
    assert result['screens'][0]['hashPhasesInFirstFailingSample'][0]['overlapMs'] == 1001
    confirm = dict(sample, stage='confirm', event='return', detail='false', elapsed=150, at=160)
    refused = dict(stop, at=161)
    confirmation = project(encode([spawn, sample, confirm, refused, collector]))['resumed']['sampler']['inspection']
    assert confirmation['first'] == confirm
    bad = [
        [dict(current, payload='synthetic-counterexample'), collector],
        [dict(current, stage='synthetic-counterexample'), collector],
        [dict(current, elapsed=float('inf')), collector],
        [dict(io, pending=[dict(io['pending'][0], path='synthetic-counterexample')]), collector],
        [dict(io, pending=[dict(io['pending'][0], ordinal=99)]), collector],
        [dict(io, pending=[dict(io['pending'][0], population=True)]), collector],
        [dict(io, pending=[dict(io['pending'][0], population=2)]), collector],
        [current, sample, collector], [current, dict(collector, dropped=1)], [current], [collector, collector],
    ]
    for rows in bad:
        try:
            project(encode(rows))
        except ValueError:
            continue
        raise AssertionError('closed trace accepted invalid fixture')
    print(f'{len(bad)} invalid trace variants rejected')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: project.py TRACE.jsonl or --selftest')
    if sys.argv[1] == '--selftest':
        selftest()
    else:
        print(json.dumps(project(Path(sys.argv[1]).read_bytes()), indent=2))
