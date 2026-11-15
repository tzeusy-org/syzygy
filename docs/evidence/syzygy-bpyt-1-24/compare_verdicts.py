#!/usr/bin/env python3
"""Compare two `verdicts_over_tree_2.mjs` outputs (syzygy-bpyt.1.24). Evidence tool, not a check.
usage: python3 compare_verdicts.py BASE.json HEAD.json
Each answer is compared as its whole canonical JSON, keyed by instant and answer name. An answer present in one run and not the other
counts as changed. Prints JSON: the two subjects, whether their decisions trees are the same bytes, the population, the changed
answers (each with both sides) and a tally of answer shapes so a reader can see the comparison is not vacuous. Exits 1 when any
answer differs, when the decisions trees differ, or when either tree had uncommitted package or decisions changes."""
import json, sys
from collections import Counter

def shape(answer):
    if isinstance(answer, list): return f'list[{len(answer)}]'
    if not isinstance(answer, dict): return type(answer).__name__
    if 'threw' in answer: return 'threw ' + answer['threw'].split(':')[0]
    for key in ('state', 'kind', 'ok', 'satisfied', 'stated'):
        if key in answer: return f'{key}={answer[key]}'
    return 'object'

base, head = (json.load(open(p)) for p in sys.argv[1:3])
population, changed, shapes = 0, [], Counter()
for b, h in zip(base['runs'], head['runs'], strict=True):
    assert b['now'] == h['now'], (b['now'], h['now'])
    for name in sorted(set(b['answers']) | set(h['answers'])):
        population += 1
        old, new = b['answers'].get(name, '<missing>'), h['answers'].get(name, '<missing>')
        shapes[f'{name.split(":")[0]} {shape(old)}'] += 1
        if json.dumps(old, sort_keys=True) != json.dumps(new, sort_keys=True):
            changed.append({'now': b['now'], 'answer': name, 'base': old, 'head': new})
same_tree = base['subject']['decisionsTreeSha256'] == head['subject']['decisionsTreeSha256']
dirty = base['packagesOrDecisionsDirty'] + head['packagesOrDecisionsDirty']
print(json.dumps({'base': {'commit': base['commit'], **base['subject']}, 'head': {'commit': head['commit'], **head['subject']},
                  'sameDecisionsTree': same_tree, 'dirty': dirty, 'instants': [r['now'] for r in base['runs']],
                  'population': population, 'changedCount': len(changed), 'changed': changed, 'baseShapes': dict(sorted(shapes.items()))}, indent=1))
sys.exit(1 if changed or not same_tree or dirty else 0)
