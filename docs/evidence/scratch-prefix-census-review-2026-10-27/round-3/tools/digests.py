#!/usr/bin/env python3
"""Every digest the evidence directory carries about its own files, checked against the bytes at the checked-out commit.

Usage: digests.py <evidence-directory>
"""
import hashlib
import json
import pathlib
import sys

EV = pathlib.Path(sys.argv[1])
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
files = sorted(str(p.relative_to(EV)) for p in EV.rglob('*') if p.is_file())
ver = json.loads((EV / 'verification-2026-10-24.json').read_text())
census = json.loads((EV / 'census-2026-10-24.json').read_text())
selftest = json.loads((EV / 'assemble-selftest-2026-10-24.json').read_text())
inputs = json.loads((EV / 'input-checks-2026-10-24.json').read_text())
sampler = json.loads((EV / 'runs' / 'sampler-digests.json').read_text())['sha256']

checks = []
for name, want in ver['fileSha256'].items():
    checks.append(('verification.fileSha256', name, want == sha(EV / name)))
for name, want in census['subject']['toolSha256'].items():
    checks.append(('census.subject.toolSha256', name, want == sha(EV / name)))
checks.append(('census.subject.staticSitesSha256', 'static-sites-2026-10-24.json', census['subject']['staticSitesSha256'] == sha(EV / 'static-sites-2026-10-24.json')))
checks.append(('census.subject.carriedObservationsSha256', 'runs/carried-observations.json', census['subject']['carriedObservationsSha256'] == sha(EV / 'runs' / 'carried-observations.json')))
for label, want in census['subject']['samplerRecordSha256'].items():
    checks.append(('census.subject.samplerRecordSha256', label, want == sha(EV / 'runs' / f'{label}.samples.json')))
for label, want in sampler.items():
    checks.append(('runs/sampler-digests.json', label, want == sha(EV / 'runs' / f'{label}.samples.json')))
checks.append(('assemble-selftest.sha256', 'assemble_census.py', selftest['sha256'] == sha(EV / 'assemble_census.py')))
checks.append(('input-checks.assemblerSha256', 'assemble_census.py', inputs['assemblerSha256'] == sha(EV / 'assemble_census.py')))
unlisted = [f for f in files if f not in ver['fileSha256'] and f != 'verification-2026-10-24.json']
print(json.dumps({'filesInTheDirectory': len(files), 'verificationListed': len(ver['fileSha256']), 'unlistedExceptVerificationItself': unlisted,
                  'checks': len(checks), 'failed': [c for c in checks if not c[2]],
                  'selftest': {'mutants': len(selftest['mutants']), 'killed': sum(m['killed'] for m in selftest['mutants'].values()),
                               'unmutatedMeets': selftest['unmutated']['meets'], 'holds': selftest['holds']}}, indent=1))
