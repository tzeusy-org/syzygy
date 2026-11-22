#!/usr/bin/env python3
"""Validate the owned transport trace and project the original connection deadlines."""
import hashlib
import json
import math
from pathlib import Path
import sys

ROLE = {'author', 'inventory', 'fidelity', 'design'}
FAILURE = {'binding-changed', 'launch-unavailable', 'audit-unavailable', 'control-unavailable',
           'role-ended', 'transport-unavailable', 'provenance-unavailable', 'cleanup-unconfirmed', 'cpu-budget'}
CONNECTION = {
    'open': {'begin': {'none'}, 'return': {'accepted'}, 'refused': {'initial', 'exception'}},
    'capture': {'begin': {'none'}, 'return': {'accepted', 'refused'}, 'timer': {'deadline'}, 'refused': {'late'}},
    'capture-port': {'return': {'accepted', 'refused'}},
    'authorize': {'begin': {'none'}, 'return': {'accepted', 'refused', 'deadline'},
                  'timer': {'deadline'}, 'refused': {'before', 'after'}},
    'stream': {'timer': {'deadline'}, 'closed': {'raw'}, 'refused': {'raw'}},
    'stream-read': {'refused': {'native-null', 'closed', 'deadline', 'pump'}},
    'stream-write': {'refused': {'boundary'}},
}
RELAY = {'raw': {'begin', 'closed', 'refused'}, 'raw-limit': {'refused'},
         'raw-open': {'return', 'poison'}, 'http-entry': {'begin', 'poison'},
         'first-current': {'begin', 'return', 'refused'}}
RELAY.update(dict.fromkeys(('http-refusal', 'http-deadline', 'response-close', 'response-error',
                            'raw-exception', 'stream-error', 'listener-error', 'close'), {'poison'}))
BROKER = {'raw': {'begin', 'closed', 'refused'}, 'raw-limit': {'refused'}}
BROKER.update(dict.fromkeys(('raw-open', 'context', 'frame-deadline', 'stream-error', 'frame-size',
                             'frame-parse', 'invocation', 'raw-exception', 'listener-error'), {'poison'}))
HOST = {'activation': {'begin', 'return', 'refused'}, 'activation-cutoff': {'scheduled', 'timer', 'poison'},
        'ready': {'return'}, 'close': {'begin'}}
HOST.update(dict.fromkeys(('activation-rejected', 'request', 'relay-audit-outcome', 'relay-audit-exception',
                          'broker-effect', 'broker-fault'), {'poison'}))
HOST.update(dict.fromkeys(('health-closing', 'health-poisoned', 'health-relay'), {'refused'}))
SUPERVISOR = {'failure': FAILURE}
SUPERVISOR.update(dict.fromkeys(('effect-stop', 'effect-control', 'effect-cpu', 'effect-health',
                                 'effect-budget', 'effect-claim'), {'refused'}))
MACHINE = {'accept': {'begin'}, 'accept-authority': {'refused'}, 'native-capture': {'begin'},
           'authorize': {'begin'}, 'authorize-authority': {'refused'}, 'authorize-slot': {'refused'},
           'authorize-publish': {'begin', 'return', 'refused'}}
SAMPLER = {'child': {'spawn', 'exited', 'launch-refused', 'stopped', 'wall-limit', 'output-limit',
                     'storage-limit', 'process-limit', 'inspection-failed'},
           'sample-current': {'refused'}, 'sample-operation': {'refused'}}
COMPONENTS = {'connection': CONNECTION, 'relay': RELAY, 'broker': BROKER, 'host': HOST,
              'supervisor': SUPERVISOR, 'machine': MACHINE, 'sampler': SAMPLER}
COMMON = {'component', 'stage', 'event', 'at'}
EXTRA = {'connection': {'edge', 'connection', 'detail', 'bound'}, 'relay': {'role', 'relay'},
         'broker': {'broker'}, 'host': {'host'}, 'supervisor': {'resumed'}, 'machine': {'edge'},
         'sampler': {'launch', 'elapsed'}}

def number(value, lower=0, upper=None):
    return (type(value) in (int, float) and math.isfinite(value) and value >= lower
            and (upper is None or value <= upper))

def ordinal(value, floor=1):
    return type(value) is int and value >= floor

def validate(line, row):
    if type(row) is not dict or type(row.get('component')) is not str:
        raise ValueError(f'row {line} lacks an object schema')
    comp = row['component']
    if comp == 'collector':
        if set(row) == {'component', 'dropped'} and ordinal(row['dropped'], 0):
            return
        raise ValueError('invalid collector summary')
    if (comp not in COMPONENTS or set(row) != COMMON | EXTRA[comp]
            or type(row['event']) is not str or type(row['stage']) is not str or not number(row['at'])):
        raise ValueError(f'row {line} violates its closed schema')
    options = COMPONENTS[comp].get(row['stage'], {})
    valid = row['event'] in options
    if comp == 'connection':
        valid = (valid and type(row['detail']) is str and row['detail'] in options[row['event']]
                 and row['edge'] in ('relay', 'broker', 'other') and ordinal(row['connection'])
                 and number(row['bound'], upper=180_000))
    elif comp == 'relay':
        valid = valid and type(row['role']) is str and row['role'] in ROLE and ordinal(row['relay'])
    elif comp in ('broker', 'host'):
        valid = valid and ordinal(row[comp])
    elif comp == 'supervisor':
        valid = valid and type(row['resumed']) is bool
    elif comp == 'machine':
        valid = valid and row['edge'] in ('mcp-shim', 'inference-bridge')
    else:
        valid = valid and ordinal(row['launch']) and number(row['elapsed'])
    if not valid:
        raise ValueError(f'row {line} has an invalid closed field value')

