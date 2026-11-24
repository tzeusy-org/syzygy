#!/usr/bin/env python3
"""Generate SEMANTIC-DELTA.md for version 2.25 (syzygy-5dhm.41) from the bytes of the predecessor and the new text. Usage: delta.py <worktree>."""
import difflib
import hashlib
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
PRED = 'openspec/changes/dossier-containment-figure/proposed/polaris-generation/spec.md'
NEW = 'openspec/changes/dossier-worth-knowing/proposed/polaris-generation/spec.md'
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

out = f'''# Version 2.25 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-5dhm-41/worth_knowing_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `{PRED}` (dossier containment figure version 2.23, row A-59, tag `polaris-dossier-containment-figure-v2.23`; sha256 `{sha(pb)}`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`{NEW}`, sha256 `{sha(nb_)}`) replaces that text, composed after version 2.23. Version 2.24 (the system model, open pull request #932) is not adopted and is not composed here; its numbers, schema `polaris-dossier-local-draft-v12` and brief `polaris-dossier-brief-v18`, are left to it. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.23's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's {len(ob)} lines, {kept} appear byte for byte and in order in the new text; {len(changed)} is amended in place (below) and none is removed. All {sum(1 for l in ob if l.startswith('#### Scenario:'))} predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-5dhm-41/worth_knowing_build_spec.py`, which reproduces the spec byte for byte); `docs/evidence/syzygy-5dhm-136/readers_edition_survival.py` prints the line and scenario counts and checks each predecessor scenario block.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.25. In the requirement, each changed line, with the displaced words and the words that replace them:

{chr(10).join(amend)}

## Added

[Observed] {len(added_paras)} paragraphs, placed immediately after the paragraph beginning "{lead_words} …":

''' + '\n'.join(f'- "{" ".join(p.split(" ")[:16])} …"' for p in added_paras) + f'''

[Observed] {len(scen)} scenarios, after the predecessor's last scenario and before the Form line: {", ".join(f'"{s}"' for s in scen)}.

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` states: only a draft in schema v13 changes any rendered byte (its callouts, and the marked blocks moving into them), and only the issued brief and inventory brief change for a new run (their version lines, schema lines, one brief paragraph and one inventory gloss line). A draft of schema v11 or earlier keeps its findings and bytes apart from the `field-version` finding for a member it cannot carry; the seven stored runs re-render byte for byte (`docs/evidence/syzygy-5dhm-41/worth-knowing-rerender-2026-11-24.json`). No provider-mode byte changes.
'''
(W / 'openspec/changes/dossier-worth-knowing/SEMANTIC-DELTA.md').write_text(out, encoding='utf-8')
print('changed', len(changed), 'kept', kept, 'paras', len(added_paras), 'scenarios', len(scen))
