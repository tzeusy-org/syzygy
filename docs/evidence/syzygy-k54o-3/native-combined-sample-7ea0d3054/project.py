#!/usr/bin/env python3
"""Validate the combined closed trace and preserve the order of competing refusals."""
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import sys

import bootstrap_schema as bootstrap
import transport_schema as transport

STORE = {
    'publication', 'lock-anchors', 'lock-mkdir', 'root-sync', 'census', 'lease-operation',
    'lease-read', 'state-read', 'archive-read', 'archive-decode', 'preflight',
    'reserve', 'publish', 'synchronize', 'audit', 'commit', 'write', 'write-temp', 'write-rename',
    'publication-boundary', 'publication-deadline', 'current-sync', 'current-async',
}
STORE_FIELDS = {'component', 'stage', 'event', 'at', 'elapsed', 'publication'}

def parse(raw):
    rows = []
    complete = False
    for line, text in enumerate(raw.splitlines(), 1):
        row = json.loads(text, object_pairs_hook=bootstrap.no_duplicate_keys)
        if type(row) is not dict or type(row.get('component')) is not str or complete:
            raise ValueError(f'invalid row {line}')
        component = row['component']
        if component in bootstrap.PHASES or component == 'sampler':
            bootstrap.validate(line, row)
        elif component == 'store':
            if (set(row) != STORE_FIELDS or type(row['stage']) is not str or row['stage'] not in STORE
                    or row['event'] not in ('begin', 'return', 'refused', 'contended', 'exception')
                    or not bootstrap.ordinal(row['publication']) or not bootstrap.finite(row['elapsed'])
                    or not bootstrap.finite(row['at'])):
                raise ValueError(f'invalid store row {line}')
        else:
            transport.validate(line, row)
        if component == 'collector':
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

def encode(rows):
    return b''.join(json.dumps(row).encode() + b'\n' for row in rows)

def transport_slice(rows):
    points = []
    for row in rows:
        comp = row['component']
        if comp in transport.COMPONENTS and comp != 'sampler':
            points.append(row)
        elif comp == 'sampler' and row['stage'] == 'child' and row['event'] in ('spawn', 'stop'):
            points.append({k: v for k, v in row.items() if k not in ('sample', 'detail')})
            if row['event'] == 'stop':
                points[-1]['event'] = row['detail']
    return transport.project(encode([*points, {'component': 'collector', 'dropped': 0}]))

def transport_refusal(row):
    comp, stage, event = row['component'], row['stage'], row['event']
    if comp == 'connection':
        return event in ('refused', 'timer') or event == 'return' and row['detail'] in ('refused', 'deadline')
    if comp == 'host':
        return event in ('poison', 'timer') or stage.startswith('health-')
    return comp in ('relay', 'broker') and event == 'poison'

def sampled_successes(rows, launch, before_sample):
    clean = set()
    revoked = set()
    for row in rows:
        if row['component'] != 'sampler' or row['launch'] != launch or row['sample'] >= before_sample:
            continue
        if row['stage'] == 'current' and row['event'] == 'return' and row['detail'] == 'true':
            clean.add(row['sample'])
        if bootstrap.cause(row):
            revoked.add(row['sample'])
    return len(clean - revoked)

def store_projection(rows, start, end):
    opened = defaultdict(list)
    spans = []
    for row in rows:
        if row['component'] != 'store':
            continue
        key = (row['publication'], row['stage'])
        if row['event'] == 'begin':
            opened[key].append(row)
        elif opened[key]:
            spans.append((opened[key].pop(), row))
    spans.extend((begin, None) for starts in opened.values() for begin in starts)
    overlap = []
    for begin, stop in spans:
        if begin['at'] > end or stop is not None and stop['at'] < start:
            continue
        elapsed = min(end, stop['at'] if stop else end) - max(start, begin['at'])
        overlap.append({'publication': begin['publication'], 'phase': begin['stage'],
                        'beginFromSampleMs': round(begin['at'] - start, 3),
                        'endFromSampleMs': None if stop is None else round(stop['at'] - start, 3),
                        'observedOverlapMs': round(max(0, elapsed), 3),
                        'openAtRefusal': stop is None or stop['at'] > end,
                        'outcome': None if stop is None else stop['event']})
    overlap.sort(key=lambda row: row['beginFromSampleMs'])
    distribution = {}
    for mode in ('current-sync', 'current-async'):
        entries = [row for row in overlap if row['phase'] == mode]
        durations = [row['observedOverlapMs'] for row in entries]
        distribution[mode] = {'count': len(entries), 'observedOverlapMs': round(sum(durations), 3),
                              'maxOverlapMs': max(durations, default=0)}
    return {'stages': overlap, 'authorityWithinSample': distribution}

