#!/usr/bin/env python3
"""Check the round-1 repair of dc3-fence-rules-2026-10-25.json against the git objects (rules 6 and 11).
Usage: r2_check_record.py <clone with the PR's objects> <reviewed commit> <round-1 raw path> <out.json>
Reads the record and the evidence files at the reviewed commit with `git show`, never from the working tree."""
import hashlib
import json
import re
import subprocess
import sys

clone, commit, raw1, out = sys.argv[1:5]
E = 'docs/evidence/syzygy-bpyt-6-3/'


def show(rev, path):
    r = subprocess.run(['git', '-C', clone, 'show', f'{rev}:{path}'], capture_output=True)
    return r.stdout if r.returncode == 0 else None


def resolves(rev):
    return subprocess.run(['git', '-C', clone, 'cat-file', '-e', f'{rev}^{{commit}}'], capture_output=True).returncode == 0


sha = lambda b: hashlib.sha256(b).hexdigest()
rec = json.loads(show(commit, E + 'dc3-fence-rules-2026-10-25.json'))
checks = []


def check(name, ok, detail=None):
    checks.append({'check': name, 'ok': bool(ok), 'detail': detail})


# Subject commits.
s = rec['subject']
for k in ('baseCommit', 'codeCommit', 'reviewedHead', 'testedCommit'):
    check(f'subject.{k} resolves', resolves(s[k]), s[k])
mo = s['mergeOfMain']
parents = subprocess.run(['git', '-C', clone, 'log', '-1', '--format=%P', mo['commit']], capture_output=True, text=True).stdout.split()
check('mergeOfMain parents', parents == mo['parents'], parents)
paths = subprocess.run(['git', '-C', clone, 'ls-tree', '-r', '-z', '--name-only', mo['commit']], capture_output=True).stdout.split(b'\0')
check('mergeOfMain 5,462 paths', len([p for p in paths if p]) == 5462, len([p for p in paths if p]))
check('testedCommit is the reviewed commit\'s parent', subprocess.run(['git', '-C', clone, 'rev-parse', f'{commit}^'], capture_output=True, text=True).stdout.strip() == s['testedCommit'])

# Round-1 review identity.
rv = rec['roundOneRepair']['review']
check('review.rawSha256 equals the round-1 raw', sha(open(raw1, 'rb').read()) == rv['rawSha256'], rv['rawSha256'])

# Digests of tracked files named in the record.
rr = rec['changedProductionFiles']['roundOneRepairRun']
pairs = [
    (rr['emitEqual']['output'], rr['emitEqual']['outputSha256']),
    (rr['lineLevel']['tool'], rr['lineLevel']['toolSha256']),
    (rr['lineLevel']['output'], rr['lineLevel']['outputSha256']),
    (rec['mutants']['run']['expectedProbeOutput'], rec['mutants']['run']['expectedProbeOutputSha256']),
    (rec['probe']['roundOneRepairRun']['output'], rec['probe']['roundOneRepairRun']['outputSha256']),
]
for path, want in pairs:
    b = show(commit, path)
    check(f'sha256 of {path}', b is not None and sha(b) == want, {'want': want, 'got': sha(b) if b else None})

# Production blobs unchanged by the repair.
PROD = ['packages/three-surface-poc-core/src/markdown-code-context.ts', 'apps/three-surface-poc/src/polaris-markdown.ts',
        'packages/three-surface-poc-core/src/project-shape-extraction.ts', 'packages/three-surface-poc-core/src/project-shape-manifest.ts',
        'packages/polaris-generation-consent/src/package-reader.ts']
for p in PROD:
    blobs = {c: subprocess.run(['git', '-C', clone, 'rev-parse', f'{c}:{p}'], capture_output=True, text=True).stdout.strip() for c in ('9d9c98a6', 'af534d6e', 'ba7fce36', commit)}
    check(f'blob unchanged by the repair: {p}', len(set(blobs.values())) == 1, blobs)

# Mutants.
run = rec['mutants']['run']
head = run['head']
rows = run['mutants']
check('mutant rows = 26', len(rows) == 26, len(rows))
summary_failed = re.compile(r'Tests\s+(\d+) failed')
mut = []
for m in rows:
    src = show(head, m['file']).decode('utf8')
    r = {'id': m['id'], 'oldOnceAtHead': src.count(m['old']) == 1, 'commitResolves': resolves(m['commit'])}
    killed = []
    for d, v in m['detectors'].items():
        if d == 'probe':
            exp = (v.get('casesThatDiffer') or 0) > 0 or bool(v.get('inlineCasesThatDiffer')) or bool(v.get('consentFunctionTextDiffers'))
            r[f'{d}KilledConsistent'] = v['killed'] == exp
        else:
            sm = [summary_failed.search(x) for x in v.get('summary', [])]
            n = next((int(x.group(1)) for x in sm if x), 0)
            r[f'{d}FailedCountConsistent'] = (v['failedCount'] == len(v['failed']) == n) and (v['killed'] == (n > 0))
            r[f'{d}FailedListUncapped'] = len(v['failed']) == v['failedCount']
        if v['killed']:
            killed.append(d)
    want = 'killed by ' + ', '.join(killed) if killed else 'SURVIVED'
    r['verdictNamesExactlyTheKillers'] = m['verdict'] == want
    r['verdict'] = m['verdict']
    r['killedByATest'] = any(d != 'probe' and d != 'prior' and m['detectors'][d]['killed'] for d in m['detectors'])
    r['priorKilled'] = m['detectors'].get('prior', {}).get('killed')
    mut.append(r)
bad = [r for r in mut if not all(v for k, v in r.items() if k.endswith(('Consistent', 'Uncapped', 'Head', 'Killers')))]
check('every mutant row is internally consistent and its old occurs once at head', not bad, bad)
check('no mutant commit resolves (commitNote: discarded scratch commits)', not any(r['commitResolves'] for r in mut), [r['id'] for r in mut if r['commitResolves']])
sm = rec['mutants']['summary']
check('summary.killedByATest', sm['killedByATest'] == sum(r['killedByATest'] for r in mut), sum(r['killedByATest'] for r in mut))
check('summary.survived empty', sm['survived'] == [r['id'] for r in mut if r['verdict'] == 'SURVIVED'])
probe_only = [r['id'] for r in mut if not r['killedByATest'] and r['verdict'] != 'SURVIVED']
check('summary.killedByTheProbeOnly', sm['killedByTheProbeOnly'] == probe_only, probe_only)
newly = [r['id'] for r in mut if r['priorKilled'] is False and r['killedByATest']]
check('summary.newlyKilledByTheRepair = prior passed, a test kills', sorted(sm['newlyKilledByTheRepair']) == sorted(newly), newly)

json.dump({'commit': commit, 'checks': checks, 'mutants': mut, 'pass': all(c['ok'] for c in checks)}, open(out, 'w'), indent=1)
for c in checks:
    print('OK  ' if c['ok'] else 'FAIL', c['check'], '' if c['ok'] else json.dumps(c['detail'])[:400])
