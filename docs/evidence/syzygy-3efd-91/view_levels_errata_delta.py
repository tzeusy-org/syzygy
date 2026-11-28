#!/usr/bin/env python3
"""Generate SEMANTIC-DELTA.md for the view levels errata version (over code excerpts 2.54) from the bytes of the predecessor and the new text. Usage: view_levels_errata_delta.py <worktree>."""
import difflib
import hashlib
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
V = '2.55'
PRED = 'openspec/changes/dossier-code-excerpts/proposed/polaris-generation/spec.md'
NEW = 'openspec/changes/dossier-view-levels-errata/proposed/polaris-generation/spec.md'
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
    if tag == 'replace' and i2 - i1 == j2 - j1:
        changed += list(zip(range(i1, i2), range(j1, j2)))
    elif tag == 'replace':
        removed += list(range(i1, i2))
        inserted += list(range(j1, j2))
    elif tag == 'delete':
        removed += list(range(i1, i2))
    elif tag == 'insert':
        inserted += list(range(j1, j2))

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
sha = lambda b: hashlib.sha256(b).hexdigest()

out = f'''# Version {V} semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-91/view_levels_errata_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). An erratum of the view levels of version 2.50, in five statements of its scenarios and its zoom target paragraph, and one added scenario with one sentence of the walk advice of version 2.51 about a top-level directory a denied-path rule names. One statement changes what the text requires where code and text disagreed: a zoom target whose figure fails the inertness check refuses the render, as the code does, where 2.50's text passed it over. No draft schema, brief version or byte, finding, check record, `machine.json` member, page byte or migration moves. Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `{PRED}` (dossier code excerpts version 2.54, row A-345, tag `polaris-dossier-code-excerpts-v2.54`; sha256 `{sha(pb)}`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`{NEW}`, sha256 `{sha(nb_)}`) replaces that text, composed after version 2.54. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.54's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's {len(ob)} lines, {kept} appear byte for byte and in order in the new text; {len(changed)} lines are amended in place, {len(removed)} removed and {len(inserted)} inserted. Below, each edit is one item, so a line edited in several places gives several items ({len(amend)} items over {len(changed)} lines). All {sum(1 for l in ob if l.startswith('#### Scenario:'))} predecessor scenarios are carried; the blocks of three are amended as listed below. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-91/view_levels_errata_build_spec.py`, which reproduces the spec byte for byte).

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version {V}. In the requirement, each changed line, with the displaced words and the words that replace them:

{chr(10).join(amend)}

## Added

[Observed] {len(added_paras)} paragraphs and {len(scen)} scenarios are inserted: {', '.join(f'"{x}"' for x in scen)}. Its lines, as inserted:

{chr(10).join('> ' + nb[j] if nb[j] else '>' for j in inserted)}

The two new sentences of the zoom target paragraph and of the walk advice paragraph are appended to existing lines and appear above as insertions.

## Removed

[Observed] {len(removed)} lines, as removed:

{chr(10).join('> ' + ob[i] for i in removed)}

## Effect on bytes

[Inferred] As `design.md` D8 states: none. Each corrected statement is the behaviour the code already ships and its tests pin (`view-level.test.ts`); the refusal of a zoom target that fails the inertness check is already in `dossier-site.ts`; the directory map already names a directory a denied-path rule names; and the walk advice's reading of such a base element is the code of syzygy-3efd.35. So no finding, check record, `machine.json`, `dossier.json`, page, brief, record or provider-mode byte moves.
'''
(W / 'openspec/changes/dossier-view-levels-errata/SEMANTIC-DELTA.md').write_text(out, encoding='utf-8')
print('changed', len(changed), 'kept', kept, 'scenarios', len(scen))
