#!/usr/bin/env python3
"""Print the shape of chosen parts of the census record, never the whole record.

Usage: peek.py <census.json>
"""
import json
import sys

c = json.load(open(sys.argv[1]))
er = c['exposureRanking']
lg = er['longGapsInTheTrace']
print('exposureRanking keys:', list(er))
print('samplerGap:', json.dumps(er['samplerGap']))
print('longGaps (no perGap, no dependent):', json.dumps({k: v for k, v in lg.items() if k not in ('publishedClassesThatDependOnThem', 'gapsOfTwoIntervalsOrMore')}))
print('long totals:', json.dumps({k: v for k, v in lg['gapsOfTwoIntervalsOrMore'].items() if k != 'perGap'}))
print('perGap:', json.dumps(lg['gapsOfTwoIntervalsOrMore']['perGap']))
print('dependent:', json.dumps(lg['publishedClassesThatDependOnThem']))
print('top len:', len(er['top']), 'top[0]:', json.dumps(er['top'][0]))
lbs = c['leftBySIGKILL']
print('leftBySIGKILL type:', type(lbs).__name__, len(lbs))
first = lbs[0] if isinstance(lbs, list) else next(iter(lbs.items()))
print('leftBySIGKILL[0] keys:', list(first) if isinstance(first, dict) else (first[0], list(first[1])))
nb = c['namedInTheBeadObservation']
print('named keys:', list(nb))
print('named[0]:', json.dumps(next(iter(nb.values())))[:400])
print('neverLeft type:', type(c['neverLeftInTheseKills']).__name__, len(c['neverLeftInTheseKills']))
print('classCounts:', json.dumps(c['classCounts'])[:600])
print('runs c0-clean:', json.dumps(c['runs'].get('c0-clean'))[:400])
