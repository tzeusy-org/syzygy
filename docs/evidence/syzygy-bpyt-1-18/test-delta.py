#!/usr/bin/env python3
"""Tests: +a ~b -c for syzygy-bpyt.1.18, by identity (file, full name, occurrence) and by call text.

Adapted from docs/evidence/syzygy-bpyt-16/test-delta.py: a (file, full name) may occur more than once in a report (the extraction test's
it.each over its fixtures repeats a title), so the identity carries the occurrence number instead of refusing the duplicate.

Usage: test-delta.py <base vitest json> <base root> <head vitest json> <head root> <base inventory> <head inventory> <out.json>
The vitest reports come from `vitest run --reporter=json --outputFile=...` over the seven test files, run in a checkout at each commit;
the inventories from test-inventory.mjs over the same files in the same two checkouts.
  added    a (file, full name) in the head report and not in the base report.
  removed  one in the base report and not in the head report.
  changed  an it / it.each call whose describe path and name are the same at both commits and whose callback text (and, for it.each,
           the table text) differs. The generated tests of a changed it.each call are counted, each as one changed test. A helper
           the callbacks call (readers.profile, vector, atLine) is not followed: the text of a test that calls an edited helper is
           unchanged, and it is not counted.
"""
import json
import os
import re
import sys


def report(path, root):
    out = {}
    seen = {}
    for f in json.load(open(path))['testResults']:
        rel = os.path.relpath(f['name'], root)
        for t in f['assertionResults']:
            n = seen.get((rel, t['fullName']), 0)
            seen[(rel, t['fullName'])] = n + 1
            out[(rel, t['fullName'], n)] = (t['status'], t['ancestorTitles'], t['title'])
    return out


def template_regex(name):
    """The title a test gets from an it / it.each name: $id and %s stand for any text."""
    parts, last = [], 0
    for m in re.finditer(r'\$\w+|%[sdjio%]', name):
        parts.append(re.escape(name[last:m.start()]))
        parts.append('.+')
        last = m.end()
    parts.append(re.escape(name[last:]))
    return re.compile('^' + ''.join(parts) + '$')


def main():
    base_json, base_root, head_json, head_root, base_inv, head_inv, out = sys.argv[1:]
    base, head = report(base_json, base_root), report(head_json, head_root)
    added = sorted(k for k in head if k not in base)
    removed = sorted(k for k in base if k not in head)
    inv_b, inv_h = json.load(open(base_inv)), json.load(open(head_inv))
    changed_calls = []
    for rel, rows in inv_h.items():
        before = {r['id']: r for r in inv_b[rel]}
        for r in rows:
            if r['id'] in before and before[r['id']]['body'] != r['body']:
                changed_calls.append({'file': rel, 'call': r['id'], 'kind': r['kind']})
    # The tests a changed call generated: each head test of that file and describe path belongs to the call whose name matches its
    # title with the most fixed text (a static name beats a template, a long template beats a bare $id).
    generated = {}
    for call in changed_calls:
        rows = inv_h[call['file']]
        path, name = call['call'].rsplit(' > ', 1) if ' > ' in call['call'] else ('', call['call'])
        count = 0
        ancestors = path.split(' > ') if path else []
        for (rel, full, _n), (_, own_path, title) in head.items():
            if rel != call['file'] or own_path != ancestors:
                continue
            best, best_score = None, -1
            for r in rows:
                rpath, rname = r['id'].rsplit(' > ', 1) if ' > ' in r['id'] else ('', r['id'])
                if rpath != path or not template_regex(rname).match(title):
                    continue
                score = len(re.sub(r'\$\w+|%[sdjio%]', '', rname))
                if score > best_score:
                    best, best_score = r['id'], score
            if best == call['call']:
                count += 1
        generated[call['call']] = count
    changed = sum(generated.values())
    result = {
        'baseTests': len(base),
        'headTests': len(head),
        'added': [list(k) for k in added],
        'removed': [list(k) for k in removed],
        'changedCalls': changed_calls,
        'changedGeneratedTests': generated,
        'line': f'Tests: +{len(added)} ~{changed} -{len(removed)}',
        'allBasePassed': all(v[0] == 'passed' for v in base.values()),
        'allHeadPassed': all(v[0] == 'passed' for v in head.values()),
    }
    json.dump(result, open(out, 'w'), indent=1)
    print(result['line'], result['baseTests'], result['headTests'], generated, result['allBasePassed'], result['allHeadPassed'])


main()
