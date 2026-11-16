#!/usr/bin/env python3
"""Reviewer's S10 arms: run packages/polaris-dossier/src/no-egress.test.ts in one built clone, per mutant, with every
dist/ present and with every dist/ moved aside. Independent of the lane's egress-alias-check.py (same idea, own code).

Usage: egress_arms.py <built clone> <mutants.json> <out.json> <tmpdir> [id ...]

mutants.json: [{"id", "kind", "edits": [{"path", "old", "new"}]}]; an entry with no edits is the clean control.
Each old must occur exactly once. Every edit is undone after each arm; the clone must be clean before and after.
A run with no JSON reporter output, or no test counts, is recorded as an error, never as a pass.
"""
import json
import os
import shutil
import subprocess
import sys
import time

TEST = 'packages/polaris-dossier/src/no-egress.test.ts'
AWAY = '.away-r530b'


def run_test(clone, tmpdir):
    out = os.path.join(tmpdir, 'vitest-egress.json')
    if os.path.exists(out):
        os.remove(out)
    env = dict(os.environ, TMPDIR=tmpdir)
    t0 = time.time()
    proc = subprocess.run(['npx', 'vitest', 'run', TEST, '--reporter=json', f'--outputFile={out}'], cwd=clone, env=env,
                          capture_output=True, text=True, timeout=1500)
    took = round(time.time() - t0, 1)
    if not os.path.exists(out):
        return {'exit': proc.returncode, 'seconds': took, 'error': 'no json reporter output', 'stderrTail': proc.stderr[-800:]}
    data = json.load(open(out))
    tests = [t for f in data['testResults'] for t in f['assertionResults']]
    return {
        'exit': proc.returncode, 'seconds': took,
        'tests': {'passed': data['numPassedTests'], 'failed': data['numFailedTests'], 'pending': data['numPendingTests'], 'total': data['numTotalTests']},
        'perTest': [{'title': t['title'], 'status': t['status'], 'failure': ((t.get('failureMessages') or [''])[0])[:600]} for t in tests],
        'suiteFailure': [(f.get('message') or '')[:600] for f in data['testResults'] if f.get('status') == 'failed' and f.get('message')],
    }


def dists(clone):
    return [os.path.join(clone, top, n, 'dist') for top in ('packages', 'apps') for n in sorted(os.listdir(os.path.join(clone, top)))
            if os.path.isdir(os.path.join(clone, top, n, 'dist'))]


def git(clone, *args):
    return subprocess.run(['git', '-C', clone, *args], capture_output=True, text=True, check=True).stdout.strip()


def main():
    clone, mutants_path, out_path, tmpdir = sys.argv[1:5]
    only = set(sys.argv[5:])
    os.makedirs(tmpdir, exist_ok=True)
    mutants = [m for m in json.load(open(mutants_path)) if not only or m['id'] in only]
    if git(clone, 'status', '--porcelain'):
        raise SystemExit('clone not clean')
    found = dists(clone)
    if not found:
        raise SystemExit('no dist/')
    head = git(clone, 'rev-parse', 'HEAD')
    alias = "'@syzygy/support': src('packages/support/src/index.ts')" in open(os.path.join(clone, TEST)).read()
    rows = []
    for m in mutants:
        originals = {}
        for e in m['edits']:
            p = os.path.join(clone, e['path'])
            text = originals.get(p) if p in originals else open(p).read()
            originals.setdefault(p, open(p).read())
            if text.count(e['old']) != 1:
                raise SystemExit(f"{m['id']}: anchor not found exactly once in {e['path']}")
        for absent in (False, True):
            try:
                cur = {p: t for p, t in originals.items()}
                for e in m['edits']:
                    p = os.path.join(clone, e['path'])
                    cur[p] = cur[p].replace(e['old'], e['new'])
                for p, t in cur.items():
                    open(p, 'w').write(t)
                if absent:
                    for d in found:
                        shutil.move(d, d + AWAY)
                result = run_test(clone, tmpdir)
            finally:
                if absent:
                    for d in found:
                        if os.path.isdir(d + AWAY):
                            shutil.move(d + AWAY, d)
                for p, t in originals.items():
                    open(p, 'w').write(t)
            row = dict(id=m['id'], kind=m.get('kind', ''), distAbsent=absent, **result)
            rows.append(row)
            print(m['id'], 'dist-absent' if absent else 'dist-present', 'exit', result.get('exit'), result.get('tests'),
                  [(t['title'][:40], t['status']) for t in result.get('perTest', [])], flush=True)
            json.dump({'clone': {'commit': head, 'aliasForSupportPresent': alias, 'distDirs': len(found)}, 'mutants': mutants, 'rows': rows},
                      open(out_path, 'w'), indent=1)
    after = git(clone, 'status', '--porcelain')
    json.dump({'clone': {'commit': head, 'aliasForSupportPresent': alias, 'distDirs': len(found), 'statusAfter': after}, 'mutants': mutants, 'rows': rows},
              open(out_path, 'w'), indent=1)
    print('done; status after:', repr(after), flush=True)


if __name__ == '__main__':
    main()
