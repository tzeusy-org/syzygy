#!/usr/bin/env python3
"""Rule-6 mutants for item 4 of syzygy-bpyt.6.13: junitDigest and the walkthrough-judgment fixture now take sha256 from @syzygy/support.

Usage: item4-mutants.py <built clone at HEAD> <head commit> <base probe json> <tmpdir> <out.json> [--only id,id]

Three detectors can see a regression at these two sites; each mutant is run through all three and the record says which one killed it:
  probe  rebuild (npm run build:poc), run junit-fixture-differential.mjs, compare with the BASE output (compare-rows.py): any row that
         differs is a kill. Sees a changed digest; cannot see an equivalent local copy.
  tests  the existing Vitest files that read the two sites: test-artifact-verification.test.ts and its consumers for junitDigest; the five
         app tests that import the fixture for the fixture.
  sweep  population-audit.py at the mutant's commit: the reachability rule's createHash sites and local sha256 definitions, compared with
         HEAD's (6 and 1). Sees an equivalent local copy; cannot see a changed digest that still calls the package.
J* mutate junitDigest, W* the fixture; *5 and *4 are equivalent copies that only the sweep can see. C0 is the unmutated HEAD, which must be
killed by nothing. A build or probe that fails is recorded as a kill by build, never as a pass.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIT = os.path.join(HERE, '..', 'syzygy-bpyt-6-3', 'population-audit.py')

JUNIT = 'packages/three-surface-poc-core/src/test-artifact-verification.ts'
FIXTURE = 'apps/three-surface-poc/src/test-walkthrough-judgment-fixture.ts'
JUNIT_TESTS = ['packages/three-surface-poc-core/src/test-artifact-verification.test.ts', 'apps/three-surface-poc/src/test-artifact-verification-consumers.test.ts']
FIXTURE_TESTS = ['apps/three-surface-poc/src/keyboard-sweep-record.test.ts', 'apps/three-surface-poc/src/polaris-copy.test.ts', 'apps/three-surface-poc/src/polaris-parity-sweep.test.ts',
                 'apps/three-surface-poc/src/polaris-walkthrough-readiness.test.ts', 'apps/three-surface-poc/src/response-identity-independent.test.ts']
JUNIT_CALL = "  return `sha256:${sha256(rawJUnit)}`;"
FIXTURE_IMPORT = "import { sha256 } from '@syzygy/support';\n"
LOCAL_COPY = "import { createHash } from 'node:crypto';\nconst sha256 = (text: string): string => createHash('sha256').update(text, 'latin1').digest('hex');\n"
EQUIVALENT_COPY = "import { createHash } from 'node:crypto';\nconst sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');\n"

# (id, expect, file, old, new, tests, note)
MUTANTS = [
    ('J1-digest-drops-the-first-byte', 'killed', JUNIT, JUNIT_CALL, "  return `sha256:${sha256(rawJUnit.subarray(1))}`;", JUNIT_TESTS, ''),
    ('J2-digest-over-the-whole-backing-buffer', 'killed', JUNIT, JUNIT_CALL, "  return `sha256:${sha256(Buffer.from(rawJUnit.buffer))}`;", JUNIT_TESTS, 'the review\'s R1: a view into a larger buffer'),
    ('J3-digest-over-the-decoded-text', 'killed', JUNIT, JUNIT_CALL, "  return `sha256:${sha256(new TextDecoder().decode(rawJUnit))}`;", JUNIT_TESTS, 'the defect round 2 note 5 of the test-artifact review fixed'),
    ('J4-prefix-dropped', 'killed', JUNIT, JUNIT_CALL, "  return `${sha256(rawJUnit)}`;", JUNIT_TESTS, ''),
    ('J5-equivalent-local-copy', 'sweep-only', JUNIT, FIXTURE_IMPORT, "import { createHash } from 'node:crypto';\nconst sha256 = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');\n", JUNIT_TESTS, 'createHash and a local sha256 back in the file; the same bytes'),
    ('W1-run-digest-over-changed-text', 'killed', FIXTURE, '  const runDigest = sha256(runText);', "  const runDigest = sha256(runText + ' ');", FIXTURE_TESTS, ''),
    ('W2-judgment-digest-drops-the-first-character', 'killed', FIXTURE, '  const judgmentDigest = sha256(judgmentText);', '  const judgmentDigest = sha256(judgmentText.slice(1));', FIXTURE_TESTS, ''),
    ('W3-stale-latin1-local-copy', 'killed', FIXTURE, FIXTURE_IMPORT, LOCAL_COPY, FIXTURE_TESTS, 'the review\'s R5 shape: differs on non-ASCII answer text'),
    ('W4-equivalent-local-copy', 'sweep-only', FIXTURE, FIXTURE_IMPORT, EQUIVALENT_COPY, FIXTURE_TESTS, 'the same UTF-8 digest; a copy only the sweep can see'),
]


def sh(cmd, cwd, env=None, timeout=7200):
    return subprocess.run(cmd, cwd=cwd, env={**os.environ, **(env or {})}, capture_output=True, text=True, timeout=timeout)


def vitest(clone, tmpdir, files):
    out = os.path.join(tmpdir, 'vitest-item4.json')
    if os.path.exists(out):
        os.remove(out)
    proc = sh(['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={out}', *files], clone, {'TMPDIR': tmpdir})
    if not os.path.exists(out):
        raise SystemExit('no json reporter output: ' + proc.stderr[-400:])
    data = json.load(open(out))
    if data['numTotalTests'] == 0:
        raise SystemExit('the run reported no tests')
    failed = [t['fullName'] for f in data['testResults'] for t in f['assertionResults'] if t['status'] == 'failed']
    return {'killed': proc.returncode != 0, 'exit': proc.returncode, 'total': data['numTotalTests'], 'failedTestCount': len(failed), 'failedTests': failed[:40], 'files': files}


def probe(clone, tmpdir, base_probe, label):
    built = sh(['npm', 'run', 'build:poc'], clone, {'TMPDIR': tmpdir})
    if built.returncode != 0:
        return {'killed': True, 'how': 'build failed', 'detail': (built.stdout + built.stderr)[-400:]}
    out = os.path.join(tmpdir, f'probe-{label}.json')
    ran = sh(['node', os.path.join(HERE, 'junit-fixture-differential.mjs'), clone, out], clone, {'TMPDIR': tmpdir})
    if ran.returncode != 0:
        return {'killed': True, 'how': 'probe failed', 'detail': (ran.stdout + ran.stderr)[-400:]}
    cmp = sh([sys.executable, os.path.join(HERE, 'compare-rows.py'), base_probe, out], clone)
    summary = json.loads(cmp.stdout)
    os.remove(out)
    return {'killed': cmp.returncode != 0, 'compareExit': cmp.returncode, 'rowsCompared': summary['rowsCompared'], 'rowsThatDiffer': summary['rowsThatDiffer'], 'differ': [d['row'] for d in summary['differ']][:12]}


def sweep(clone, commit):
    ran = sh([sys.executable, AUDIT, clone, commit], clone)
    reach = json.loads(ran.stdout)['reachabilityRule']
    return {'createHashSha256Sites': reach['createHashSha256Sites'], 'localSha256Definitions': reach['localSha256Definitions'], 'killed': reach['createHashSha256Sites'] > 6 or reach['localSha256Definitions'] > 1}


def main():
    clone, head, base_probe, tmpdir, out_path = sys.argv[1:6]
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    os.makedirs(tmpdir, exist_ok=True)
    rows = []

    def checkout():
        sh(['git', 'checkout', '-q', '-f', '--detach', head], clone)
        sh(['git', 'clean', '-fdq'], clone)

    def run_all(label, tests):
        commit = sh(['git', 'rev-parse', 'HEAD'], clone).stdout.strip()
        row = {'commit': commit}
        row['sweep'] = sweep(clone, commit)
        row['probe'] = probe(clone, tmpdir, base_probe, label)
        row['tests'] = vitest(clone, tmpdir, tests)
        row['killedBy'] = [k for k in ('probe', 'tests', 'sweep') if row[k]['killed']]
        return row

    checkout()
    control = run_all('c0', JUNIT_TESTS + FIXTURE_TESTS)
    control['ok'] = control['killedBy'] == []
    print('C0', control['killedBy'], flush=True)
    for mid, expect, path, old, new, tests, note in MUTANTS:
        if only and mid not in only:
            continue
        checkout()
        full = os.path.join(clone, path)
        text = open(full, encoding='utf-8').read()
        if text.count(old) != 1:
            raise SystemExit(f'{path}: old fragment occurs {text.count(old)} times, not once: {old[:60]!r}')
        open(full, 'w', encoding='utf-8').write(text.replace(old, new))
        sh(['git', 'commit', '-qa', '-m', f'mutant {mid}'], clone)
        try:
            row = {'id': mid, 'expect': expect, 'file': path, 'old': old, 'new': new, 'note': note, **run_all(mid, tests)}
        finally:
            checkout()
        row['ok'] = (row['killedBy'] != []) if expect == 'killed' else (row['killedBy'] == ['sweep'])
        rows.append(row)
        print(('ok  ' if row['ok'] else 'BAD ') + mid, row['killedBy'], flush=True)
        json.dump({'head': head, 'control': control, 'rows': rows}, open(out_path, 'w'), indent=1)
    summary = {
        'mutants': len(rows), 'rowsOk': sum(1 for r in rows if r['ok']), 'rowsNotOk': [r['id'] for r in rows if not r['ok']],
        'controlKilledByNothing': control['ok'],
        'killedByProbe': [r['id'] for r in rows if r['probe']['killed']], 'killedByTests': [r['id'] for r in rows if r['tests']['killed']], 'killedBySweep': [r['id'] for r in rows if r['sweep']['killed']],
    }
    json.dump({'head': head, 'node': sh(['node', '-v'], clone).stdout.strip(), 'buildCommand': 'npm run build:poc', 'summary': summary, 'control': control, 'rows': rows}, open(out_path, 'w'), indent=1)
    print(summary)
    sys.exit(0 if not summary['rowsNotOk'] and control['ok'] else 1)


if __name__ == '__main__':
    main()
