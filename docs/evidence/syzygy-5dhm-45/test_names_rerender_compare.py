#!/usr/bin/env python3
"""syzygy-5dhm.45: compare the before and after re-renders of each copied stored run, file by file, by SHA-256, and classify each
change: a path only after, or an HTML page whose after bytes, with every test-names link deleted, are its before bytes; a JSON
file by the key paths that differ (no value is recorded).

Usage: question_kind_rerender_compare.py <scratch out dir> <before commit> <after commit> <out.json>. Reads site-before-<id> and
site-after-<id> under the out dir (written by test_names_rerender_all.sh); records per run the file count, each side's sorted path
set, and every path whose bytes differ. Prints no body.
"""
import hashlib
import re
import json
import pathlib
import sys

out_dir, before, after, out = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3], pathlib.Path(sys.argv[4])


# The one fragment the test-names change may add to an existing page: its sidebar (or contents) link, at any relative depth.
LINK = re.compile(r'<li><a href="(?:\.\./)*reference/test-names\.html">Test names</a></li>')


def json_paths(a, b, at=''):
    """The key paths where two JSON values differ, with list members by index; values are not recorded."""
    if isinstance(a, dict) and isinstance(b, dict):
        return [q for k in sorted(set(a) | set(b)) for q in (json_paths(a.get(k), b.get(k), f'{at}.{k}') if k in a and k in b else [f'{at}.{k}'])]
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            return [f'{at}[] (length {len(a)} -> {len(b)})']
        return [q for n, (x, y) in enumerate(zip(a, b)) for q in json_paths(x, y, f'{at}[{n}]')]
    return [] if a == b else [at]


READING_ORDER = re.compile(r'<a rel="(prev|next)" href="[^"]*">(Previous|Next): [^<]*</a>')


def classify(path: str, before: bytes, after: bytes) -> dict:
    """An HTML page: whether deleting every test-names link from the after bytes gives the before bytes exactly ('link'); else whether
    it does once the reading-order previous/next links are blanked on both sides ('reading-order', with the after targets); the size
    report, which measures every page, is recorded as 'size-report'. A JSON file: the key paths that differ (no value is recorded)."""
    if path.endswith('.json'):
        return {'kind': 'json', 'changedPaths': json_paths(json.loads(before), json.loads(after))}
    text, old = after.decode('utf-8'), before.decode('utf-8')
    links, stripped = len(LINK.findall(text)), LINK.sub('', text)
    if stripped == old:
        change = 'link'
    elif READING_ORDER.sub('', stripped) == READING_ORDER.sub('', old):
        change = 'reading-order'
    elif path == 'size-report.html':
        change = 'size-report'
    else:
        change = 'unclassified'
    record = {'kind': 'html', 'testNamesLinksAdded': links, 'change': change}
    if change == 'reading-order':
        record['readingOrderAfter'] = [f'{m.group(1)} -> {re.search(r'href="([^"]*)"', m.group(0)).group(1)}' for m in READING_ORDER.finditer(stripped)
                                       if m.group(0) not in old]
    return record


def digests(root: pathlib.Path) -> dict:
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}


runs = []
for site in sorted(out_dir.glob('site-before-*')):
    run_id = site.name[len('site-before-'):]
    a, b = digests(site), digests(out_dir / f'site-after-{run_id}')
    runs.append({
        'run': f'run-{run_id}',
        'filesBefore': len(a), 'filesAfter': len(b),
        'samePathSet': sorted(a) == sorted(b),
        'differing': sorted(path for path in set(a) | set(b) if a.get(path) != b.get(path)),
        'onlyAfter': sorted(set(b) - set(a)), 'onlyBefore': sorted(set(a) - set(b)),
        'edits': {path: classify(path, (site / path).read_bytes(), (out_dir / f'site-after-{run_id}' / path).read_bytes())
                  for path in sorted(set(a) & set(b)) if a[path] != b[path]},
        'siteDigest': hashlib.sha256(json.dumps(b, sort_keys=True).encode()).hexdigest(),
    })
every_change_classified = bool(runs) and all(
    r['filesBefore'] > 0 and not r['onlyBefore'] and r['onlyAfter'] == ['reference/test-names.html']
    and all(e['kind'] == 'json' or e['change'] != 'unclassified' for e in r['edits'].values()) for r in runs)
record = {
    'subject': 'syzygy-5dhm.45: the comprehension-regression rule (CONTRIBUTING.md) over a copied stored run, re-rendered before and after',
    'before': before, 'after': after,
    'harness': 'docs/evidence/syzygy-5dhm-45/test_names_rerender_all.sh, through docs/evidence/syzygy-5dhm-45/test_names_rerender.ts',
    'runs': runs,
    'everyChangeClassified': every_change_classified,
    'changeClasses': {
        'link': 'the page is its before bytes once every test-names link is deleted: the link sits beside the infrastructure-map link in each of the page\'s two navigation lists (three on the contents page, which also lists it)',
        'reading-order': 'as link, and the previous/next reading-order links of the two pages next to the new page name it',
        'size-report': 'the size report measures every page, so each page\'s byte and word counts and the totals change and the new page gains a row',
        'json': 'dossier.json, machine.json and size-report.json list the new page; machine.json gains the testNames member; size-report.json carries the same counts as its page',
    },
    'readerShare': {
        'value': 'Unknown',
        'basis': 'this byte diff: no model reader was run (the lead batched model-reader measurement into the corpus rescore after syzygy-k54o.3). Every page a reader read before is unchanged but for one added link line; the new page and the machine member are additions, so whether they move what a reader recovers is not measured.',
    },
}
out.write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({'runs': len(runs), 'everyChangeClassified': every_change_classified}))
