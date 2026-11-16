#!/usr/bin/env python3
"""Add `sha256AtCommit` to evidence records that name a `treeCommit` and no digest (review note N4, rule 11).

Usage: add_sha256_at_commit.py <worktree> <record.json>...

For each record the four code files of syzygy-bpyt.4.11 are hashed as the record's `treeCommit` holds them
(`git show <treeCommit>:<path>`), and the map is written into the record straight after `treeCommit`. Nothing else in the
record changes: the script refuses a record that already has the field, and it checks that the record read back and dumped
again with the same formatting is byte for byte the file it read, so the only change is the added field. The digests are
computed, never typed. browser_files_run.py writes the same field for a new record.
"""
import hashlib
import json
import pathlib
import subprocess
import sys

WT = pathlib.Path(sys.argv[1]).resolve()
CODE_FILES = ['apps/three-surface-poc/src/cdp-browser.ts', 'apps/three-surface-poc/src/cdp-browser.test.ts', 'apps/three-surface-poc/src/cdp-browser.browser.test.ts',
              'apps/three-surface-poc/src/polaris-generation/draft-preview.browser.test.ts']


def digest_at(commit: str, path: str) -> str:
    return hashlib.sha256(subprocess.run(['git', 'show', f'{commit}:{path}'], cwd=WT, capture_output=True, check=True).stdout).hexdigest()


for name in sys.argv[2:]:
    path = pathlib.Path(name).resolve()
    text = path.read_text()
    record = json.loads(text)
    assert json.dumps(record, indent=1) + '\n' == text, f'{name} does not round-trip: rewriting it would change more than the added field'
    assert 'sha256AtCommit' not in record, f'{name} already carries sha256AtCommit'
    commit = record['treeCommit']
    assert len(commit) == 40, f'{name}: treeCommit is not a full commit'
    digests = {file: digest_at(commit, file) for file in CODE_FILES}
    out = {}
    for key, value in record.items():
        out[key] = value
        if key == 'treeCommit':
            out['sha256AtCommit'] = digests
    path.write_text(json.dumps(out, indent=1) + '\n')
    print(name, commit, {pathlib.Path(f).name: d[:12] for f, d in digests.items()})
