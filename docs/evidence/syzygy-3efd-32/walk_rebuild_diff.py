#!/usr/bin/env python3
"""Compare the reviewed figure-walks edits (2.NN over figure plan 2.33, at 9a3be0143) with the rebuilt ones (2.40 over import facts 2.39).

Usage: walk_rebuild_diff.py <worktree>. Each text is reduced to the lines it adds or changes against its own predecessor, file head
aside; the reviewed lines are relabelled (2.NN -> 2.40, schema vSS -> v16, brief vBB -> v24, and the predecessor's numbers 2.33, v14,
v22 -> 2.39, v15, v23, in the walk's own lines only). Every word-level difference left is printed, so the rebuild's intended changes
(the moved anchors and the base-element rule) can be read against the reviewed bytes; nothing else is printed.
A Form line is compared whole, so its items also show the predecessors' own text on that line (2.33's words beside
2.35's, 2.37's and 2.38's additions, and the relabelling's effect on them); those items are no walk edit.
"""
import difflib
import hashlib
import pathlib
import re
import subprocess
import sys

W = pathlib.Path(sys.argv[1])
REVIEWED = '9a3be0143'
OLD_PRED = 'openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md'
NEW_PRED = 'openspec/changes/dossier-import-facts/proposed/polaris-generation/spec.md'
SPEC = 'openspec/changes/dossier-figure-walks/proposed/polaris-generation/spec.md'


def show(rev, path):
    return subprocess.run(['git', '-C', str(W), 'show', f'{rev}:{path}'], check=True, capture_output=True).stdout


def added(pred, succ):
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, pred[3:], succ[3:], autojunk=False).get_opcodes():
        if op != 'equal':
            out += succ[3 + j1:3 + j2]
    return [line for line in out if line.strip()]


rb = show(REVIEWED, SPEC)
old = added(show(REVIEWED, OLD_PRED).decode().split('\n'), rb.decode().split('\n'))
nb = (W / SPEC).read_bytes()
new = added((W / NEW_PRED).read_text(encoding='utf-8').split('\n'), nb.decode().split('\n'))
print('reviewed', hashlib.sha256(rb).hexdigest(), 'rebuilt', hashlib.sha256(nb).hexdigest())

RELABEL = [('2.NN', '2.40'), ('vSS', 'v16'), ('-vSS', '-v16'), ('vBB', 'v24'), ('-vBB', '-v24'), ('version 2.33', 'version 2.39'),
           ('schema v14', 'schema v15'), ('schema-v14', 'schema-v15'), ('brief v22', 'brief v23'), ('v14 or earlier', 'v15 or earlier')]


def relabel(line):
    for a, b in RELABEL:
        line = line.replace(a, b)
    return line


old = [relabel(line) for line in old]
print('added or changed lines: reviewed', len(old), 'rebuilt', len(new))
words = re.compile(r'\S+')
for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, old, new, autojunk=False).get_opcodes():
    if op == 'equal':
        continue
    for k in range(max(i2 - i1, j2 - j1)):
        a = old[i1 + k] if i1 + k < i2 else ''
        b = new[j1 + k] if j1 + k < j2 else ''
        wa, wb = words.findall(a), words.findall(b)
        for wop, a1, a2, b1, b2 in difflib.SequenceMatcher(None, wa, wb, autojunk=False).get_opcodes():
            if wop != 'equal':
                lead = ' '.join(wa[max(0, a1 - 6):a1])
                print(f'- after "...{lead}": {wop} "{" ".join(wa[a1:a2])[:300]}" -> "{" ".join(wb[b1:b2])[:600]}"')
