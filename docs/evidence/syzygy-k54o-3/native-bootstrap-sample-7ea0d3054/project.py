#!/usr/bin/env python3
"""Validate every closed trace row, then project the first refusal for each launch."""
import hashlib
import json
import math
from pathlib import Path
import sys

SAMPLER = {
    'child': {'spawn': {'none'}, 'exit': {'none'},
              'stop': {'exited', 'launch-refused', 'stopped', 'wall-limit', 'output-limit',
                       'storage-limit', 'process-limit', 'inspection-failed'}},
    'census': {'begin': {'cadence'}},
    'storage': {'begin': {'none'}, 'return': {'none'}, 'timer': {'deadline'},
                'rejected': {'none'}, 'settled': {'none'}},
    'process': {'begin': {'none'}, 'return': {'counted', 'unavailable'}, 'timer': {'deadline'},
                'rejected': {'none'}, 'settled': {'none'}},
    'current': {'begin': {'none'}, 'return': {'true', 'false'}, 'timer': {'deadline'},
                'rejected': {'none'}, 'settled': {'none'}},
    'process-walk': {'rejected': {'none'}},
    'wait': {'begin': {'idle', 'pending'}, 'return': {'true', 'false'}},
}
for stage in ('storage-walk', 'storage-return', 'process-walk', 'process-return', 'current-return'):
    SAMPLER.setdefault(stage, {})['guard-refused'] = {'inactive', 'exited', 'capture-finished', 'stopping', 'deadline'}

PHASES = {
    'ordered': ('round', {'native-launch', 'history-write', 'history-commit', 'history-register',
                         'runtime-current', 'sample-drain', 'delivery-commit', 'delivery-read',
                         'activation-current', 'activation-drain', 'entry'}),
    'registration': ('registration', {'first-drain', 'initial-inspect', 'prompt-and-audit', 'second-drain',
                                      'snapshot-authority', 'committed-recheck', 'compose-and-snapshot', 'retention'}),
    'delivery': ('round', {'entry', 'launch-inspect', 'first-drain', 'product-inspect', 'second-drain',
                          'site-capture', 'audit-append'}),
    'authority': ('check', {'first-settlement', 'first-effect', 'independent', 'second-settlement',
                            'second-effect', 'settled-independent', 'settled-effect', 'exception'}),
}

def finite(value):
    return type(value) in (int, float) and math.isfinite(value) and value >= 0

def ordinal(value, floor=1):
    return type(value) is int and value >= floor

def validate(line, row):
    if type(row) is not dict:
        raise ValueError(f'row {line} is not an object')
    component = row.get('component')
    if component == 'collector':
        valid = set(row) == {'component', 'dropped'} and ordinal(row.get('dropped'), 0)
    elif component == 'sampler':
        valid = (set(row) == {'component', 'stage', 'event', 'detail', 'elapsed', 'launch', 'sample', 'at'}
                 and all(type(row[k]) is str for k in ('stage', 'event', 'detail'))
                 and row['detail'] in SAMPLER.get(row['stage'], {}).get(row['event'], set())
                 and ordinal(row['launch']) and ordinal(row['sample'], 0)
                 and finite(row['elapsed']) and finite(row['at']))
    elif type(component) is str and component in PHASES:
        key, stages = PHASES[component]
        valid = (set(row) == {'component', 'stage', 'event', 'at', key}
                 and type(row['stage']) is str and row['stage'] in stages
                 and row['event'] in ('begin', 'return', 'refused') and ordinal(row[key]) and finite(row['at']))
    else:
        valid = False
    if not valid:
        raise ValueError(f'row {line} violates the closed schema')

def no_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate JSON field')
        result[key] = value
    return result

def parse(raw):
    rows = []
    dropped = None
    for line, text in enumerate(raw.splitlines(), 1):
        row = json.loads(text, object_pairs_hook=no_duplicate_keys)
        validate(line, row)
        if dropped is not None:
            raise ValueError('unexpected row after collector summary')
        if row['component'] == 'collector':
            dropped = row['dropped']
            continue
        if rows and row['at'] < rows[-1]['at']:
            raise ValueError('non-monotonic trace')
        rows.append(row)
    if dropped is None:
        raise ValueError('missing collector summary')
    if dropped:
        raise ValueError('collector exceeded its bounded population')
    return rows

