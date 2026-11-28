#!/usr/bin/env python3
"""Generate SEMANTIC-DELTA.md for the walk errata version (over walk advice 2.51) from the bytes of the predecessor and the new text. Usage: walk_errata_delta.py <worktree>."""
import difflib
import hashlib
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
V = '2.53'
PRED = 'openspec/changes/dossier-walk-advice/proposed/polaris-generation/spec.md'
NEW = 'openspec/changes/dossier-walk-errata/proposed/polaris-generation/spec.md'
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
assert not removed and not inserted

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

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-90/walk_errata_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). An erratum of the figure walks of version 2.40 in two statements: the brief v24 paragraph is quoted as the brief issues it, with bare quotation marks, and the walk layer's taking the pointer over the drawing's own tooltips is stated as a trade-off. No draft schema, brief version or byte, finding, check record, `machine.json` member, page byte, scenario or migration moves. Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `{PRED}` (dossier walk advice version 2.51, row A-275, tag `polaris-dossier-walk-advice-v2.51`; sha256 `{sha(pb)}`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`{NEW}`, sha256 `{sha(nb_)}`) replaces that text, composed after version 2.51. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.51's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's {len(ob)} lines, {kept} appear byte for byte and in order in the new text; {len(changed)} lines are amended in place and none is removed. Below, each edit is one item, so a line edited in several places gives several items ({len(amend)} items over {len(changed)} lines). All {sum(1 for l in ob if l.startswith('#### Scenario:'))} predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-90/walk_errata_build_spec.py`, which reproduces the spec byte for byte).

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version {V}. In the requirement, each changed line, with the displaced words and the words that replace them:

{chr(10).join(amend)}

## Added

[Observed] No paragraph, line or scenario: {len(added_paras)} paragraphs and {len(scen)} scenarios are inserted. The two new sentences are appended to existing lines and appear above as insertions.

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D4 states: none. The brief already issues the corrected paragraph (`WALK_PARAGRAPH`, asserted equal by the build script) and the walk layer already takes the pointer over every box (`.walk-node{{…pointer-events:auto…}}`), so no finding, check record, `machine.json`, `dossier.json`, page, brief, record or provider-mode byte moves.
'''
(W / 'openspec/changes/dossier-walk-errata/SEMANTIC-DELTA.md').write_text(out, encoding='utf-8')
print('changed', len(changed), 'kept', kept, 'scenarios', len(scen))