def no_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate JSON field')
        result[key] = value
    return result

def parse(raw):
    rows = []
    summary = False
    for i, line in enumerate(raw.splitlines(), 1):
        row = json.loads(line, object_pairs_hook=no_duplicate_keys)
        if summary:
            raise ValueError('row after collector summary')
        validate(i, row)
        if row['component'] == 'collector':
            if row['dropped']:
                raise ValueError('collector exceeded its bounded population')
            summary = True
            continue
        if rows and row['at'] < rows[-1]['at']:
            raise ValueError('non-monotonic trace')
        rows.append(row)
    if not summary:
        raise ValueError('missing collector summary')
    return rows

def project(raw):
    rows = parse(raw)
    resumed_spawns = [row for row in rows if row['component'] == 'sampler'
                      and row['event'] == 'spawn' and row['launch'] >= 2]
    resumed_effects = [row for row in rows if row['component'] == 'supervisor' and row['resumed']]
    truth = {'traceSha256': hashlib.sha256(raw).hexdigest(), 'eventCount': len(rows),
             'resumedSpawns': resumed_spawns, 'firstResumedFailure': next((r for r in resumed_effects
             if r['stage'] == 'failure'), None), 'freshLaunchWindow': None}
    if not resumed_spawns:
        return truth
    spawn = resumed_spawns[0]
    previous = next((row for row in reversed(rows) if row['component'] == 'host'
                     and row['stage'] == 'activation-cutoff' and row['event'] == 'scheduled'
                     and row['at'] <= spawn['at']), None)
    begins = spawn['at'] if previous is None else previous['at']
    end = next((row for row in rows if row['component'] == 'sampler' and row['launch'] == spawn['launch']
                and row['stage'] == 'child' and row['event'] != 'spawn'), None)
    window = [row for row in rows if row['at'] >= begins and (end is None or row['at'] <= end['at'] + 2500)]
    connection_rows = {}
    for row in window:
        if row['component'] == 'connection':
            connection_rows.setdefault(row['connection'], []).append(row)
    intervals = []
    for ordinal_, points in connection_rows.items():
        phases = {}
        for stage in ('capture', 'authorize'):
            started = next((row for row in points if row['stage'] == stage and row['event'] == 'begin'), None)
            if started is None:
                continue
            phases[stage] = {'boundMs': started['bound'],
                             'events': [dict(row, elapsedSincePhaseMs=round(row['at'] - started['at'], 3))
                                        for row in points if row['stage'] == stage and row['event'] != 'begin'
                                        or stage == 'capture' and row['stage'] == 'capture-port']}
        intervals.append({'connection': ordinal_, 'edge': points[0]['edge'], 'phases': phases})
    truth['freshLaunchWindow'] = {'start': previous or spawn, 'end': end, 'connectionIntervals': intervals,
                                  'chronology': [dict(row, msFromSpawn=round(row['at'] - spawn['at'], 3)) for row in window]}
    return truth

def selftest():
    def raw(*values):
        return b''.join(json.dumps(row).encode() + b'\n' for row in values)
    collector = {'component': 'collector', 'dropped': 0}
    capture = {'component': 'connection', 'stage': 'capture', 'event': 'begin', 'at': 10,
               'edge': 'relay', 'connection': 1, 'detail': 'none', 'bound': 5000}
    spawn = {'component': 'sampler', 'stage': 'child', 'event': 'spawn', 'at': 1, 'launch': 2, 'elapsed': 0}
    expired = dict(capture, event='timer', detail='deadline', at=5011, bound=0)
    projected = project(raw(spawn, capture, expired, collector))['freshLaunchWindow']
    lived = projected['connectionIntervals'][0]['phases']['capture']['events'][0]
    assert lived['elapsedSincePhaseMs'] == 5001 and lived['event'] == 'timer'
    invalid = [
        raw(dict(capture, raw='synthetic-fixture-counterexample'), collector),
        raw(dict(capture, detail='unknown'), collector), raw(dict(capture, bound=float('inf')), collector),
        raw(dict(capture, connection=False), collector), raw(capture, collector, capture),
        raw(capture, dict(collector, dropped=1)), raw(capture), raw(capture, spawn, collector),
        b'{"component":"collector","dropped":0,"dropped":0}\n',
    ]
    for bad in invalid:
        try:
            project(bad)
        except ValueError:
            pass
        else:
            raise AssertionError('invalid trace survived')
    print(f'{len(invalid)} invalid trace variants rejected')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: project.py TRACE.jsonl or --selftest')
    if sys.argv[1] == '--selftest':
        selftest()
    else:
        print(json.dumps(project(Path(sys.argv[1]).read_bytes()), indent=2))