def spans(rows):
    opened = {}
    result = []
    for row in rows:
        component = row['component']
        if component not in PHASES:
            continue
        key = PHASES[component][0]
        phase = (component, key, row[key], row['stage'])
        if row['event'] == 'begin':
            opened.setdefault(phase, []).append(row['at'])
        elif opened.get(phase):
            result.append((phase, opened[phase].pop(), row['at'], row['event']))
    for phase, starts in opened.items():
        result.extend((phase, start, None, None) for start in starts)
    return result

def cause(row):
    return (row['event'] in ('timer', 'guard-refused', 'rejected')
            or row['stage'] == 'current' and row['event'] == 'return' and row['detail'] == 'false'
            or row['stage'] == 'process' and row['event'] == 'return' and row['detail'] == 'unavailable')

def projected_launch(rows, launch, spawn):
    sample_rows = [row for row in rows if row['component'] == 'sampler' and row['launch'] == launch]
    stop = next((row for row in sample_rows if row['event'] == 'stop'), None)
    exit_row = next((row for row in sample_rows if row['event'] == 'exit'), None)
    candidate = {'launch': launch, 'spawnAt': spawn,
                 'sampleCount': sum(row['stage'] == 'census' for row in sample_rows),
                 'stop': stop, 'exit': exit_row, 'inspection': None}
    if stop and stop['detail'] == 'inspection-failed':
        sample = stop['sample']
        interval = [row for row in sample_rows if row['sample'] == sample]
        begin = next((row['at'] for row in interval if row['stage'] == 'census'), stop['at'])
        first = next((row for row in interval if row['at'] <= stop['at'] and cause(row)), stop)
        phase_rows = [row for row in rows if row['at'] >= spawn and row['at'] <= stop['at']]
        overlap = []
        for (component, key, ident, stage), started, ended, outcome in spans(phase_rows):
            if started > first['at'] or ended is not None and ended < begin:
                continue
            overlap.append({'component': component, key: ident, 'stage': stage,
                            'beginFromSampleMs': round(started - begin, 3),
                            'endFromSampleMs': None if ended is None else round(ended - begin, 3),
                            'outcome': outcome,
                            'openAtFirstRefusal': ended is None or ended >= first['at']})
        overlap.sort(key=lambda phase: phase['beginFromSampleMs'])
        candidate['inspection'] = {'first': first, 'rowsForFailingSample': interval,
                                   'overlappingPhases': overlap}
    return candidate

def project(raw):
    rows = parse(raw)
    launches = [projected_launch(rows, row['launch'], row['at']) for row in rows
                if row['component'] == 'sampler' and row['event'] == 'spawn']
    orders = [row for row in rows if row['component'] == 'ordered']
    return {'traceSha256': hashlib.sha256(raw).hexdigest(), 'eventCount': len(rows), 'launches': launches,
            'orderedChronology': orders}

def selftest():
    def raw(*rows):
        return b''.join(json.dumps(row).encode() + b'\n' for row in rows)
    summary = {'component': 'collector', 'dropped': 0}
    phase = {'component': 'ordered', 'round': 2, 'stage': 'history-register', 'event': 'begin', 'at': 2}
    sampler = {'component': 'sampler', 'launch': 1, 'sample': 0, 'stage': 'child', 'event': 'spawn',
               'detail': 'none', 'elapsed': 0, 'at': 1}
    begin = dict(sampler, sample=1, stage='census', event='begin', detail='cadence', at=3)
    timer = dict(begin, stage='storage', event='timer', detail='deadline', elapsed=1003, at=1006)
    stop = dict(timer, stage='child', event='stop', detail='inspection-failed', at=1007)
    assert project(raw(sampler, phase, begin, timer, stop, summary))['launches'][0]['inspection']['first'] == timer
    variants = [
        raw(dict(sampler, opaque='fixture-counterexample'), summary),
        raw(dict(sampler, detail='unrecognized'), summary),
        raw(dict(sampler, launch=True), summary),
        raw(dict(sampler, elapsed=float('inf')), summary),
        raw(sampler, dict(summary, dropped=1)),
        raw(sampler),
        raw(summary, sampler),
        raw(phase, sampler, summary),
        b'{"component":"collector","dropped":0,"dropped":0}\n',
    ]
    for index, variant in enumerate(variants):
        try:
            project(variant)
        except ValueError:
            continue
        raise AssertionError(f'invalid trace variant {index + 1} survived')
    print(f'{len(variants)} invalid trace variants rejected')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: project.py TRACE.jsonl or --selftest')
    if sys.argv[1] == '--selftest':
        selftest()
    else:
        print(json.dumps(project(Path(sys.argv[1]).read_bytes()), indent=2))
