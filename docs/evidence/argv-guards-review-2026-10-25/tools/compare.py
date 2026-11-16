"""rev-524: pair mut.py results at base and head by id, print one row per mutant, and count outcomes.

Usage: python3 -I compare.py <base.json> <head.json> [<lane record.json>]
"""
import collections, json, sys

base = {r['id']: r for r in json.load(open(sys.argv[1]))['results']}
head = {r['id']: r for r in json.load(open(sys.argv[2]))['results']}
lane = {}
if len(sys.argv) > 3:
    lane = {r['id']: r['verdict'].replace('passes', 'survives') for r in json.load(open(sys.argv[3]))['results']}
pairs = collections.Counter()
for key in head:
    b = base.get(key, {})
    h = head[key]
    bo = b.get('outcome', 'n/a (' + b['error'].split(': ', 1)[1] + ')' if 'error' in b else 'n/a')
    ho = h.get('outcome', 'ERROR ' + h.get('error', ''))
    pairs[(bo if not bo.startswith('n/a') else 'n/a', ho)] += 1
    agree = '' if not lane else (' lane=' + lane.get(key, '?') + (' AGREES' if lane.get(key) == ho else ' DIFFERS'))
    print(f"{key:58s} base={bo[:60]:28s} head={ho:9s}{agree}")
print(dict(pairs))
