#!/usr/bin/env python3
"""Checks the committed mutant records of PR 534 (rules 6 and 11).

For each mutant: `old` occurs exactly once in `file` at the record's head (the commit the mutant was applied to);
`new` is not already there; whether the mutant commit is reachable in the clone; and whether each detector's
`killed` agrees with its own evidence (a test detector: killed iff failedCount > 0 or a 'failed' summary line; a
probe detector: killed iff rowsDiffer > 0). Usage: check_mutant_record.py <clone> <record.json> [<record.json> ...]
"""
import json, re, subprocess, sys


def show(clone, commit, path):
    r = subprocess.run(['git', '-C', clone, 'show', f'{commit}:{path}'], capture_output=True)
    return r.stdout.decode('utf-8') if r.returncode == 0 else None


def reachable(clone, commit):
    return subprocess.run(['git', '-C', clone, 'cat-file', '-e', f'{commit}^{{commit}}'], capture_output=True).returncode == 0


def main():
    clone = sys.argv[1]
    out = []
    for rec_path in sys.argv[2:]:
        rec = json.load(open(rec_path))
        head = rec.get('head') or rec.get('ranAtHead')
        mutants = rec.get('mutants') or rec.get('rows') or []
        for m in mutants:
            text = show(clone, head, m['file'])
            row = {'record': rec_path.split('/')[-1], 'id': m['id'], 'head': head[:8],
                   'oldCount': text.count(m['old']) if text is not None else None,
                   'newAlreadyPresent': (m['new'] != '' and text.count(m['new']) > 0) if text is not None else None,
                   'mutantCommitReachable': reachable(clone, m['commit']), 'verdict': m.get('verdict'), 'consistent': True, 'why': []}
            killers = []
            for name, det in m.get('detectors', {}).items():
                if name == 'probe':
                    evidence = (det.get('rowsDiffer') or 0) > 0
                else:
                    summ = ' '.join(det.get('summary', []))
                    evidence = (det.get('failedCount') or 0) > 0 or bool(re.search(r'\bfailed\b', summ))
                if bool(det.get('killed')) != evidence:
                    row['consistent'] = False
                    row['why'].append(f'{name}: killed={det.get("killed")} evidence={evidence}')
                if det.get('killed'):
                    killers.append(name)
            expect = ('killed by ' + ', '.join(killers)) if killers else 'SURVIVED'
            if not (m.get('verdict') or '').startswith(expect):
                row['consistent'] = False
                row['why'].append(f'verdict {m.get("verdict")!r} != {expect!r}')
            out.append(row)
    for r in out:
        print(r['record'][:40], r['id'], 'old x', r['oldCount'], 'newPresent', r['newAlreadyPresent'], 'reachable', r['mutantCommitReachable'], 'consistent', r['consistent'], r['verdict'], ' '.join(r['why']))
    print('rows', len(out), 'oldExactlyOnce', sum(1 for r in out if r['oldCount'] == 1), 'consistent', sum(1 for r in out if r['consistent']))


if __name__ == '__main__':
    main()
