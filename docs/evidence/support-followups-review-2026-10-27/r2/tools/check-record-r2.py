#!/usr/bin/env python3
"""Check the round-2 repair parts of support-leaf-followups-2026-10-27.json against git objects (rules 6 and 11).

Usage: check-record-r2.py <clone> [<rev>]   (rev defaults to 7d408fd9; the record and every output are read at <rev>)
Prints one ok/FAIL line per check and a summary. Exit 1 on any FAIL.
"""
import hashlib
import json
import re
import subprocess
import sys

clone = sys.argv[1]
REV = sys.argv[2] if len(sys.argv) > 2 else '7d408fd9'
D = 'docs/evidence/syzygy-bpyt-6-13/'
JUNIT = 'packages/three-surface-poc-core/src/test-artifact-verification.ts'
FIXTURE = 'apps/three-surface-poc/src/test-walkthrough-judgment-fixture.ts'
results = []


def git(*args, binary=False, ok=False):
    p = subprocess.run(['git', '-C', clone, *args], capture_output=True)
    if p.returncode != 0:
        if ok:
            return None
        raise SystemExit(f'git {args} failed: {p.stderr.decode()[-200:]}')
    return p.stdout if binary else p.stdout.decode()


def blob(rev, path):
    return git('show', f'{rev}:{path}', binary=True, ok=True)


def full(rev):
    return git('rev-parse', rev).strip()


def check(name, cond, detail=''):
    results.append(bool(cond))
    print(f"{'ok  ' if cond else 'FAIL'} {name}{': ' + str(detail) if detail != '' else ''}")


rec = json.loads(blob(REV, D + 'support-leaf-followups-2026-10-27.json'))
sha = lambda b: hashlib.sha256(b).hexdigest()

# --- subject.repair
rep = rec['subject']['repair']
check('repair.reviewedHead == 663061c4 full', rep['reviewedHead'] == full('663061c4'), rep['reviewedHead'])
m = rep['mergeOfMain']
check('mergeOfMain.commit resolves and equals 4b9a4be0', m['commit'] == full('4b9a4be0'), m['commit'])
check('mergeOfMain.parents equal git', m['parents'] == git('log', '-1', '--format=%P', m['commit']).split(), m['parents'])
check('mergeOfMain.mainSubject equals the main parent subject', m['mainSubject'] == git('log', '-1', '--format=%s', m['parents'][1]).strip(), m['mainSubject'])
check('repairCodeCommit equals c7ed9ef2 and is a child of the merge', rep['repairCodeCommit'] == full('c7ed9ef2') and git('log', '-1', '--format=%P', rep['repairCodeCommit']).split() == [m['commit']])
names = [n for n in git('diff', '--name-only', '-z', m['commit'], rep['repairCodeCommit']).split('\0') if n]
check('repairCodeCommitChanges: only the junit file', names == [JUNIT], names)
jb = rep['junitFileBlob']
check('junitFileBlob.atBase == git f7477f52', jb['atBase'] == git('rev-parse', f'f7477f52:{JUNIT}').strip(), jb['atBase'])
check('junitFileBlob.atRepair == git c7ed9ef2', jb['atRepair'] == git('rev-parse', f'c7ed9ef2:{JUNIT}').strip())
check('junitFileBlob.atRoundOneTestedCommit == git b214ef10', jb['atRoundOneTestedCommit'] == git('rev-parse', f'b214ef10:{JUNIT}').strip())
check('junitFileBlob.equalToBase is true and true', jb['equalToBase'] is True and jb['atBase'] == jb['atRepair'])
fb = rep['fixtureFileBlob']
check('fixtureFileBlob both equal git', fb['atRoundOneTestedCommit'] == git('rev-parse', f'b214ef10:{FIXTURE}').strip() and fb['atRepair'] == git('rev-parse', f'c7ed9ef2:{FIXTURE}').strip() and fb['equal'] is True)
od = rep['ownDeltaAtRepair']
d = git('diff', 'eb8fb6cb', 'c7ed9ef2', '--', 'apps', 'packages', 'scripts', binary=True)
check('ownDeltaAtRepair.sha256 re-derived', od['sha256'] == sha(d), sha(d))
ns = [l for l in git('diff', '--name-status', 'eb8fb6cb', 'c7ed9ef2', '--', 'apps', 'packages', 'scripts').splitlines() if l]
check('ownDeltaAtRepair.paths == git --name-status', od['paths'] == ns and od['files'] == len(ns), f'{len(ns)} paths')
num = {}
for l in git('diff', '--numstat', 'eb8fb6cb', 'c7ed9ef2', '--', 'apps', 'packages', 'scripts').splitlines():
    a, dl, p = l.split('\t')
    if int(dl):
        num[p] = int(dl)
