#!/usr/bin/env python3
"""Rule-6 mutants of the lane's item4-repair-sweep.py (PR #538, round 2).

Usage: repair-sweep-mutants.py <source clone at the reviewed commit> <work dir> <out.json>

For each case, copies the four evidence tools the lane's tool loads (item4-repair-sweep.py, item4-mutants.py,
population-audit.py, sweep.py) from the source clone's tree into <work dir>/<case>/{syzygy-bpyt-6-13,syzygy-bpyt-6-3}/,
applies the case's edits to the copies (each `old` must occur exactly once), makes a fresh throwaway clone of the source
clone, and runs the copied tool against it. Records the exit code, stdout, the output JSON's allKilled and rows, and
whether the outcome matches the case's expectation. The source clone is never written to.

Cases:
  R0-unmutated                        the tool as committed, at c7ed9ef2                 expect exit 0, both killed
  T1-threshold-from-base              baseline taken at f7477f52 (8/2), not the repair   expect exit 1, neither killed
  T2-threshold-from-b214ef10          baseline taken at b214ef10 (6/1)                   expect exit 0 (a stale low threshold still kills: shows the tool cannot tell a stale threshold from a right one)
  T3-kill-rule-sites-only             drop the definitions clause                        expect exit 0 (sites alone 8 > 7)
  T4-kill-rule-defs-only              drop the sites clause                              expect exit 0 (defs alone 2 > 1)
  T5-kill-rule-ge                     `>` becomes `>=` on both clauses                    expect exit 0; a no-op would now be killed too (see I1 under T5)
  I1-noop-mutant                      W3's new = old plus a comment line (a no-op mutant)  expect exit 1: the detector must not kill a no-op
  I1-noop-mutant-under-T5             I1 with T5's `>=`                                  expect exit 0: the no-op is "killed", so T5 is detectable only with a no-op row
  I2-repair-arg-f7477f52              run at the base                                    expect exit 1 (old fragment absent)
  I3-repair-arg-main                  run at current main                                expect exit 1 (old fragment absent: main's fixture has its own copy)
  I4-fixture-drift                    run at a scratch commit that edits a fixture comment  expect exit 1 (fixtureFileEqualToB214ef10 false)
"""
import json
import os
import shutil
import subprocess
import sys

src, work, out = sys.argv[1:4]
ONLY = set(sys.argv[4].split(',')) if len(sys.argv) > 4 else None
D13 = 'docs/evidence/syzygy-bpyt-6-13/'
D3 = 'docs/evidence/syzygy-bpyt-6-3/'
FILES = [(D13, 'item4-repair-sweep.py'), (D13, 'item4-mutants.py'), (D3, 'population-audit.py'), (D3, 'sweep.py')]
TOOL = 'item4-repair-sweep.py'
BASE_LINE = '    baseline = counts(clone, repair_full)\n'
KILL = "        killed = got['createHashSha256Sites'] > baseline['createHashSha256Sites'] or got['localSha256Definitions'] > baseline['localSha256Definitions']\n"
W3_ROW = "    ('W3-stale-latin1-local-copy', 'killed', FIXTURE, FIXTURE_IMPORT, LOCAL_COPY, FIXTURE_TESTS, 'the review\\'s R5 shape: differs on non-ASCII answer text'),\n"
GE = KILL.replace(' > ', ' >= ')
CASES = [
    ('R0-unmutated', [], 'c7ed9ef2', 0),
    ('T1-threshold-from-base', [(TOOL, BASE_LINE, "    baseline = counts(clone, 'f7477f52c49ee347f96b92703887c31f6be49e07')\n")], 'c7ed9ef2', 1),
    ('T2-threshold-from-b214ef10', [(TOOL, BASE_LINE, "    baseline = counts(clone, 'b214ef1015c134dbc821c4f4dec654a16314c354')\n")], 'c7ed9ef2', 0),
    ('T3-kill-rule-sites-only', [(TOOL, KILL, "        killed = got['createHashSha256Sites'] > baseline['createHashSha256Sites']\n")], 'c7ed9ef2', 0),
    ('T4-kill-rule-defs-only', [(TOOL, KILL, "        killed = got['localSha256Definitions'] > baseline['localSha256Definitions']\n")], 'c7ed9ef2', 0),
    ('T5-kill-rule-ge', [(TOOL, KILL, GE)], 'c7ed9ef2', 0),
    ('I1-noop-mutant', [('item4-mutants.py', W3_ROW, W3_ROW.replace('FIXTURE_IMPORT, LOCAL_COPY,', "FIXTURE_IMPORT, FIXTURE_IMPORT + '// reviewer no-op\\n',"))], 'c7ed9ef2', 1),
    ('I1-noop-mutant-under-T5', [('item4-mutants.py', W3_ROW, W3_ROW.replace('FIXTURE_IMPORT, LOCAL_COPY,', "FIXTURE_IMPORT, FIXTURE_IMPORT + '// reviewer no-op\\n',")), (TOOL, KILL, GE)], 'c7ed9ef2', 0),
    ('I2-repair-arg-f7477f52', [], 'f7477f52', 1),
    ('I3-repair-arg-main', [], 'MAIN', 1),
    ('I4-fixture-drift', [], 'DRIFT', 1),
]


