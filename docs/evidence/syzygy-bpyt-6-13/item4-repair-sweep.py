#!/usr/bin/env python3
"""Sweep-only re-check of the walkthrough-judgment fixture mutants at the junitDigest repair commit, for syzygy-bpyt.6.13.

Usage: item4-repair-sweep.py <scratch clone with full history> <repair commit> <out.json>

Why this exists: item4-mutants.py decides a sweep kill by a fixed threshold, more than 6 createHash('sha256') sites or more than 1 local
sha256 definition under the reachability rule. Those are the counts at b214ef10, where both item-4 halves were in. At the repair commit
the junitDigest half is reverted (test-artifact-verification.ts is back to its f7477f52 bytes, so its createHash site is back), and the
unmutated tree reads 7 sites and 1 definition; item4-mutants.py run there would call its own control killed. That runner is left as it
was and is not re-run. This tool takes the threshold from the repair commit itself (population-audit.py on the unmutated tree) and
re-applies only the two fixture mutants the sweep alone can see or sees as well (W3, W4), each as a scratch commit in the throwaway
clone. The probe and test detectors are not re-run here: the differential was re-run at the repair commit (junit-fixture-differential-
head-<repair>.json), and the fixture file's blob is the same at b214ef10 and at the repair commit, which the output records.
"""
import importlib.util
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIT = os.path.join(HERE, '..', 'syzygy-bpyt-6-3', 'population-audit.py')
spec = importlib.util.spec_from_file_location('item4', os.path.join(HERE, 'item4-mutants.py'))
item4 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(item4)


def sh(cmd, cwd):
    done = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if done.returncode != 0:
        raise SystemExit(f'{cmd[:3]} failed: {done.stderr[-300:]}')
    return done.stdout


def counts(clone, commit):
    reach = json.loads(sh([sys.executable, AUDIT, clone, commit], clone))['reachabilityRule']
    return {'createHashSha256Sites': reach['createHashSha256Sites'], 'localSha256Definitions': reach['localSha256Definitions']}


def main():
    clone, repair, out = sys.argv[1:4]
    sh(['git', 'checkout', '-q', '-f', '--detach', repair], clone)
    repair_full = sh(['git', 'rev-parse', 'HEAD'], clone).strip()
    baseline = counts(clone, repair_full)
    fixture_blob = lambda rev: sh(['git', 'rev-parse', f'{rev}:{item4.FIXTURE}'], clone).strip()
    record = {
        'repairCommit': repair_full,
        'baselineAtRepairCommit': baseline,
        'baselineAtB214ef10InItem4Mutants': {'createHashSha256Sites': 6, 'localSha256Definitions': 1},
        'fixtureBlobAtRepairCommit': fixture_blob(repair_full),
        'fixtureBlobAtB214ef10': fixture_blob('b214ef1015c134dbc821c4f4dec654a16314c354'),
        'rule': 'killed when the reachability-rule createHash sites or local sha256 definitions exceed the repair commit\'s own counts',
        'rows': [],
    }
    record['fixtureFileEqualToB214ef10'] = record['fixtureBlobAtRepairCommit'] == record['fixtureBlobAtB214ef10']
    for mid, expect, path, old, new, _tests, note in item4.MUTANTS:
        if not mid.startswith(('W3', 'W4')):
            continue
        sh(['git', 'checkout', '-q', '-f', '--detach', repair_full], clone)
        sh(['git', 'clean', '-fdq'], clone)
        full = os.path.join(clone, path)
        text = open(full, encoding='utf-8').read()
        if text.count(old) != 1:
            raise SystemExit(f'{path}: old fragment occurs {text.count(old)} times')
        open(full, 'w', encoding='utf-8').write(text.replace(old, new))
        sh(['git', 'commit', '-qa', '-m', f'mutant {mid}'], clone)
        commit = sh(['git', 'rev-parse', 'HEAD'], clone).strip()
        got = counts(clone, commit)
        killed = got['createHashSha256Sites'] > baseline['createHashSha256Sites'] or got['localSha256Definitions'] > baseline['localSha256Definitions']
        record['rows'].append({'id': mid, 'file': path, 'old': old, 'new': new, 'commit': commit, 'commitNote': 'a scratch commit in a throwaway clone, reachable from no ref', **got, 'killedBySweep': killed})
        print(mid, got, 'killed' if killed else 'NOT killed', flush=True)
    sh(['git', 'checkout', '-q', '-f', '--detach', repair_full], clone)
    record['control'] = {'commit': repair_full, **baseline, 'killedBySweep': False, 'note': 'the unmutated repair commit defines the threshold, so it cannot be killed by it'}
    record['allKilled'] = all(r['killedBySweep'] for r in record['rows'])
    json.dump(record, open(out, 'w'), indent=1)
    open(out, 'a').write('\n')
    sys.exit(0 if record['allKilled'] and record['fixtureFileEqualToB214ef10'] else 1)


if __name__ == '__main__':
    main()
