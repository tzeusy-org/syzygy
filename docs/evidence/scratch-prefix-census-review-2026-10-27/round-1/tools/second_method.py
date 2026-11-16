#!/usr/bin/env python3
"""Second method for the kill and fresh-run counts: classes from the run records' final listings by name shape alone (no trace).

Usage: second_method.py <evidence-dir> [<repro.json>]

Shape: a 6-character [A-Za-z0-9] mkdtemp suffix after a '-' is dropped, owner-pid digits become <pid>/<ns>, a Chrome singleton
directory and a 21-character name are named as such, digits in a .lock name become <n>. Prints per kill run the entries and classes,
the union of classes, the per-fresh-run removed and still-there counts and classes, and (with a repro record) the classes of a
reproduction's listing beside the record's union.
"""
import json
import pathlib
import re
import sys

d = pathlib.Path(sys.argv[1])


def shape(name: str) -> str:
    if re.fullmatch(r'\.?com\.google\.Chrome\.[A-Za-z0-9]+', name):
        return 'chrome-singleton-directory'
    if re.fullmatch(r'[A-Za-z0-9_-]{21}', name) and not re.fullmatch(r'[a-z][a-z0-9]*(?:-[a-z0-9]+)*-[A-Za-z0-9]{6}', name):
        return 'nanoid-21'
    if name.endswith('.lock'):
        return re.sub(r'\d+', '<n>', name)
    name = re.sub(r'-p\d+-n\d+-', '-p<pid>-n<ns>-', name)
    return re.sub(r'(?<=-)[A-Za-z0-9]{6}$', '', name)


load = lambda label: json.loads((d / 'runs' / f'{label}.json').read_text())
kills = ['k1-kill-40s', 'k2-kill-75s', 'k3-kill-115s']
union = set()
for k in kills:
    names = [e['name'] for e in load(k)['listingAtEnd']]
    classes = {shape(n) for n in names}
    union |= classes
    print(k, 'entries', len(names), 'classes', len(classes))
print('union of classes left by the three kills', len(union))
still_union = set()
for f, k in (('f1-fresh-after-k1', 'k1-kill-40s'), ('f2-fresh-after-k2', 'k2-kill-75s'), ('f3-fresh-after-k3', 'k3-kill-115s')):
    r = load(f)
    seeded = set(r['seededFrom']['entriesMovedIn'])
    assert seeded == {e['name'] for e in load(k)['listingAtEnd']}, (f, 'seeded set differs from the kill listing')
    after = {e['name'] for e in r['listingAtEnd']}
    removed, still = seeded - after, seeded & after
    still_union |= {shape(n) for n in still}
    print(f, 'seeded', len(seeded), 'removed', len(removed), sorted({shape(n) for n in removed}), 'still', len(still))
print('union of classes still there after the fresh runs', len(still_union))
if len(sys.argv) > 2:
    rep = json.loads(pathlib.Path(sys.argv[2]).read_text())
    got = {shape(e['name']) for e in rep['listingAfterKill']}
    print('repro entries', len(rep['listingAfterKill']), 'classes', len(got))
    print('  in the record\'s kill union too:', sorted(got & union))
    print('  NOT in the record\'s kill union:', sorted(got - union))
    census = json.loads((d / 'census-2026-10-24.json').read_text())
    known = {r['class']: r['rule'] for r in census['leftBySIGKILL'] + census['neverLeftInTheseKills']}
    print('  rules of those not in the union:', {c: known.get(c, 'NOT A CLASS OF THE RECORD') for c in sorted(got - union)})
