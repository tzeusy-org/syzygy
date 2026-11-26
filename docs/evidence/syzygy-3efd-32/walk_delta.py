#!/usr/bin/env python3
"""Generate SEMANTIC-DELTA.md for version 2.NN (figure walks) from the bytes of the predecessor and the new text. Usage: delta.py <worktree>."""
import difflib
import hashlib
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
PRED = 'openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md'
NEW = 'openspec/changes/dossier-figure-walks/proposed/polaris-generation/spec.md'
pb, nb_ = (W / PRED).read_bytes(), (W / NEW).read_bytes()
old, new = pb.decode('utf-8').split('\n'), nb_.decode('utf-8').split('\n')


def body(lines):
    start = next(i for i, line in enumerate(lines) if line.startswith('### Requirement:'))
    return lines[start:]


ob, nb = body(old), body(new)
sm = difflib.SequenceMatcher(a=ob, b=nb, autojunk=False)
kept = sum(b.size for b in sm.get_matching_blocks())
changed, removed, inserted = [], [], []
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'replace':
        assert i2 - i1 == j2 - j1
        changed += list(zip(range(i1, i2), range(j1, j2)))
    elif tag == 'delete':
        removed += list(range(i1, i2))
    elif tag == 'insert':
        inserted += list(range(j1, j2))
assert not removed

amend = []
for i, j in changed:
    a, b = ob[i].split(' '), nb[j].split(' ')
    w = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    for tag, a1, a2, b1, b2 in w.get_opcodes():
        if tag == 'equal':
            continue
        lead = ' '.join(a[max(0, a1 - 6):a1])
        if tag == 'insert':
            amend.append(f'- After "…{lead}": inserted "{" ".join(b[b1:b2])}".')
        else:
            amend.append(f'- After "…{lead}": displaced "{" ".join(a[a1:a2])}"; now "{" ".join(b[b1:b2])}".')

added_paras = [nb[j] for j in inserted if nb[j].strip() and not nb[j].startswith('#### Scenario:') and not nb[j].startswith('- **')]
scen = [nb[j][len('#### Scenario: '):] for j in inserted if nb[j].startswith('#### Scenario:')]
para_at = next(j for j in inserted if nb[j] in added_paras)
prev = next(nb[k] for k in range(para_at - 1, -1, -1) if nb[k].strip())
lead_words = ' '.join(prev.split(' ')[:14])
sha = lambda b: hashlib.sha256(b).hexdigest()

out = f'''# Version 2.NN semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-32/walk_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor at drafting is the MODIFIED text in `{PRED}` (dossier figure plan version 2.33; sha256 `{sha(pb)}`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`{NEW}`, sha256 `{sha(nb_)}`) replaces the effective text. Derived-base views (syzygy-3efd.38) is to be adopted first; this text is then rebuilt over that version by the build script, and its schema and brief numbers, written here as the placeholders `vSS` and `vBB`, and its label `2.NN` are fixed then (`design.md` D1). Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.33's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's {len(ob)} lines, {kept} appear byte for byte and in order in the new text; {len(changed)} are amended in place (below) and none is removed. All {sum(1 for l in ob if l.startswith('#### Scenario:'))} predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-32/walk_build_spec.py`, which reproduces the spec byte for byte); `walk_survival.py` beside it prints the line and scenario counts and checks each predecessor scenario block.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.NN. In the requirement, each changed line, with the displaced words and the words that replace them:

{chr(10).join(amend)}

## Added

[Observed] {len(added_paras)} paragraphs, placed immediately after the paragraph beginning "{lead_words} …":

''' + '\n'.join(f'- "{" ".join(p.split(" ")[:16])} …"' for p in added_paras) + f'''

[Observed] {len(scen)} scenarios, after the predecessor's last scenario and before the Form line: {", ".join(f'"{s}"' for s in scen)}.

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D7 states: a draft of schema v14 or earlier keeps every finding and byte but for a `field-version` finding at a walk; a schema-vSS draft without a walk renders as the same draft in schema v14. A walk moves only the page that draws its figure (a wrapper, an HTML layer, a list and the walk style rules), that page's measures in the size report and the rendered-design packet. No paragraph's bytes, the drawing's bytes, `machine.json`, every check record, the reading ledger and every provider-mode byte move.
'''
(W / 'openspec/changes/dossier-figure-walks/SEMANTIC-DELTA.md').write_text(out, encoding='utf-8')
print('changed', len(changed), 'kept', kept, 'paras', len(added_paras), 'scenarios', len(scen))
