#!/usr/bin/env python3
"""Compare two fence-probe.mjs outputs for syzygy-bpyt.6.3.

Usage: compare-fence-probe.py <expected output> <actual output>

What is compared: every case (its lines, line terminator and each reader's vector, the profile's reading of the whole
case, the active-content vector), the inline-span cases and the cut text of the consent reader's private function.
What is not: the probe's own digest and the digest of the whole built consent module, which move with comments.
Prints a JSON summary; exit status 1 when anything differs.
"""
import json
import sys


def main() -> None:
    expected, actual = (json.load(open(path, encoding='utf-8')) for path in sys.argv[1:3])
    differing = []
    by_id = {c['id']: c for c in actual['cases']}
    for c in expected['cases']:
        other = by_id.get(c['id'])
        if other is None:
            differing.append({'case': c['id'], 'what': 'missing'})
            continue
        keys = [k for k in ('lines', 'eol', 'vectors', 'activeContent', 'profileOnTheWholeCase', 'profileFences', 'profileInlineSpans') if c.get(k) != other.get(k)]
        if keys:
            differing.append({'case': c['id'], 'keys': keys, 'readers': [r for r in c['vectors'] if c['vectors'][r] != other['vectors'].get(r)], 'activeContentChanged': c['activeContent'] != other.get('activeContent')})
    extra = sorted(set(by_id) - {c['id'] for c in expected['cases']})
    inline = [c['id'] for c, o in zip(expected['inlineSpanCases'], actual['inlineSpanCases']) if c != o]
    cut = expected['consentFunction']['cutText'] != actual['consentFunction']['cutText']
    result = {
        'casesCompared': len(expected['cases']),
        'casesThatDiffer': len(differing),
        'differing': differing,
        'casesOnlyInActual': extra,
        'inlineCasesThatDiffer': inline,
        'consentFunctionTextDiffers': cut,
    }
    print(json.dumps(result, indent=1))
    sys.exit(1 if differing or extra or inline or cut else 0)


if __name__ == '__main__':
    main()
