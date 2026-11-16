#!/usr/bin/env python3
"""Check the hand resolution of AGENTS.md in merge a5b1d532 (PR 534, round 2).
Usage: python3 -I agents_merge_check.py <repo> <merge-base> <ours> <theirs> <merge> <out.json>

Computes each side's change against the merge base with difflib (opcodes over lines), applies both sides' changes
to the base independently of git, and compares the result with the committed merge, byte for byte. Also reports,
for each side, whether every line that side added is present in the merge, in order, as one contiguous block."""
import difflib
import json
import subprocess
import sys

repo, base, ours, theirs, merge, out = sys.argv[1:7]


def lines(c):
    return subprocess.run(['git', '-C', repo, 'show', f'{c}:AGENTS.md'], check=True, capture_output=True).stdout.decode('utf-8').splitlines(keepends=True)


B, O, T, M = lines(base), lines(ours), lines(theirs), lines(merge)
ops_o = [op for op in difflib.SequenceMatcher(None, B, O, autojunk=False).get_opcodes() if op[0] != 'equal']
ops_t = [op for op in difflib.SequenceMatcher(None, B, T, autojunk=False).get_opcodes() if op[0] != 'equal']
# Apply both edit lists to the base. Where both sides insert at the same base position, ours goes first (the
# order the PR body states: this PR's bullet, then main's).
edits = [(i1, i2, O[j1:j2], 0) for _, i1, i2, j1, j2 in ops_o] + [(i1, i2, T[j1:j2], 1) for _, i1, i2, j1, j2 in ops_t]
edits.sort(key=lambda e: (e[0], e[1], e[3]))
overlap = any(a[1] > b[0] and not (a[0] == a[1] == b[0] == b[1]) for a, b in zip(edits, edits[1:]))
res, at = [], 0
for i1, i2, new, _ in edits:
    if i1 < at:
        continue
    res += B[at:i1] + new
    at = i2
res += B[at:]


def block_present(added_blocks, target):
    text = ''.join(target)
    return [''.join(b) in text for b in added_blocks]


result = {
    'base': base, 'ours': ours, 'theirs': theirs, 'merge': merge,
    'oursEdits': [{'op': t, 'base': [i1, i2], 'side': [j1, j2], 'added': ''.join(O[j1:j2])} for t, i1, i2, j1, j2 in ops_o],
    'theirsEdits': [{'op': t, 'base': [i1, i2], 'side': [j1, j2], 'added': ''.join(T[j1:j2])} for t, i1, i2, j1, j2 in ops_t],
    'editsOverlap': overlap,
    'bothAppliedEqualsMerge': ''.join(res) == ''.join(M),
    'oursAddedBlocksInMerge': block_present([O[j1:j2] for _, _, _, j1, j2 in ops_o], M),
    'theirsAddedBlocksInMerge': block_present([T[j1:j2] for _, _, _, j1, j2 in ops_t], M),
    'mergeLines': len(M), 'baseLines': len(B),
}
json.dump(result, open(out, 'w'), indent=1)
print(json.dumps({k: v for k, v in result.items() if k not in ('oursEdits', 'theirsEdits')}))
print('ours edits', [(e['op'], e['base']) for e in result['oursEdits']], 'theirs edits', [(e['op'], e['base']) for e in result['theirsEdits']])
