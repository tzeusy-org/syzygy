#!/usr/bin/env python3
"""Project the closed trace from the owned exact-1690 audit setup probe."""
from collections import defaultdict
from math import isfinite
from pathlib import Path
import argparse
import json

EVENTS = set(
    'setup-entry cutoff-start stage-entry stage-return segment-created '
    'current-entry current-return filesystem-entry filesystem-return declaration-committed '
    'first-refusal setup-refused setup-ready'.split()
)
STAGES = set(
    'input profiles parent-current parent-realpath parent-open parent-stat '
    'segment-open segment-stat directory-sync identities declaration-build '
    'declaration-prefix-before declaration-write declaration-file-sync declaration-directory-sync '
    'declaration-prefix-after return'.split()
)
CAUSES = set(
    'guard-poisoned guard-closing guard-deadline timer-current timer-filesystem '
    'current-false current-threw constructor-input constructor-profile '
    'parent-identity segment-identity prefix-mismatch constructor-refused'.split()
)
COUNTS = {'ordinal', 'bound', 'currentChecks', 'created', 'declarations', 'filesystem', 'callbacks'}
CLOCKS = {'at', 'elapsed', 'remaining'}
FLAGS = {'poisoned', 'closing'}
DOMAINS = {
    'event': EVENTS, 'mode': {'initial', 'resumed'}, 'stage': STAGES,
    'role': {None, 'author', 'inventory', 'fidelity', 'design'}, 'accepted': {None, False, True},
    'firstCause': CAUSES | {None},
}


class ClosedTraceError(Exception):
    pass


def unique(pairs):
    result = dict(pairs)
    if len(result) != len(pairs):
        raise ClosedTraceError
    return result


def row(raw):
    try:
        result = json.loads(raw, object_pairs_hook=unique)
        if set(result) != (set(DOMAINS) | COUNTS | CLOCKS | FLAGS):
            raise ClosedTraceError
        for key, values in DOMAINS.items():
            if not any(type(result[key]) is type(item) and result[key] == item for item in values):
                raise ClosedTraceError
        for key in COUNTS:
            if type(result[key]) is not int or result[key] < 0:
                raise ClosedTraceError
        for key in CLOCKS:
            value = result[key]
            if key == 'remaining' and value is None:
                continue
            if type(value) not in {int, float} or not isfinite(value) or (key != 'remaining' and value < 0):
                raise ClosedTraceError
        if any(type(result[key]) is not bool for key in FLAGS):
            raise ClosedTraceError
        if result['ordinal'] < 1 or result['bound'] != 5000 or result['created'] > 4 or result['declarations'] > 4:
            raise ClosedTraceError
        return result
    except (TypeError, UnicodeError, ValueError, KeyError) as error:
        raise ClosedTraceError from error


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('trace', type=Path)
    args = parser.parse_args()
    groups = defaultdict(list)
    count = 0
    for line in args.trace.read_bytes().splitlines():
        count += 1
        try:
            event = row(line)
        except ClosedTraceError:
            raise SystemExit(f'closed trace field refused on row {count}') from None
        groups[event['ordinal']].append(event)
    audits = []
    for ordinal, events in groups.items():
        terminal = [event for event in events if event['event'] in {'setup-refused', 'setup-ready'}]
        if len(terminal) > 1:
            raise SystemExit(f'duplicate constructor terminal for ordinal {ordinal}')
        current_starts = {event['currentChecks']:event for event in events if event['event'] == 'current-entry'}
        current_timings = []
        for event in events:
            if event['event'] != 'current-return':
                continue
            begin = current_starts.get(event['currentChecks'])
            if begin is None or begin['at'] > event['at']:
                raise SystemExit(f'currentness return without entry for ordinal {ordinal}')
            current_timings.append({
                'stage': event['stage'], 'role': event['role'], 'accepted': event['accepted'],
                'elapsed': round(event['at'] - begin['at'], 3),
            })
        audits.append({
            'ordinal': ordinal, 'mode': events[-1]['mode'],
            'firstRefusal': next((event for event in events if event['event'] == 'first-refusal'), None),
            'terminal': terminal[0] if terminal else None,
            'physicalSegmentCreations': [event for event in events if event['event'] == 'segment-created'],
            'durableDeclarations': [event for event in events if event['event'] == 'declaration-committed'],
            'currentTimings': current_timings,
            'pendingCurrentOrdinal': max(current_starts) if len(current_starts) > len(current_timings) else None,
            'stages': [event for event in events if event['event'] in {'stage-entry', 'stage-return', 'cutoff-start'}],
        })
    print(json.dumps({'validatedRows': count, 'constructors': audits}, indent=2))


if __name__ == '__main__':
    main()
