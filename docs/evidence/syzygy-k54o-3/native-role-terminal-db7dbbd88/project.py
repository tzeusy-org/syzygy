#!/usr/bin/env python3
"""Validate a closed db7 diagnostic and project competing failure boundaries."""
from collections import Counter, defaultdict
from pathlib import Path
import hashlib
import json
import sys

import bootstrap_schema as bootstrap
import transport_schema as transport

OUTCOMES = bootstrap.SAMPLER['child']['stop']
REFUSAL = {'inactive', 'exited', 'capture-finished', 'stopping', 'deadline'}
PHASES = {'begin', 'return', 'refused'}
for stage in ('verify', 'confirm'):
    bootstrap.SAMPLER[stage] = {'begin': {'none'}, 'return': {'true', 'false'}, 'timer': {'deadline'},
                                'rejected': {'none'}, 'settled': {'none'}}
bootstrap.SAMPLER['confirm-return'] = {'guard-refused': REFUSAL}
bootstrap.PHASES['ordered'][1].update({
    'delivery-assert', 'attempt-current', 'current-drain', 'product-authority', 'renew-render', 'renew-delivery'
})
transport.HOST['request-check'] = PHASES
transport.SUPERVISOR.update({
    'terminal-observed': OUTCOMES, 'terminal-expected': {'refused'}, 'terminal-audit': PHASES
})

COMMON = {'component', 'stage', 'event', 'at'}
PEER_STAGES = {'pre-check', 'parent', 'mid-check', 'kernel', 'sample-drain', 'post-check'}
PEER_EDGES = {'capture-or-read', 'effect-enter', 'lease-peer', 'post-audit-peer'}
EFFECT_STAGES = {'effect-enter', 'scope', 'exclusive', 'lease-peer', 'lease-read', 'lease-check', 'peer-audit',
                 'post-audit-peer', 'pre-effect-boundary', 'host-effect', 'post-effect-boundary'}
HELD_ASYNC = {'before-held', 'before-record', 'policy', 'after-held', 'stopped-bytes', 'after-record'}
HELD_SYNC = {'sync-held', 'sync-authority', 'sync-marker', 'sync-stopped-bytes', 'sync-exception'}

def validate(line, row):
    if type(row) is not dict or type(row.get('component')) is not str:
        raise ValueError(f'invalid object at row {line}')
    component = row['component']
    if component in bootstrap.PHASES or component == 'sampler':
        bootstrap.validate(line, row)
        return
    if component not in {'process', 'peer-current', 'peer-effect', 'held-authority'}:
        transport.validate(line, row)
        return
    if not bootstrap.finite(row.get('at')) or type(row.get('event')) is not str:
        raise ValueError(f'invalid timestamp or event at row {line}')
    if component == 'process':
        event, detail, code = row['event'], row.get('detail'), row.get('code')
        valid = (set(row) == {'component', 'event', 'at', 'launch', 'detail', 'code', 'signal'}
                 and bootstrap.ordinal(row.get('launch')) and (code is None or type(code) is int)
                 and row['signal'] in (None, 'SIGTERM', 'SIGKILL', 'other')
                 and type(detail) is str and (event == 'finished' and detail in OUTCOMES
                 or event in {'error', 'exit', 'close'} and detail == 'none'))
    elif type(row.get('stage')) is not str:
        valid = False
    elif component == 'peer-current':
        valid = (set(row) == COMMON | {'check', 'edge'} and bootstrap.ordinal(row.get('check'))
                 and type(row['edge']) is str and row['edge'] in PEER_EDGES
                 and row['stage'] in PEER_STAGES and row['event'] in PHASES)
    elif component == 'peer-effect':
        valid = (set(row) == COMMON | {'effect'} and bootstrap.ordinal(row.get('effect'))
                 and row['stage'] in EFFECT_STAGES and row['event'] in PHASES)
    else:
        valid = (set(row) == COMMON | {'check'} and bootstrap.ordinal(row.get('check'), 0)
                 and (row['check'] == 0 and row['stage'] in HELD_SYNC and row['event'] == 'false'
                      or row['check'] > 0 and row['stage'] in HELD_ASYNC
                      and row['event'] in {'begin', 'true', 'false', 'exception'}))
    if not valid:
        raise ValueError(f'invalid closed {component} row {line}')

