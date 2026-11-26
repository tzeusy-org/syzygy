#!/usr/bin/env python3
"""Line and scenario survival of a MODIFIED requirement over its predecessor. Usage: survival.py <predecessor> <new>.

Prints counts and, for each changed line, the word diff (displaced and replacing words with a short lead); prints no other text.
"""
import difflib
import re
import sys

old = open(sys.argv[1], encoding='utf-8').read().split('\n')
new = open(sys.argv[2], encoding='utf-8').read().split('\n')


def body(lines):
    start = next(i for i, line in enumerate(lines) if line.startswith('### Requirement:'))
    return lines[start:]


ob, nb = body(old), body(new)
sm = difflib.SequenceMatcher(a=ob, b=nb, autojunk=False)
kept = sum(block.size for block in sm.get_matching_blocks())
changed, removed, inserted = [], [], []
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'replace':
        changed += list(zip(range(i1, i2), range(j1, j2)))
        if i2 - i1 != j2 - j1:
            print('UNEVEN replace', i1, i2, j1, j2)
    elif tag == 'delete':
        removed += list(range(i1, i2))
    elif tag == 'insert':
        inserted += list(range(j1, j2))
print(f'predecessor requirement lines {len(ob)}; carried byte for byte and in order {kept}; amended in place {len(changed)}; removed {len(removed)}; inserted {len(inserted)} (of which non-blank {sum(1 for j in inserted if nb[j].strip())})')
scen = lambda lines: [line for line in lines if line.startswith('#### Scenario:')]
os_, ns = scen(ob), scen(nb)
print(f'scenarios predecessor {len(os_)}; new {len(ns)}; predecessor scenarios surviving by title {sum(1 for s in os_ if s in ns)}; added {[s[14:] for s in ns if s not in os_]}')
# Each predecessor scenario's whole block survives byte for byte?
def blocks(lines):
    out, cur = {}, None
    for line in lines:
        if line.startswith('#### Scenario:') or line.startswith('Form:') or line.startswith('### '):
            cur = line if line.startswith('#### Scenario:') else None
            if cur:
                out[cur] = []
            continue
        if cur:
            out[cur].append(line)
    return out
ob_b, nb_b = blocks(ob), blocks(nb)
print(f'predecessor scenario blocks byte-identical in new text {sum(1 for k, v in ob_b.items() if nb_b.get(k) == v)} of {len(ob_b)}')
for i, j in changed:
    a, b = ob[i].split(' '), nb[j].split(' ')
    w = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    for tag, a1, a2, b1, b2 in w.get_opcodes():
        if tag != 'equal':
            lead = ' '.join(a[max(0, a1 - 6):a1])
            print(f'line {i + 1}: after "…{lead}": {tag} "{" ".join(a[a1:a2])[:300]}" -> "{" ".join(b[b1:b2])[:300]}"')
