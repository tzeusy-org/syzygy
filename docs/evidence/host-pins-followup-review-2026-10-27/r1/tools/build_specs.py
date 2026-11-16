#!/usr/bin/env python3
"""Build rev-542's spec files.

Usage: python3 -I build_specs.py <tree> <outdir>

targets.json: CONTROL, V2, V4, V6, V10 copied byte for byte from the PR 535 reviewer's
rev535-specs.json, and O1, O2 from the lane's own-specs.json, both read with `git show
fb481b4d:<path>` (the reviewed commit), so nothing is transcribed.
own.json: this reviewer's mutants R1..R9, written here as literals (R1 and R2 are V7 and V8,
copied from rev535-specs.json and checked equal).
"""
import json
import subprocess
import sys

tree, outdir = sys.argv[1:3]


def show(path):
    return json.loads(subprocess.run(['git', '-C', tree, 'show', f'fb481b4d:{path}'], capture_output=True,
                                     text=True, check=True).stdout)


rev535 = {m['id']: m for m in show('docs/evidence/host-pins-review-2026-10-27/rev535-specs.json')['mutants']}
own = {m['id']: m for m in show('docs/evidence/syzygy-bpyt-7-16/own-specs.json')['mutants']}


def pick(table, prefix):
    hits = [m for k, m in table.items() if k == prefix or k.startswith(prefix + '-')]
    assert len(hits) == 1, prefix
    return {'id': hits[0]['id'], 'edits': hits[0]['edits']}


targets = [{'id': 'CONTROL', 'edits': []}] + [pick(rev535, p) for p in ('V2', 'V4', 'V6', 'V10')] + \
          [pick(own, p) for p in ('O1', 'O2')]
CRED = 'packages/http-host/src/credentials.ts'
ORIG = 'apps/three-surface-poc/src/browser-origin.ts'
SERV = 'packages/http-host/src/server.ts'
LIST = "['project shape not-evaluated', 'project shape not-admitted', 'project shape observation-failed']"
mine = [
    {'id': 'R1-V7-origin-case-insensitive', 'edits': pick(rev535, 'V7')['edits']},
    {'id': 'R2-V8-host-lower-cased', 'edits': pick(rev535, 'V8')['edits']},
    {'id': 'R3-lexical-containment-case-folded-only', 'edits': [{
        'file': CRED, 'old': '  if (!isWithin(root, resolved)) {',
        'new': '  if (!isWithin(root.toLowerCase(), resolved.toLowerCase())) {'}]},
    {'id': 'R4-bearer-header-trimStart', 'edits': [{
        'file': CRED, 'old': '  const match = /^Bearer (.+)$/.exec(header);',
        'new': '  const match = /^Bearer (.+)$/.exec(header.trimStart());'}]},
    {'id': 'R5-bearer-header-NFKC-normalized', 'edits': [{
        'file': CRED, 'old': '  const match = /^Bearer (.+)$/.exec(header);',
        'new': "  const match = /^Bearer (.+)$/.exec(header.normalize('NFKC'));"}]},
    {'id': 'R6-real-location-containment-case-folded-only', 'edits': [{
        'file': CRED, 'old': '  if (!isWithin(realRoot, realTarget) || realTarget === realRoot) {',
        'new': '  if (!isWithin(realRoot.toLowerCase(), realTarget.toLowerCase()) || realTarget === realRoot) {'}]},
    {'id': 'R7-origin-url-normalized', 'edits': [{
        'file': ORIG, 'old': '  return origin === undefined || origin === expectedOrigin(host);',
        'new': '  return origin === undefined || (() => { try { return new URL(origin).origin === '
               'expectedOrigin(host); } catch { return false; } })();'}]},
    {'id': 'R8-breach-list-prefix-match', 'edits': [{
        'file': SERV, 'old': f'{LIST}.includes(population.reason)',
        'new': f'{LIST}.some(listed => population.reason.startsWith(listed))'}]},
    {'id': 'R9-breach-list-trimmed-match', 'edits': [{
        'file': SERV, 'old': f'{LIST}.includes(population.reason)',
        'new': f'{LIST}.includes(population.reason.trim())'}]},
]
json.dump({'mutants': targets}, open(f'{outdir}/targets.json', 'w'), indent=1, ensure_ascii=True)
json.dump({'mutants': mine}, open(f'{outdir}/own.json', 'w'), indent=1, ensure_ascii=True)
print('targets', [m['id'] for m in targets])
print('own', [m['id'] for m in mine])