def parse(raw):
    rows = []
    complete = False
    for ordinal, text in enumerate(raw.splitlines(), 1):
        if complete:
            raise ValueError('row after collector summary')
        row = json.loads(text, object_pairs_hook=bootstrap.no_duplicate_keys)
        validate(ordinal, row)
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

def encode(rows):
    return b''.join(json.dumps(row).encode() + b'\n' for row in rows)

def first(rows, **match):
    return next((row for row in rows if all(row.get(key) == value for key, value in match.items())), None)

def stage_lengths(rows, origin):
    opened = {}
    all_spans = []
    for row in rows:
        component = row['component']
        identity = tuple(row.get(key) for key in ('launch', 'sample', 'check', 'effect', 'host', 'round', 'connection', 'edge'))
        stage = (component, row.get('stage'), identity)
        if row['event'] == 'begin':
            opened[stage] = row
            continue
        if row['event'] in {'return', 'refused', 'false', 'true', 'timer', 'exception', 'rejected'} and stage in opened:
            all_spans.append((opened.pop(stage), row))
    all_spans.extend((begin, None) for begin in opened.values())
    return [{'begin': begin, 'end': end, 'durationMs': None if end is None else round(end['at'] - begin['at'], 3),
             'startFromAnchorMs': round(begin['at'] - origin, 3)}
            for begin, end in sorted(all_spans, key=lambda pair: pair[0]['at'])]

def refusal(row):
    comp, event = row['component'], row['event']
    if comp == 'connection':
        return event in {'timer', 'refused'} or event == 'return' and row['detail'] in {'refused', 'deadline'}
    if comp == 'supervisor':
        return row['stage'] == 'failure' and row['resumed']
    if comp in {'host', 'relay', 'broker'}:
        return event in {'poison', 'refused', 'timer'}
    if comp in {'peer-current', 'peer-effect', 'ordered', 'authority'}:
        return event == 'refused'
    if comp == 'held-authority':
        return event in {'false', 'exception'}
    return comp == 'sampler' and (event in {'stop', 'timer', 'guard-refused'}
                                 or row['stage'] == 'confirm' and row['detail'] == 'false')