check('linesDeletedByFileAtRepair == numstat deletions', rep['linesDeletedByFileAtRepair'] == num, num)
r1 = git('diff', 'eb8fb6cb', '4b9a4be0', '--', 'apps', 'packages', 'scripts', binary=True)
check('round-1 own delta over main == recorded ownDeltaSha256', sha(r1) == rec['subject']['ownDeltaSha256'])
check('figuresHoldAt names the repair code commit', rep['figuresHoldAt'].startswith(full('c7ed9ef2')))
last_code = git('log', '-1', '--format=%H', REV, '--', 'apps', 'packages', 'scripts').strip()
check('c7ed9ef2 is the last commit touching apps/packages/scripts at REV', last_code == full('c7ed9ef2'), last_code)

# --- tools
for tool, digest in rec['tools'].items():
    b = blob(REV, D + tool)
    check(f'tools[{tool}] digest', b is not None and sha(b) == digest, digest[:12])

# --- repairFiles
for f in rec['repairFiles']:
    b = blob(REV, f['path'])
    check(f"repairFiles {f['path'].split('/')[-1]} bytes+sha256", b is not None and len(b) == f['bytes'] and sha(b) == f['sha256'], f"{len(b) if b else None} bytes")
added = sorted(n for n in git('diff', '--name-only', '-z', 'c7ed9ef2', REV).split('\0') if n)
listed = sorted(f['path'] for f in rec['repairFiles'])
check('repairFiles == files the evidence commit added, less the record itself', listed == [p for p in added if not p.endswith('support-leaf-followups-2026-10-27.json')], f'added {len(added)} listed {len(listed)}')

# --- item4.mutants rows: every row present, J marked n/a, W marked applies; old fragments at both commits
i4 = rec['item4']
rows = i4['mutants']['rows']
ids = [r['id'] for r in rows]
check('item4.mutants.rows still 9 (none deleted)', len(rows) == 9, ids)
for r in rows:
    j = r['id'].startswith('J')
    st = r.get('status', '')
    if j:
        check(f"{r['id']} marked NO LONGER APPLICABLE", st.startswith('NO LONGER APPLICABLE at c7ed9ef2'))
    else:
        check(f"{r['id']} marked applies", st.startswith('applies'))
    at_b = blob('b214ef10', r['file']).decode()
    at_r = blob('c7ed9ef2', r['file']).decode()
    check(f"{r['id']} old occurs once at b214ef10", at_b.count(r['old']) == 1, at_b.count(r['old']))
    if j:
        check(f"{r['id']} old occurs 0 times at c7ed9ef2 (claim: not in the file any more)", at_r.count(r['old']) == 0, at_r.count(r['old']))
        check(f"{r['id']} status names the fragment that is in old", 'sha256(rawJUnit)' in r['old'], repr(r['old'][:60]))
    else:
        check(f"{r['id']} old occurs once at c7ed9ef2", at_r.count(r['old']) == 1, at_r.count(r['old']))
    check(f"{r['id']} mutant commit in repo (expected absent, a scratch commit)", git('cat-file', '-e', r['commit'], ok=True) is None, r['commit'][:12])

# W1 and W2 claim "re-checked by the sweep detector alone in i4.mutants.repair": are they in the repair rows?
rrows = i4['mutants']['repair']['rows']
rids = [r['id'] for r in rrows]
for r in rows:
    if r['id'].startswith('W'):
        claimed = 're-checked by the sweep detector' in r.get('status', '')
        present = r['id'] in rids
        check(f"{r['id']} status claim 're-checked by the sweep' agrees with item4.mutants.repair rows", claimed == present, f'claimed={claimed} inRepairRows={present}')

# --- item4.mutants.repair against its output file
mr = i4['mutants']['repair']
out_b = blob(REV, mr['output'])
check('mutants.repair.outputSha256', out_b is not None and sha(out_b) == mr['outputSha256'])
check('mutants.repair.toolSha256', sha(blob(REV, mr['tool'])) == mr['toolSha256'] == rec['tools']['item4-repair-sweep.py'])
out = json.loads(out_b)
check('output.repairCommit == c7ed9ef2', out['repairCommit'] == full('c7ed9ef2'))
check('baselineAtRepair == output baseline', mr['baselineAtRepair'] == out['baselineAtRepairCommit'], out['baselineAtRepairCommit'])
pa = json.loads(blob(REV, D + 'population-audit-c7ed9ef2.json'))['reachabilityRule']
check('baseline == population-audit-c7ed9ef2 reach rule', out['baselineAtRepairCommit'] == {'createHashSha256Sites': pa['createHashSha256Sites'], 'localSha256Definitions': pa['localSha256Definitions']})
for rr in mr['rows']:
    o = next(x for x in out['rows'] if x['id'] == rr['id'])
    check(f"repair row {rr['id']} equals output row", all(o[k] == rr[k] for k in ('old', 'new', 'commit', 'createHashSha256Sites', 'localSha256Definitions', 'killedBySweep')))
    src = blob('c7ed9ef2', o['file']).decode()
    check(f"repair row {rr['id']} old occurs once at c7ed9ef2", src.count(o['old']) == 1)
    orig = next(x for x in rows if x['id'] == rr['id'])
    check(f"repair row {rr['id']} old/new equal the b214ef10 row's", orig['old'] == rr['old'] and orig['new'] == rr['new'])
    kill = o['createHashSha256Sites'] > out['baselineAtRepairCommit']['createHashSha256Sites'] or o['localSha256Definitions'] > out['baselineAtRepairCommit']['localSha256Definitions']
    check(f"repair row {rr['id']} killedBySweep follows from counts", kill == o['killedBySweep'])