def project(raw):
    rows = parse(raw)
    resumed = next((r for r in rows if r['component'] == 'sampler' and r['stage'] == 'child'
                    and r['event'] == 'spawn' and r['launch'] >= 2), None)
    trans = transport_slice(rows)
    result = {'traceSha256': hashlib.sha256(raw).hexdigest(), 'eventCount': len(rows),
              'resumedLaunch': None, 'firstFailure': trans['firstResumedFailure'],
              'firstTransportRefusal': None, 'transportWindow': trans['freshLaunchWindow']}
    if resumed is None:
        return result
    window = trans['freshLaunchWindow']
    poison = next((row for row in window['chronology'] if transport_refusal(row)), None)
    result['firstTransportRefusal'] = poison
    launch = bootstrap.projected_launch(rows, resumed['launch'], resumed['at'])
    result['resumedLaunch'] = launch
    if launch['inspection'] is not None:
        cause = launch['inspection']['first']
        census = next(row for row in launch['inspection']['rowsForFailingSample'] if row['stage'] == 'census')
        launch['inspection']['priorSucceededSamples'] = sampled_successes(rows, resumed['launch'], cause['sample'])
        launch['inspection']['storeOverlap'] = store_projection(rows, census['at'], cause['at'])
        if poison is not None:
            launch['inspection']['firstTransportRefusalDeltaMs'] = round(poison['at'] - cause['at'], 3)
    return result

def selftest():
    summary = {'component': 'collector', 'dropped': 0}
    spawn = {'component': 'sampler', 'launch': 2, 'sample': 0, 'stage': 'child', 'event': 'spawn',
             'detail': 'none', 'elapsed': 0, 'at': 1}
    passing = dict(spawn, sample=1, stage='current', event='return', detail='true', at=2)
    begin = dict(spawn, sample=2, stage='census', event='begin', detail='cadence', at=5)
    store = {'component': 'store', 'publication': 1, 'stage': 'current-sync', 'event': 'begin', 'elapsed': 0, 'at': 7}
    fired = dict(begin, stage='storage', event='timer', detail='deadline', elapsed=1001, at=1006)
    stop = dict(fired, stage='child', event='stop', detail='inspection-failed', at=1007)
    poison = {'component': 'relay', 'role': 'design', 'relay': 1, 'stage': 'close', 'event': 'poison', 'at': 1008}
    end = dict(store, event='return', at=1019, elapsed=1012)
    rows = [spawn, passing, begin, store, fired, stop, poison, end, summary]
    result = project(encode(rows))['resumedLaunch']['inspection']
    assert result['priorSucceededSamples'] == 1
    assert result['firstTransportRefusalDeltaMs'] == 2
    assert result['storeOverlap']['stages'][0]['openAtRefusal'] is True
    assert result['storeOverlap']['authorityWithinSample']['current-sync']['observedOverlapMs'] == 999
    invalid = [
        encode([dict(store, body='fixture-counterexample'), summary]),
        encode([dict(store, publication=False), summary]),
        encode([dict(store, stage='opaque'), summary]),
        encode([dict(store, elapsed=float('inf')), summary]),
        encode([store, dict(summary, dropped=1)]),
        encode([summary, store]),
        encode([store]),
    ]
    for case in invalid:
        try:
            project(case)
        except ValueError:
            continue
        raise AssertionError('combined trace mutation survived')
    print(f'{len(invalid)} invalid combined trace variants rejected')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: project.py TRACE.jsonl or --selftest')
    if sys.argv[1] == '--selftest':
        selftest()
    else:
        print(json.dumps(project(Path(sys.argv[1]).read_bytes()), indent=2))
