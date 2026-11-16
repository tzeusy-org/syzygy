#!/usr/bin/env python3
"""Every mutant restated in the main record's item1/item3/item6 sections agrees with pins-mutants-2026-10-27.json (fragments,
commits, exits, failed tests). Usage: cross-check-sections.py <main record.json> <pins record.json>"""
import json, sys
rec = json.load(open(sys.argv[1])); pins = {r['id']: r for r in json.load(open(sys.argv[2]))['rows']}
rows = []
for p in rec['item1']['pins']: rows += p['mutants']
rows += rec['item1']['censusHelper']['mutants'] + rec['item3']['mutants'] + rec['item6']['mutants'] + [rec['item3']['negativeControl']]
bad = []
for m in rows:
    p = pins.get(m['mutantId'])
    if p is None: bad.append((m['mutantId'], 'not in pins')); continue
    if (m['file'], m['old'], m['new']) != (p['file'], p['old'], p['new']): bad.append((m['mutantId'], 'fragment'))
    b = m.get('survivesAtBase')
    if (b is None) != (p['before'] is None or p['beforeExpected'] == 'fail') and not (b is None and p['before'] is None):
        if not (p['beforeExpected'] == 'fail'): bad.append((m['mutantId'], 'base presence'))
    if b is not None and p['before'] is not None and (b['commit'], b['exit']) != (p['before']['commit'], p['before']['exit']): bad.append((m['mutantId'], 'base run'))
    a = m['killedAtTested']
    if (a['commit'], a['exit']) != (p['after']['commit'], p['after']['exit']) or sorted(a.get('failedTests', [])) != sorted(p['after']['failedTests']): bad.append((m['mutantId'], 'head run'))
print(json.dumps({'restated': len(rows), 'pinsRows': len(pins), 'notRestated': sorted(set(pins) - {m['mutantId'] for m in rows}), 'disagree': bad}))
sys.exit(1 if bad else 0)
