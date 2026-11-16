#!/usr/bin/env python3
"""Aggregate the lines canonical-json-tap.ts wrote during a full suite run, for syzygy-bpyt.6.3 stack 2.

Usage: canonical-json-tap-aggregate.py <directory holding the tap.<pid> files> <out.json>
       canonical-json-tap-aggregate.py --selftest

A line is one call to one of the two encoders (kind), made from a caller that is production code or a test. `same` says
that both encoders spelled the value identically when given it with generous limits. Reads every file named tap.* in the
directory; the number of lines read is the denominator of every figure. Exit status 1 when a line cannot be parsed.
"""
import collections
import glob
import json
import os
import sys


def aggregate(lines):
    total = len(lines)
    groups = collections.defaultdict(lambda: {'calls': 0, 'same': 0, 'different': 0, 'reasons': collections.Counter(), 'outcomes': collections.Counter(), 'distinctInputs': set(), 'maxNodes': 0})
    by_origin = collections.defaultdict(lambda: {'calls': 0, 'same': 0, 'different': 0})
    for r in lines:
        key = (r['origin'], r['kind'], r['caller'])
        g = groups[key]
        g['calls'] += 1
        g['same' if r['same'] else 'different'] += 1
        g['maxNodes'] = max(g['maxNodes'], r['nodes'])
        g['distinctInputs'].add((r['lenient'].get('sha'), r['strict'].get('sha'), json.dumps(r['lenient'].get('error')), json.dumps(r['strict'].get('error'))))
        if not r['same']:
            g['reasons'].update(r['reasons'] or ['no-flag'])
            g['outcomes'][f"lenient={r['lenient'].get('error', 'ok')} strict={r['strict'].get('error', 'ok')}"] += 1
        o = by_origin[(r['origin'], r['kind'])]
        o['calls'] += 1
        o['same' if r['same'] else 'different'] += 1
    rows = []
    for (origin, kind, caller), g in sorted(groups.items()):
        rows.append({'origin': origin, 'kind': kind, 'caller': caller, 'calls': g['calls'], 'same': g['same'], 'different': g['different'],
                     'distinctInputs': len(g['distinctInputs']), 'maxNodes': g['maxNodes'],
                     'whyDifferent': dict(g['reasons']), 'outcomesWhenDifferent': dict(g['outcomes'])})
    return {
        'linesRead': total,
        'byOriginAndEncoder': [{'origin': o, 'encoder': k, **v} for (o, k), v in sorted(by_origin.items())],
        'callers': rows,
    }


def selftest():
    def line(origin, kind, caller, same, reasons=(), l_err=None, s_err=None):
        return {'origin': origin, 'kind': kind, 'caller': caller, 'same': same, 'reasons': list(reasons), 'nodes': 3,
                'lenient': ({'error': l_err} if l_err else {'sha': 'a', 'bytes': 1}), 'strict': ({'error': s_err} if s_err else {'sha': 'a' if same else 'b', 'bytes': 1})}
    fixture = [line('production', 'lenient', 'x.ts:f', True), line('production', 'lenient', 'x.ts:f', True), line('production', 'strict', 'y.ts:g', False, ['undefinedValue'], None, 'unsupported-value'),
               line('test', 'strict', 't.test.ts:h', False, ['cycle'], 'RangeError', 'cycle')]
    out = aggregate(fixture)
    got = {(r['origin'], r['encoder']): (r['calls'], r['same'], r['different']) for r in out['byOriginAndEncoder']}
    want = {('production', 'lenient'): (2, 2, 0), ('production', 'strict'): (1, 0, 1), ('test', 'strict'): (1, 0, 1)}
    ok = out['linesRead'] == 4 and got == want and out['callers'][1]['whyDifferent'] == {'undefinedValue': 1}
    print(json.dumps({'selftest': 'counts by origin and encoder, reasons when different', 'pass': ok}))
    sys.exit(0 if ok else 1)


def main():
    if '--selftest' in sys.argv:
        selftest()
    directory, out = sys.argv[1:3]
    lines, files = [], sorted(glob.glob(os.path.join(directory, 'tap.*')))
    for path in files:
        for n, text in enumerate(open(path, encoding='utf-8'), 1):
            try:
                lines.append(json.loads(text))
            except json.JSONDecodeError:
                print(f'{path}:{n}: unparseable line', file=sys.stderr)
                sys.exit(1)
    result = {'files': len(files), **aggregate(lines)}
    json.dump(result, open(out, 'w'), indent=1)
    open(out, 'a').write('\n')
    print(f"{result['linesRead']} calls from {len(files)} files")


if __name__ == '__main__':
    main()
