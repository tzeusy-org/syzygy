#!/usr/bin/env python3
"""Compare two byte-identity dumps (syzygy-3efd.50) and write the evidence record.

Usage: byte_identity_compare.py <before.json> <after.json> <before-commit> <after-commit> <out.json>

Each dump is written by the describe block in byte-identity-dump-block.ts.txt, appended for the run to
packages/polaris-dossier/src/render.test.ts in a checkout of the named commit and removed after it (run with
SUBSEC_DUMP=<file>). It checks and, where the check passes, renders a draft of each schema v2 to v7 in three variants
(plain, carrying `subsections`, and a sequence figure before v7) and hashes every file of the run directory but
run.json. The record lists, per variant, the outcome and every file whose bytes differ, and, where findings differ,
each differing pair.

Population: the 18 synthetic variants the dumper builds, nothing else. It is not every stored fixture: every other stored
draft is exercised only by the existing literal suites, whose expectations this change left unchanged except version
literals, and the provider golden, which its own test compares byte for byte. Both dumps are kept beside the record.
"""
import hashlib, json, sys

before_path, after_path, before_commit, after_commit, out = sys.argv[1:6]
raw_before, raw_after = open(before_path, 'rb').read(), open(after_path, 'rb').read()
before, after = json.loads(raw_before), json.loads(raw_after)
if before.keys() != after.keys():
    raise SystemExit('the dumps hold different variants')
variants, files = [], 0
for key in before:
    b, a = before[key], after[key]
    if b['files'].keys() != a['files'].keys():
        raise SystemExit(f'{key}: different file sets')
    files += len(b['files'])
    differing = [f for f in b['files'] if b['files'][f] != a['files'][f]]
    findings = None
    if b['findings'] != a['findings']:
        if len(b['findings']) != len(a['findings']):
            raise SystemExit(f'{key}: a different number of findings')
        findings = [{'before': x, 'after': y} for x, y in zip(b['findings'], a['findings']) if x != y]
    variants.append({'variant': key, 'outcomeBefore': b['outcome'], 'outcomeAfter': a['outcome'], 'renderBefore': b.get('render'),
                     'renderAfter': a.get('render'), 'files': len(b['files']), 'differingFiles': differing, 'differingFindings': findings})
record = {
    'format': 'byte-identity-comparison/1',
    'subject': {'before': before_commit, 'after': after_commit},
    'dumps': {'before': hashlib.sha256(raw_before).hexdigest(), 'after': hashlib.sha256(raw_after).hexdigest()},
    'method': ' '.join(__doc__.strip().split('\n\n')[-2:]).replace('\n', ' '),
    'population': {'variants': len(variants), 'files': files},
    'variants': variants,
}
with open(out, 'w') as handle:
    handle.write(json.dumps(record, indent=1) + '\n')
print(len(variants), 'variants,', files, 'files')
