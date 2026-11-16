#!/usr/bin/env python3
"""Compare two differential outputs row by row; exit 1 on any difference, any missing row, or any extra row.

Usage: compare-rows.py <old.json> <new.json>     prints a JSON summary, exit 0 only when every row is equal
       compare-rows.py --selftest                 mutates a pair and requires each mutation to fail

Both files carry `rows`, each with `family` and `id`; a row is equal when every other key is equal. The summary names the
denominator (rows on each side) so a green result over an empty or short population cannot pass: zero rows is an error.
Written for syzygy-bpyt.6.13 after review R-GP-IMPL-SUPPORT-LEAF-1 N4/N11: a comparison tool exits non-zero on a difference.
"""
import copy
import json
import sys


def compare(old, new):
    old_rows = {(r['family'], r['id']): r for r in old['rows']}
    new_rows = {(r['family'], r['id']): r for r in new['rows']}
    if len(old_rows) != len(old['rows']) or len(new_rows) != len(new['rows']):
        raise SystemExit('duplicate (family, id) in a file')
    if not old_rows or not new_rows:
        raise SystemExit('a file has no rows; a comparison over nothing proves nothing')
    differ = []
    for key in sorted(old_rows.keys() & new_rows.keys()):
        keys = sorted(set(old_rows[key]) | set(new_rows[key]))
        changed = [k for k in keys if old_rows[key].get(k) != new_rows[key].get(k)]
        if changed:
            differ.append({'row': f'{key[0]}/{key[1]}', 'keys': changed})
    only_old = sorted(f'{f}/{i}' for f, i in old_rows.keys() - new_rows.keys())
    only_new = sorted(f'{f}/{i}' for f, i in new_rows.keys() - old_rows.keys())
    return {
        'rowsOld': len(old_rows),
        'rowsNew': len(new_rows),
        'rowsCompared': len(old_rows.keys() & new_rows.keys()),
        'rowsThatDiffer': len(differ),
        'rowsOnlyInOld': len(only_old),
        'rowsOnlyInNew': len(only_new),
        'differ': differ,
        'onlyInOld': only_old,
        'onlyInNew': only_new,
    }


def ok(summary):
    return summary['rowsThatDiffer'] == 0 and summary['rowsOnlyInOld'] == 0 and summary['rowsOnlyInNew'] == 0


def selftest():
    base = {'rows': [{'family': 'A', 'id': 'x', 'v': 1}, {'family': 'A', 'id': 'y', 'v': 2}, {'family': 'B', 'id': 'x', 'v': 3}]}
    cases = []

    def case(name, mutate, expect_ok):
        other = copy.deepcopy(base)
        mutate(other)
        cases.append((name, ok(compare(base, other)) == expect_ok))

    case('identical', lambda o: None, True)
    case('one value differs', lambda o: o['rows'][1].update(v=9), False)
    case('a key added to one row', lambda o: o['rows'][0].update(extra=1), False)
    case('a row missing on the new side', lambda o: o['rows'].pop(), False)
    case('an extra row on the new side', lambda o: o['rows'].append({'family': 'B', 'id': 'z', 'v': 0}), False)
    case('same id in another family is a different row', lambda o: o['rows'][2].update(family='C'), False)
    try:
        compare({'rows': []}, base)
        cases.append(('an empty file is refused', False))
    except SystemExit:
        cases.append(('an empty file is refused', True))
    for name, passed in cases:
        print(('ok  ' if passed else 'BAD ') + name)
    return all(passed for _, passed in cases)


def main():
    if sys.argv[1:] == ['--selftest']:
        sys.exit(0 if selftest() else 1)
    old, new = (json.load(open(p)) for p in sys.argv[1:3])
    summary = compare(old, new)
    print(json.dumps(summary, indent=1))
    sys.exit(0 if ok(summary) else 1)


if __name__ == '__main__':
    main()
