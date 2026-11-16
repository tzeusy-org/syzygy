#!/usr/bin/env python3
"""Compare two diff-probe.mjs outputs for syzygy-bpyt.6.4 row by row.

Usage: compare-probe.py <base.json> <head.json>

Rows: per model, its JSON digest and length, responseIdentity, unknownSubjects, and one row per served
route and Host form. Prints the file digests, the row counts by kind, and every differing row. Exit 1 when
any row differs, when the row keys differ, when either side errored, or when there are no rows.
"""
import hashlib
import json
import sys


def rows(d):
    out = []
    for m in d['models']:
        label = m['label']
        if 'error' in m:
            out.append((f'{label}:error', m['error']))
            continue
        out.append((f'{label}:model', [m['modelSha256'], m['modelBytes']]))
        out.append((f'{label}:responseIdentity', m['responseIdentity']))
        out.append((f'{label}:unknownSubjects', m['unknownSubjects']))
        for key, value in m['routes'].items():
            out.append((f'{label}:route:{key}', value))
    return out


def main():
    base_raw, head_raw = open(sys.argv[1], 'rb').read(), open(sys.argv[2], 'rb').read()
    rb, rh = rows(json.loads(base_raw)), rows(json.loads(head_raw))
    differ = []
    if [k for k, _ in rb] != [k for k, _ in rh]:
        differ.append({'row': '<row keys>'})
    for (kb, vb), (_, vh) in zip(rb, rh):
        if vb != vh:
            differ.append({'row': kb, 'base': vb, 'head': vh})
    kinds = {}
    for k, _ in rb:
        kind = k.split(':')[2] if k.split(':')[2] != 'route' else 'route'
        kinds[kind] = kinds.get(kind, 0) + 1
    errors = [k for k, _ in rb + rh if k.endswith(':error')]
    status = {}
    for k, v in rb:
        if ':route:' in k:
            status[v['status']] = status.get(v['status'], 0) + 1
    result = {
        'baseFile': {'sha256': hashlib.sha256(base_raw).hexdigest(), 'bytes': len(base_raw)},
        'headFile': {'sha256': hashlib.sha256(head_raw).hexdigest(), 'bytes': len(head_raw)},
        'models': len(json.loads(base_raw)['models']),
        'rowsCompared': len(rb),
        'rowsByKind': kinds,
        'routeRowsByStatus': status,
        'errors': errors,
        'rowsThatDiffer': len(differ),
        'differences': differ[:20],
    }
    print(json.dumps(result, indent=1))
    sys.exit(1 if differ or errors or not rb else 0)


if __name__ == '__main__':
    main()
