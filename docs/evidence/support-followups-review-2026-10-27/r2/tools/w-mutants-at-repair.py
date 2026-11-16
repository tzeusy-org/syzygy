#!/usr/bin/env python3
"""Re-run the fixture mutants W1-W4 at the reviewed commit against the fixture's consumer tests (the test detector).

Usage: w-mutants-at-repair.py <clone checked out at the reviewed commit, npm ci done> <tmpdir> <out.json>

The mutant table is read from the lane's item4-mutants.py in the clone (MUTANTS, FIXTURE_TESTS), so the fragments are the
recorded ones. Each mutant: the fragment must occur exactly once; apply; run vitest on FIXTURE_TESTS with the JSON
reporter; restore with `git checkout -- <file>`; assert the tree is clean. An unmutated control runs first and last.
"""
import importlib.util
import json
import os
import subprocess
import sys

clone, tmpdir, out = sys.argv[1:4]
spec = importlib.util.spec_from_file_location('item4', os.path.join(clone, 'docs/evidence/syzygy-bpyt-6-13/item4-mutants.py'))
item4 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(item4)
head = subprocess.run(['git', '-C', clone, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()


def loadavg():
    return open('/proc/loadavg').read().split()[:3]


def run(label):
    report = os.path.join(tmpdir, f'{label}.json')
    env = dict(os.environ, TMPDIR=tmpdir)
    p = subprocess.run(['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={report}', *item4.FIXTURE_TESTS], cwd=clone, env=env, capture_output=True, text=True)
    r = json.load(open(report))
    failed = sorted(f"{t['ancestorTitles'][-1] if t['ancestorTitles'] else ''} > {t['title']}" for s in r['testResults'] for t in s['assertionResults'] if t['status'] == 'failed')
    return {'label': label, 'exit': p.returncode, 'total': r['numTotalTests'], 'failed': r['numFailedTests'], 'failedTests': failed, 'loadavg': loadavg()}


def clean():
    return subprocess.run(['git', '-C', clone, 'status', '--porcelain', '--untracked-files=no'], capture_output=True, text=True).stdout == ''


rows = [dict(run('control-before'), id='control-before')]
for mid, expect, path, old, new, _tests, _note in item4.MUTANTS:
    if not mid.startswith('W'):
        continue
    full = os.path.join(clone, path)
    text = open(full, encoding='utf-8').read()
    n = text.count(old)
    if n != 1:
        rows.append({'id': mid, 'error': f'old occurs {n} times'})
        continue
    open(full, 'w', encoding='utf-8').write(text.replace(old, new))
    try:
        r = run(mid)
    finally:
        subprocess.run(['git', '-C', clone, 'checkout', '-q', '--', path], check=True)
    r.update(id=mid, expect=expect, old=old, new=new, killedByTests=r['failed'] > 0, restoredClean=clean())
    rows.append(r)
    print(mid, 'killed' if r['killedByTests'] else 'survived', f"{r['failed']}/{r['total']}", flush=True)
rows.append(dict(run('control-after'), id='control-after'))
json.dump({'commit': head, 'tests': item4.FIXTURE_TESTS, 'rows': rows}, open(out, 'w'), indent=1)
print(json.dumps([{k: r.get(k) for k in ('id', 'exit', 'total', 'failed', 'killedByTests', 'restoredClean')} for r in rows]))