check('fixture blob fields in the output equal git', out['fixtureBlobAtRepairCommit'] == git('rev-parse', f'c7ed9ef2:{FIXTURE}').strip() == out['fixtureBlobAtB214ef10'])

# --- item4.differential.repair against the stored outputs
dr = i4['differential']['repair']
head = blob(REV, D + 'junit-fixture-differential-head-c7ed9ef2.json')
base = blob(REV, D + 'junit-fixture-differential-base-f7477f52.json')
r1h = blob(REV, D + 'junit-fixture-differential-head-b214ef10.json')
check('differential.repair.commit == c7ed9ef2', dr['commit'] == full('c7ed9ef2'))
check('outputSha256 == head-c7ed9ef2.json', sha(head) == dr['outputSha256'])
check('baseOutputSha256 == base-f7477f52.json', sha(base) == dr['baseOutputSha256'])
check('roundOneHeadOutputSha256 == head-b214ef10.json', sha(r1h) == dr['roundOneHeadOutputSha256'])
check('byte-identical claims hold', (head == base) == dr['byteIdenticalToBase'] and (head == r1h) == dr['byteIdenticalToRoundOneHead'] and head == base)
cmp = json.loads(blob(REV, D + 'junit-fixture-differential-compare-c7ed9ef2.json'))
check('compareOutput == compare-c7ed9ef2.json', cmp == dr['compareOutput'], cmp)
h = json.loads(head)
hrows = h['rows'] if isinstance(h, dict) and 'rows' in h else h
fam = {}
for row in hrows:
    k = row.get('family') or row.get('kind') or row.get('site') or '?'
    fam[k] = fam.get(k, 0) + 1
check('head-c7ed9ef2 holds 40 rows; family split', len(hrows) == 40, fam)

# --- item4.sweep.repair against the stored outputs and the second method
sr = i4['sweep']['repair']
pa_all = json.loads(blob(REV, D + 'population-audit-c7ed9ef2.json'))
check('sweep.repair.commit == c7ed9ef2', sr['commit'] == full('c7ed9ef2'))
for rule in ('nameRule', 'reachabilityRule'):
    check(f'sweep.repair.{rule} == population-audit-c7ed9ef2', all(pa_all[rule][k] == v for k, v in sr[rule].items()), sr[rule])
mv = sr['movesWith']
for label, commit in (('base f7477f52', 'f7477f52'), ('b214ef10 (both sites converted)', 'b214ef10'), ('merge 4b9a4be0 (main merged, junitDigest still converted)', '4b9a4be0'), ('repair c7ed9ef2', 'c7ed9ef2')):
    stored = json.loads(blob(REV, D + f'population-audit-{commit}.json'))['reachabilityRule']
    check(f'movesWith[{label}] == population-audit-{commit}', mv[label] == {k: stored[k] for k in mv[label]}, mv[label])
sw = json.loads(blob(REV, D + 'sweep-c7ed9ef2.json'))
check('population-audit-c7ed9ef2 and sweep-c7ed9ef2 name the full repair commit', pa_all.get('commit') == full('c7ed9ef2') == sw.get('commit'))

# --- full suite
fs = i4['repair']['fullSuiteAtRepair']
log = blob(REV, D + 'full-suite-c7ed9ef2.log').decode()
check('fullSuiteAtRepair.commit == c7ed9ef2', fs['commit'] == full('c7ed9ef2'))
check('full-suite log carries the recorded files line', re.search(r'Test Files\s+' + re.escape(fs['files']), log) is not None, fs['files'])
check('full-suite log carries the recorded tests line', re.search(r'Tests\s+' + re.escape(fs['tests']), log) is not None, fs['tests'])
check('full-suite log names its commit inside the file (rule 11)', full('c7ed9ef2')[:8] in log, 'commit is named only by the filename and the record' if full('c7ed9ef2')[:8] not in log else '')

# --- evidenceCurrencyAtRepair: commits named; denominators
ec = rec['evidenceCurrencyAtRepair']
check('evidenceCurrencyAtRepair names three commits', sorted(ec['counts']) == ['4b9a4be0', 'c7ed9ef2', 'eb8fb6cb'], sorted(ec['counts']))

print(f'summary checks={len(results)} ok={sum(results)} fail={len(results) - sum(results)}')
sys.exit(0 if all(results) else 1)
