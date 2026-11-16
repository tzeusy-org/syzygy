#!/usr/bin/env python3
"""syzygy-bpyt.6.14: the round-1 review's mutant fragments (R-GP-IMPL-SUPPORT-LEAF-GUARDS-1, §4 and §6), copied by script from
the reviewer's own records, so mutants.py and residuals.py read them by id and never retype them.

Usage: python3 -I reviewer_r1_fragments.py <the review's directory> <out.json>

Reads four records from that directory and keeps, for each row id named below, its edits verbatim ({path, old, new} or
{path, link}). Each record's sha256 is stored beside them; the review's §8 table lists the same four digests, so the copy can be
checked against the raw review without the directory.
"""
import hashlib
import json
import os
import sys

ROWS = {
    'rev-mutants-head-present.json': ['Y3-R1-escalated-to-the-environment', 'Y5b-computed-import-newline', 'Y5c-computed-import-comment',
                                      'Y6-allowed-global-member-replaced', 'Y7-export-star-from-node-crypto', 'Y9-export-star-as-allowed-name',
                                      'Y10-string-named-re-export', 'Y11-string-named-import-called-at-import', 'Y12-namespace-import-re-exported',
                                      'Y14-drafter-takes-randomness-through-support'],
    'rev-mutants-head-absent.json': ['K4-shared-Date-token-weakened-plus-DK1'],
    'rev-mutants-head-present-z7.json': ['Z7-unscoped-workspace-with-no-entry'],
    'fix-check2.json': ['G0-guard-removed-alone'],
}


def main():
    review, out_path = sys.argv[1:3]
    records, fragments = {}, {}
    for name, ids in ROWS.items():
        data = open(os.path.join(review, name), 'rb').read()
        records[name] = hashlib.sha256(data).hexdigest()
        by_id = {row['id']: row for row in json.loads(data)['rows']}
        for rid in ids:
            fragments[rid] = {'record': name, 'tests': by_id[rid].get('tests'), 'observedAtReview': by_id[rid]['observed'],
                              'edits': [{k: e[k] for k in ('path', 'old', 'new', 'link') if k in e} for e in by_id[rid]['edits']]}
    json.dump({'review': 'R-GP-IMPL-SUPPORT-LEAF-GUARDS-1', 'reviewedCommit': '5995aa3c0a23f4862f7107c401a72a222b8a7998',
               'records': records, 'fragments': fragments}, open(out_path, 'w'), indent=1)
    print({rid: len(f['edits']) for rid, f in fragments.items()})


if __name__ == '__main__':
    main()
