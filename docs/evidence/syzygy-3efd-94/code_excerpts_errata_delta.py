#!/usr/bin/env python3
"""Generate SEMANTIC-DELTA.md for the code excerpts errata version (over view levels errata 2.55) from the bytes of the predecessor and the new text. Usage: code_excerpts_errata_delta.py <worktree>."""
import difflib
import hashlib
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
V = '2.56'
PRED = 'openspec/changes/dossier-view-levels-errata/proposed/polaris-generation/spec.md'
NEW = 'openspec/changes/dossier-code-excerpts-errata/proposed/polaris-generation/spec.md'
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

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-94/code_excerpts_errata_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). An erratum of the code excerpts of version 2.54, in four of its paragraphs and two of its scenarios, and one paragraph and one scenario added: the range condition of its checks read on its own, the order of an excerpt's `schema` findings at its lists and which positions hold an excerpt, a `range-beyond-blob` finding that skips nothing, the 10,000,000 line bound, and the browser scenario's band and number geometry; and the finding-detail rule syzygy-3efd.93 ships (row A-347, PR #1061). Three statements change what the text requires where code and text disagreed or the text was silent: an excerpt citing an absent path is skipped by its range alone, a band is measured against its line's line box, and a finding detail names a draft identity only where it is a handle and is screened before it is reported. One scenario is added and none removed. No draft schema, brief version or byte, finding, check record, `machine.json` member, page byte or migration moves. Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `{PRED}` (dossier view levels errata version 2.55, row A-346, tag `polaris-dossier-view-levels-errata-v2.55`; sha256 `{sha(pb)}`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`{NEW}`, sha256 `{sha(nb_)}`) replaces that text, composed after version 2.55. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.55's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's {len(ob)} lines, {kept} appear byte for byte and in order in the new text; {len(changed)} lines are amended in place, {len(removed)} removed and {len(inserted)} inserted. Below, each edit is one item, so a line edited in several places gives several items ({len(amend)} items over {len(changed)} lines). All {sum(1 for l in ob if l.startswith('#### Scenario:'))} predecessor scenarios are carried; the blocks of two are amended as listed below. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-94/code_excerpts_errata_build_spec.py`, which reproduces the spec byte for byte).

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version {V}. In the requirement, each changed line, with the displaced words and the words that replace them:

{chr(10).join(amend)}

## Added

[Observed] {len(added_paras)} paragraph{'' if len(added_paras) == 1 else 's'} and {len(scen)} scenario{'' if len(scen) == 1 else 's'} {'is' if len(added_paras) + len(scen) == 1 else 'are'} inserted: {', '.join(f'"{x}"' for x in scen)}. Its lines, as inserted:

{chr(10).join('> ' + nb[j] if nb[j] else '>' for j in inserted)}

Every other new sentence is appended to or set inside an existing line and appears above as an amendment.

## Removed

[Observed] {len(removed)} lines are removed.

## Effect on bytes

[Inferred] As `design.md` D8 states: none. Each corrected statement is the behaviour `code-marks.ts` and the code excerpt renderer already ship (syzygy-3efd.33, PR #1060) and their tests pin (`code-marks.test.ts`, `code-excerpt.browser.test.ts`). The finding-detail rule is the code of syzygy-3efd.93 (`finding-names.ts`, PR #1061, row A-347), which lands with or after this version, and its tests (`finding-names.test.ts`) pin the added scenario's literals. Against the code on main, that rule moves finding details, which A-347 records; beyond it, no finding, check record, `machine.json`, `dossier.json`, page, brief, record or provider-mode byte moves.
'''
(W / 'openspec/changes/dossier-code-excerpts-errata/SEMANTIC-DELTA.md').write_text(out, encoding='utf-8')
assert not removed, removed
print('changed', len(changed), 'kept', kept, 'scenarios', len(scen))
