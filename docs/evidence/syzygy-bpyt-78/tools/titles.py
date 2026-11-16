#!/usr/bin/env python3
"""syzygy-bpyt.78 (copied unchanged from syzygy-bpyt.4.26's tools apart from this line): every test title of the whole suite (`vitest list --json`, every project of the root config) at a base commit
and a head commit of one clean clone, compared by file and full name. After syzygy-bpyt-6-14/titles.py, with the whole suite in
place of three named files. The clone is checked out at each commit in turn and left at the head; the two commits must share
package-lock.json, so one `npm ci` serves both.

Usage: python3 -I titles.py <clone> <base commit> <head commit> <tmpdir> <out.json>
"""
import collections
import json
import os
import shutil
import subprocess
import sys


def main():
    clone, base, head, tmpdir, out_file = sys.argv[1:6]
    git = lambda *a: subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True).stdout
    assert git('status', '--porcelain') == '', 'the clone must start clean'
    assert git('diff', '--name-only', base, head, '--', 'package-lock.json') == '', 'the commits must share package-lock.json'
    titles = {}
    for side, commit in [('base', base), ('head', head)]:
        git('checkout', '-q', commit)
        os.makedirs(tmpdir, exist_ok=True)
        out = os.path.join(tmpdir, 'list.json')
        subprocess.run(['npx', 'vitest', 'list', f'--json={out}'], cwd=clone, capture_output=True, text=True, check=True,
                       env={**os.environ, 'TMPDIR': tmpdir}, timeout=1800)
        titles[side] = [(r['file'].replace(clone.rstrip('/') + '/', ''), r['name']) for r in json.load(open(out))]
        shutil.rmtree(tmpdir, ignore_errors=True)
    assert git('status', '--porcelain') == '', 'the listing must leave the clone clean'
    count = {side: collections.Counter(rows) for side, rows in titles.items()}
    added = sorted((count['head'] - count['base']).elements())
    removed = sorted((count['base'] - count['head']).elements())
    record = {
        'base': git('rev-parse', base).strip(), 'head': git('rev-parse', head).strip(),
        'baseTitles': len(titles['base']), 'headTitles': len(titles['head']), 'delta': len(titles['head']) - len(titles['base']),
        'added': [{'file': f, 'name': n} for f, n in added], 'removed': [{'file': f, 'name': n} for f, n in removed],
        'addedByFile': dict(sorted(collections.Counter(f for f, _ in added).items())),
    }
    json.dump(record, open(out_file, 'w'), indent=1)
    print(record['baseTitles'], record['headTitles'], record['delta'], 'added', len(added), 'removed', len(removed), record['addedByFile'])


if __name__ == '__main__':
    main()