def sh(cmd, cwd, check=True):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if check and p.returncode != 0:
        raise SystemExit(f'{cmd} failed: {p.stderr[-400:]}')
    return p


main_sha = sh(['git', 'rev-parse', 'gh/main'], src).stdout.strip()
results = []
for case, edits, rev, expect_exit in CASES:
    if ONLY and case not in ONLY:
        continue
    root = os.path.join(work, case)
    shutil.rmtree(root, ignore_errors=True)
    for d, name in FILES:
        os.makedirs(os.path.join(root, d.split('/')[-2]), exist_ok=True)
        blob = sh(['git', 'show', f'7d408fd9:{d}{name}'], src).stdout
        open(os.path.join(root, d.split('/')[-2], name), 'w', encoding='utf-8').write(blob)
    applied = []
    for name, old, new in edits:
        d = D3 if name in ('population-audit.py', 'sweep.py') else D13
        path = os.path.join(root, d.split('/')[-2], name)
        text = open(path, encoding='utf-8').read()
        if text.count(old) != 1:
            raise SystemExit(f'{case}: {name} old occurs {text.count(old)} times')
        open(path, 'w', encoding='utf-8').write(text.replace(old, new))
        applied.append({'file': name, 'old': old, 'new': new})
    clone = os.path.join(root, 'clone')
    sh(['git', 'clone', '-q', '--no-checkout', src, clone], work)
    sh(['git', 'config', 'user.name', 'reviewer'], clone)
    sh(['git', 'config', 'user.email', 'reviewer@example.invalid'], clone)
    sh(['git', 'config', 'commit.gpgsign', 'false'], clone)
    if rev == 'MAIN':
        sh(['git', 'fetch', '-q', src, f'{main_sha}'], clone)
        arg = main_sha
    elif rev == 'DRIFT':
        sh(['git', 'checkout', '-q', '--detach', 'c7ed9ef2'], clone)
        fx = os.path.join(clone, 'apps/three-surface-poc/src/test-walkthrough-judgment-fixture.ts')
        text = open(fx, encoding='utf-8').read()
        open(fx, 'w', encoding='utf-8').write(text.replace('// judgment evaluator is what decides lawfulness.', '// judgment evaluator is what decides lawfulness (drift).', 1))
        sh(['git', 'commit', '-qam', 'fixture comment drift'], clone)
        arg = sh(['git', 'rev-parse', 'HEAD'], clone).stdout.strip()
    else:
        arg = rev
    out_json = os.path.join(root, 'out.json')
    p = sh([sys.executable, '-I', os.path.join(root, 'syzygy-bpyt-6-13', TOOL), clone, arg, out_json], root, check=False)
    rec = json.load(open(out_json)) if os.path.exists(out_json) else None
    row = {'case': case, 'rev': arg, 'edits': applied, 'exit': p.returncode, 'expectExit': expect_exit,
           'stdout': p.stdout.strip().splitlines(), 'stderrTail': p.stderr.strip().splitlines()[-1:] if p.stderr.strip() else [],
           'allKilled': rec['allKilled'] if rec else None,
           'baseline': rec['baselineAtRepairCommit'] if rec else None,
           'fixtureFileEqualToB214ef10': rec['fixtureFileEqualToB214ef10'] if rec else None,
           'rows': [{k: r[k] for k in ('id', 'createHashSha256Sites', 'localSha256Definitions', 'killedBySweep')} for r in rec['rows']] if rec else None}
    row['asExpected'] = row['exit'] == expect_exit
    results.append(row)
    print(case, f"exit={row['exit']} expect={expect_exit} allKilled={row['allKilled']} baseline={row['baseline']} rows={row['rows']} {row['stderrTail']}", flush=True)
    shutil.rmtree(clone)
json.dump({'tool': 'item4-repair-sweep.py at 7d408fd9', 'cases': results}, open(out, 'w'), indent=1)
print('summary', sum(r['asExpected'] for r in results), 'of', len(results), 'as expected')
