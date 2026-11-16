#!/usr/bin/env python3
"""Check runs/sampler-digests.json and runs/carried-observations.json against the committed blobs, and the verification record's
digests against the files at the reviewed commit.

Usage: carried_checks.py <clone> <round-1-commit> <reviewed-commit>
"""
import hashlib
import json
import subprocess
import sys

clone, r1, r2 = sys.argv[1:4]
EV = 'docs/evidence/scratch-prefix-census-2026-10-23'


def blob(commit, path):
    return subprocess.run(['git', 'show', f'{commit}:{path}'], cwd=clone, capture_output=True, check=True).stdout


def ls(commit):
    out = subprocess.run(['git', 'ls-tree', '-r', '-z', '--name-only', commit, '--', EV], cwd=clone, capture_output=True, check=True).stdout
    return sorted(p.decode() for p in out.split(b'\0') if p)


sha = lambda b: hashlib.sha256(b).hexdigest()
digests = json.loads(blob(r2, f'{EV}/runs/sampler-digests.json'))['sha256']
r1_samples = {p.rsplit('/', 1)[1][:-len('.samples.json')]: sha(blob(r1, p)) for p in ls(r1) if p.endswith('.samples.json')}
r2_samples = {p.rsplit('/', 1)[1][:-len('.samples.json')]: sha(blob(r2, p)) for p in ls(r2) if p.endswith('.samples.json')}
print('1. sampler records at r1', len(r1_samples), 'at r2', len(r2_samples), 'digest entries', len(digests))
print('   digests == r1 blobs:', digests == r1_samples, ' digests == r2 blobs:', digests == r2_samples)
runs_r1 = {p: sha(blob(r1, p)) for p in ls(r1) if p.startswith(f'{EV}/runs/')}
runs_r2 = {p: sha(blob(r2, p)) for p in ls(r2) if p.startswith(f'{EV}/runs/')}
print('2. runs/ files r1', len(runs_r1), 'r2', len(runs_r2), 'added at r2', sorted(set(runs_r2) - set(runs_r1)), 'removed', sorted(set(runs_r1) - set(runs_r2)),
      'changed', sorted(p for p in runs_r1 if p in runs_r2 and runs_r1[p] != runs_r2[p]))

carried = json.loads(blob(r2, f'{EV}/runs/carried-observations.json'))
src = carried['vitestProjectDirectory']['carriedFrom']
census_r1 = blob(src['atCommit'], src['record'])
r1_census = json.loads(census_r1)
row = r1_census['leftBySIGKILL'][26]
print('3. carriedFrom blobSha256 ok', sha(census_r1) == src['blobSha256'], ' atCommit is r1', src['atCommit'].startswith(r1) or r1.startswith(src['atCommit'][:8]),
      ' row 26 class', row['class'], ' value', row.get('topLevelChildrenOfOneObserved'), ' carried', carried['vitestProjectDirectory']['topLevelChildren'],
      ' equal', row.get('topLevelChildrenOfOneObserved') == carried['vitestProjectDirectory']['topLevelChildren'])
others = [(i, r['class']) for i, r in enumerate(r1_census['leftBySIGKILL']) if 'topLevelChildrenOfOneObserved' in r]
print('   rows of r1 carrying the field', others)
census_r2 = json.loads(blob(r2, f'{EV}/census-2026-10-24.json'))
r2row = [r for r in census_r2['leftBySIGKILL'] if r['class'] == 'nanoid-21'][0]
print('   r2 value', r2row.get('topLevelChildrenOfOneObserved'), 'carriedFrom', r2row.get('topLevelChildrenCarriedFrom') == src)
print('   census subject samplerRecordSha256 == digests', census_r2['subject']['samplerRecordSha256'] == digests,
      ' carriedObservationsSha256 ok', census_r2['subject']['carriedObservationsSha256'] == sha(blob(r2, f'{EV}/runs/carried-observations.json')))
tool = census_r2['subject']['toolSha256']
print('   toolSha256 at r2:', {k: v == sha(blob(r2, f'{EV}/{k}')) for k, v in tool.items()}, ' staticSitesSha256 ok', census_r2['subject']['staticSitesSha256'] == sha(blob(r2, f'{EV}/static-sites-2026-10-24.json')))

ver = json.loads(blob(r2, f'{EV}/verification-2026-10-24.json'))
print('4. verification keys', list(ver)[:12])
files = None
for k, v in ver.items():
    if isinstance(v, dict) and v and all(isinstance(x, str) and len(x) == 64 for x in v.values()):
        files = v
        print('   digest map under', k, len(v))
if files:
    on_disk = {p[len(EV) + 1:]: sha(blob(r2, p)) for p in ls(r2)}
    mism = sorted(p for p in files if p in on_disk and on_disk[p] != files[p])
    print('   listed', len(files), 'on disk', len(on_disk), 'listedNotOnDisk', sorted(set(files) - set(on_disk)), 'onDiskNotListed', sorted(set(on_disk) - set(files)), 'mismatched', mism)
