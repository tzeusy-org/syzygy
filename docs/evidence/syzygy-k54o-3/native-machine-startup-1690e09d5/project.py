#!/usr/bin/env python3
"""Validate and project the adjacent closed trace from the owned fixture."""
from collections import Counter, defaultdict
from hashlib import sha256
from math import isfinite
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
TIMING = {'at', 'elapsed', 'syncMilliseconds', 'asyncMilliseconds'}
DOMAINS = {
    'machine': {
        'phase': set('entry entry-current canonical-root cold-subject store-open cold-binding terminal-check terminal-subject terminal-read terminal-current pre-allocation-current allocate allocate-current machine-ready rollback-close'.split()),
        'role': {None, 'author', 'inventory', 'fidelity', 'design'},
        'accepted': {None, True, False},
    },
    'store': {
        'phase': set('operation-start operation-timer operation-accepted operation-refused progress lock-release lock-retained'.split()),
        'step': set('entry lock-anchors lock-mkdir lock-directory-sync census callback read-state read-state-return write-entry rename-return write-directory-sync write-readback callback-return'.split()),
        'operationKind': {'allocation', 'exclusive'},
        'refusal': {'active', 'elapsed', 'deadline', 'authority', 'unknown'},
        'held': {True, False},
        'uncertain': {True, False},
    },
    'ordered': {
        'phase': set('entry prelaunch-render-enter prelaunch-render-refused prelaunch-render-return launched launch-registration-enter launch-registration-return delivery-commit-enter delivery-committed activated renewal-enter renewal-render-refused renewal-render-return renewal-adopted bootstrap-refused'.split()),
    },
    'sample': {
        'phase': {'sample-start', 'sample-current-false', 'sample-passed', 'sample-refused'},
        'stage': {'storage', 'process', 'current'},
    },
}
NUMBERS = {
    'machine': {'at', 'elapsed', 'ordinal'},
    'store': {'at', 'elapsed', 'ordinal', 'bound', 'syncChecks', 'asyncChecks', 'syncMilliseconds', 'asyncMilliseconds'},
    'ordered': {'at', 'round'},
    'sample': {'at', 'elapsed', 'ordinal', 'bound'},
}


class TraceError(Exception):
    pass


def closed_object(pairs):
    row = dict(pairs)
    if len(row) != len(pairs):
        raise TraceError
    return row


def trace_row(raw):
    try:
        row = json.loads(raw, object_pairs_hook=closed_object)
        component = row['component']
        domains, numbers = DOMAINS[component], NUMBERS[component]
        if set(row) != {'component', *domains, *numbers}:
            raise TraceError
        for key, domain in domains.items():
            if not any(type(row[key]) is type(choice) and row[key] == choice for choice in domain):
                raise TraceError
        for key in numbers:
            value = row[key]
            allowed = {int, float} if key in TIMING else {int}
            if type(value) not in allowed or not isfinite(value) or value < 0:
                raise TraceError
        if component == 'store' and row['bound'] not in {5000, 30000}:
            raise TraceError
        if component == 'sample' and row['bound'] != 1000:
            raise TraceError
        return row
    except (UnicodeError, ValueError, TypeError, KeyError) as error:
        raise TraceError from error


def artifact(path):
    data = path.read_bytes()
    return {'bytes': len(data), 'sha256': sha256(data).hexdigest()}


def main():
    source_path = ROOT / 'source-binding.json'
    source = json.loads(source_path.read_bytes())
    patch, trace = ROOT / 'overlay.patch', ROOT / 'trace.jsonl'
    if artifact(patch) != source['subject']['overlayPatch'] or artifact(trace) != source['traceByDigest']:
        raise SystemExit('retained diagnostic bytes changed')
    rows = []
    for number, line in enumerate(trace.read_bytes().splitlines(), 1):
        try:
            rows.append(trace_row(line))
        except TraceError:
            raise SystemExit(f'closed trace field refused on row {number}') from None
    operations = defaultdict(list)
    for row in rows:
        if row['component'] == 'store':
            operations[row['ordinal']].append(row)
    result = {
        'baseCommit': source['subject']['commit'],
        'sourceBinding': artifact(source_path),
        'closedTrace': {'rows': len(rows), 'components': dict(Counter(row['component'] for row in rows))},
        'machineCreation': [row for row in rows if row['component'] == 'machine'],
        'storeOperationTerminals': [events[-1] for events in operations.values()],
        'firstAllocationOperations': [events for events in operations.values() if events[0]['operationKind'] == 'allocation'][:8],
        'otherRefusedStoreOperations': [events for events in operations.values()
            if events[0]['operationKind'] != 'allocation' and any(row['phase'] == 'operation-refused' for row in events)][:8],
        'orderedPhases': [row for row in rows if row['component'] == 'ordered'],
        'designSamples': {
            'phases': dict(Counter(row['phase'] for row in rows if row['component'] == 'sample')),
            'nonSuccess': [row for row in rows if row['component'] == 'sample' and row['phase'] in {'sample-refused', 'sample-current-false'}],
        },
    }
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
