#!/usr/bin/env python3
"""Compare two utf8-probe.mjs outputs for syzygy-bpyt.6.3 stack 2.

Usage: compare-utf8-probe.py <expected output> <actual output>

Rows are keyed by (driver, input) and compared by the sha256 of the result each stored. Prints a JSON summary with the number of
rows compared, how many differ per driver and the first differing inputs. Exit status 1 when any row differs, is missing or is
extra, or when the corpus counts differ.
"""
import collections
import json
import sys


def main() -> None:
    expected, actual = (json.load(open(path, encoding='utf-8')) for path in sys.argv[1:3])
    ours = {(r['driver'], r['input']): r['sha256'] for r in expected['rows']}
    theirs = {(r['driver'], r['input']): r['sha256'] for r in actual['rows']}
    differ = sorted(k for k in ours if k in theirs and ours[k] != theirs[k])
    missing = sorted(set(ours) - set(theirs))
    extra = sorted(set(theirs) - set(ours))
    per_driver = collections.Counter(d for d, _ in differ)
    result = {
        'rowsCompared': len(ours), 'rowsDiffer': len(differ), 'missing': len(missing), 'extra': len(extra),
        'differPerDriver': dict(per_driver), 'firstDiffering': [list(k) for k in differ[:6]],
        'corpusEqual': expected['corpus'] == actual['corpus'],
    }
    print(json.dumps(result, indent=1))
    sys.exit(1 if differ or missing or extra or not result['corpusEqual'] else 0)


if __name__ == '__main__':
    main()