def distribution(values):
    values = sorted(values)
    if not values:
        return {'count': 0}
    return {'count': len(values), 'minMs': values[0], 'medianMs': round((values[(len(values) - 1)//2] + values[len(values)//2])/2, 3), 'maxMs': values[-1]}

def project(raw):
    rows = parse(raw)
    start = next((row for row in rows if row['component'] == 'sampler'
                  and row['stage'] == 'child' and row['event'] == 'spawn' and row['launch'] >= 2), None)
    result = {'traceSha256': hashlib.sha256(raw).hexdigest(), 'eventCount': len(rows),
              'componentCounts': dict(sorted(Counter(r['component'] for r in rows).items())),
              'firstResumedFailure': first(rows, component='supervisor', stage='failure', resumed=True),
              'freshLaunch': None}
    if start is None:
        return result
    launch = start['launch']
    window = [row for row in rows if row['at'] >= start['at']]
    inference = first(window, component='peer-effect', stage='peer-audit', event='return')
    terminal = [row for row in window if row['component'] == 'process' and row['launch'] == launch]
    sample = [row for row in window if row['component'] == 'sampler' and row['launch'] == launch]
    stop = first(sample, stage='child', event='stop')
    inspection = bootstrap.projected_launch(rows, launch, start['at'])['inspection']
    sample_results = [row for row in sample if row['event'] == 'return' and row['stage'] in ('current', 'confirm')
                      and row['detail'] == 'true']
    admitted = {row['sample'] for row in sample_results if row['stage'] == 'confirm'}
    failed_sample = stop['sample'] if stop and stop['detail'] == 'inspection-failed' else None
    if inspection is not None:
        prior = {row['sample'] for row in sample if row['sample'] < failed_sample and row['stage'] == 'census'}
        inspection['priorCensusCount'] = len(prior)
        inspection['priorConfirmedCount'] = len(admitted & prior)
        anchor = first(inspection['rowsForFailingSample'], stage='census', event='begin')
        if anchor:
            ranges = stage_lengths(window, anchor['at'])
            inspection['overlap'] = [span for span in ranges if span['begin']['component'] in
                                     {'held-authority', 'peer-current', 'peer-effect', 'ordered', 'authority'}
                                     and span['begin']['at'] <= stop['at']
                                     and (span['end'] is None or span['end']['at'] >= anchor['at'])]
    anchor = inference['at'] if inference else start['at']
    after_audit = [row for row in window if row['at'] >= anchor]
    distinct = {}
    for row in after_audit:
        if refusal(row):
            distinct.setdefault(row['component'], row)
    candidates = [row for row in after_audit if row['component'] in
                  {'peer-current', 'peer-effect', 'process', 'connection', 'host', 'relay', 'broker', 'ordered', 'supervisor'}]
    stage_data = defaultdict(list)
    for span in stage_lengths(sample, start['at']):
        if (span['begin']['stage'] in {'storage', 'process', 'verify', 'current', 'confirm'}
                and span['durationMs'] is not None and span['end']['event'] == 'return'):
            stage_data[span['begin']['stage']].append(span['durationMs'])
    result['freshLaunch'] = {
        'start': start, 'terminal': terminal, 'stop': stop, 'inspection': inspection,
        'sampleCounts': {'census': sum(row['stage'] == 'census' for row in sample), 'confirmed': len(admitted)},
        'sampleTimeDistributions': {stage: distribution(values) for stage, values in sorted(stage_data.items())},
        'firstInferenceAuditReturn': inference, 'firstByComponentAfterAnchor': distinct,
        'postAnchorChronology': [dict(row, msFromAnchor=round(row['at'] - anchor, 3)) for row in candidates[:120]],
        'postAnchorChronologyPopulation': len(candidates),
    }
    return result

def selftest():
    collector = {'component': 'collector', 'dropped': 0}
    child = {'component': 'sampler', 'stage': 'child', 'event': 'spawn', 'detail': 'none',
             'launch': 2, 'sample': 0, 'elapsed': 0, 'at': 1}
    phase = {'component': 'peer-effect', 'effect': 1, 'stage': 'peer-audit', 'event': 'return', 'at': 2}
    peer = {'component': 'peer-current', 'check': 1, 'edge': 'post-audit-peer',
            'stage': 'kernel', 'event': 'refused', 'at': 4}
    held = {'component': 'held-authority', 'check': 0, 'stage': 'sync-held', 'event': 'false', 'at': 3}
    stop = dict(child, event='stop', detail='inspection-failed', sample=2, at=5)
    process = {'component': 'process', 'event': 'finished', 'detail': 'inspection-failed', 'launch': 2, 'code': None,
               'signal': 'SIGTERM', 'at': 6}
    result = project(encode([child, phase, held, peer, stop, process, collector]))['freshLaunch']
    assert result['firstInferenceAuditReturn'] == phase
    assert result['firstByComponentAfterAnchor']['peer-current'] == peer
    assert result['terminal'] == [process]
    bad = [
        [dict(peer, body='synthetic-counterexample'), collector],
        [dict(peer, edge='synthetic-counterexample'), collector],
        [dict(peer, at=float('inf')), collector],
        [dict(held, check=True), collector],
        [dict(held, check=1), collector],
        [dict(process, signal='synthetic-counterexample'), collector],
        [dict(process, code=True), collector],
        [peer, held, collector],
        [peer, dict(collector, dropped=1)],
        [peer], [collector, collector],
    ]
    for rows in bad:
        try:
            project(encode(rows))
        except ValueError:
            continue
        raise AssertionError('closed trace accepted invalid fixture')
    print(f'{len(bad)} invalid trace fixtures refused')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('usage: project.py TRACE.jsonl or --selftest')
    if sys.argv[1] == '--selftest':
        selftest()
    else:
        print(json.dumps(project(Path(sys.argv[1]).read_bytes()), indent=2))
