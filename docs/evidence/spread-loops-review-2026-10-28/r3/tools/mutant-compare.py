#!/usr/bin/env python3
"""Compare my re-run of spread-mutants.py with the lane's retained output, and read each kill's failure messages.

Usage: mutant-compare.py <lane spread-mutants-output.json> <my output json> <tmpdir holding the vitest reports> <test-delta-output.json>
Prints one JSON object: per row, whether detectors, failing tests, fragments and mutated-file sha256 equal the lane's; the distinct
first lines of each failing test's messages; and whether BASE's failing tests are all new tests.
"""
import json
import os
import re
import sys

lane_path, mine_path, tmpdir, delta_path = sys.argv[1:5]
lane = {r['id']: r for r in json.load(open(lane_path))['rows']}
mine = json.load(open(mine_path))
delta = json.load(open(delta_path))
added = {f'{os.path.basename(f)}::{t}' for f, t, _ in delta['added']}
out = {'summary': mine['summary'], 'rows': []}
for row in mine['rows']:
    other = lane.get(row['id'], {})
    label = 'control' if row['id'].startswith('CONTROL') else row['id'].split('-')[0]
    report = json.load(open(os.path.join(tmpdir, f'{label}.json')))
    messages, timeouts = {}, 0
    for result in report['testResults']:
        for t in result['assertionResults']:
            if t['status'] != 'failed':
                continue
            text = ' | '.join(m.split('\n')[0] for m in t.get('failureMessages', []))
            timeouts += bool(re.search(r'timed out', text, re.I))
            messages[t['fullName']] = text[:300]
    failing_keys = set()
    for result in report['testResults']:
        for t in result['assertionResults']:
            if t['status'] == 'failed':
                failing_keys.add(f"{os.path.basename(result['name'])}::{' '.join(t['ancestorTitles'] + [t['title']])}")
    out['rows'].append({
        'id': row['id'],
        'outcome': row.get('outcome'),
        'failing': len(row['failingTests']),
        'equalsLane': {k: row.get(k) == other.get(k) for k in ('detectors', 'replacements', 'mutatedFileSha256')}
        | {'failingTests': sorted(row['failingTests']) == sorted(other.get('failingTests', []))},
        'laneRanAt': other.get('ranAt'),
        'timeouts': timeouts,
        'allFailingAreNewTests': failing_keys <= added,
        'notNew': sorted(failing_keys - added),
        'messages': messages if len(messages) <= 12 else {'distinct': sorted(set(messages.values()))[:12], 'count': len(messages)},
    })
print(json.dumps(out, indent=1))
