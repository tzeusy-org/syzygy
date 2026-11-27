#!/usr/bin/env python3
"""Generate SEMANTIC-DELTA.md for version 2.43 (migration bounds, over test-name recognizers 2.42) from the bytes of the predecessor and the new text. Usage: migration_bounds_delta.py <worktree>."""
import difflib
import hashlib
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
PRED = 'openspec/changes/dossier-test-names/proposed/polaris-generation/spec.md'
NEW = 'openspec/changes/dossier-migration-bounds/proposed/polaris-generation/spec.md'
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
assert not added_paras, added_paras
scen = [nb[j][len('#### Scenario: '):] for j in inserted if nb[j].startswith('#### Scenario:')]
sha = lambda b: hashlib.sha256(b).hexdigest()

out = f'''# Version 2.43 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-87/migration_bounds_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). It narrows a claim; it changes no rule, bound, schema, brief, finding or byte. Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `{PRED}` (dossier test-name recognizers version 2.42, row A-337, tag `polaris-dossier-test-names-v2.42`; sha256 `{sha(pb)}`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`{NEW}`, sha256 `{sha(nb_)}`) replaces that text, composed after version 2.42. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.42's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's {len(ob)} lines, {kept} appear byte for byte and in order in the new text; {len(changed)} lines are amended in place and none is removed. Below, each edit is one item, so a line edited in several places gives several items ({len(amend)} items over {len(changed)} lines). All {sum(1 for l in ob if l.startswith('#### Scenario:'))} predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-87/migration_bounds_build_spec.py`, which reproduces the spec byte for byte).

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.43. In the requirement, each changed line, with the displaced words and the words that replace them:

{chr(10).join(amend)}

## Added

[Observed] No paragraph. {len(scen)} scenario, after the predecessor's last scenario that precedes the Form line, and before that line: {", ".join(f'"{s}"' for s in scen)}.

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] None. The migration, the v12 model bounds and every finding are unchanged; the version only stops promising parity for a draft whose migrated model exceeds those bounds, which check already refuses (`design.md` D4).
'''
(W / 'openspec/changes/dossier-migration-bounds/SEMANTIC-DELTA.md').write_text(out, encoding='utf-8')
print('changed', len(changed), 'kept', kept, 'scenarios', len(scen))
