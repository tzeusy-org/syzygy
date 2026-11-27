#!/usr/bin/env python3
"""Generate SEMANTIC-DELTA.md for version 2.39 (lexical import facts; drafted as 2.NN over 2.33, rebuilt over 2.38) from the bytes of the predecessor and the new text.

Usage: import_facts_delta.py <worktree>. It also asserts the survival counts: no predecessor line removed, and every
predecessor scenario block carried byte for byte.
"""
import difflib
import hashlib
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
PRED = 'openspec/changes/dossier-migration-parity/proposed/polaris-generation/spec.md'
NEW = 'openspec/changes/dossier-import-facts/proposed/polaris-generation/spec.md'
pb, nb_ = (W / PRED).read_bytes(), (W / NEW).read_bytes()
old, new = pb.decode('utf-8').split('\n'), nb_.decode('utf-8').split('\n')


def body(lines):
    start = next(i for i, line in enumerate(lines) if line.startswith('### Requirement:'))
    return lines[start:]


def scenario_blocks(lines):
    blocks, cur = [], None
    for line in lines:
        if line.startswith('#### Scenario:'):
            cur = [line]
            blocks.append(cur)
        elif line.startswith(('#### ', '### ', 'Form:', '```')):
            cur = None
        elif cur is not None:
            cur.append(line)
    return ['\n'.join(b).rstrip('\n') for b in blocks]


ob, nb = body(old), body(new)
sm = difflib.SequenceMatcher(a=ob, b=nb, autojunk=False)
kept = sum(b.size for b in sm.get_matching_blocks())
changed, removed, inserted_runs = [], [], []
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'replace':
        # Paragraphs inserted next to an amended line read as one replace block: pair each old line with its most similar new
        # line of the block (in order), and the block's other new lines are inserted.
        assert j2 - j1 >= i2 - i1, (i1, i2, j1, j2)
        taken, lo = [], j1
        for i in range(i1, i2):
            best = max(range(lo, j2), key=lambda j: difflib.SequenceMatcher(a=ob[i], b=nb[j], autojunk=False).ratio())
            changed.append((i, best))
            taken.append(best)
            lo = best + 1
        run = None
        for j in range(j1, j2):
            if j in taken:
                run = None
                continue
            if run is None:
                run = [j, j + 1]
                inserted_runs.append(run)
            else:
                run[1] = j + 1
    elif tag == 'delete':
        removed += list(range(i1, i2))
    elif tag == 'insert':
        inserted_runs.append((j1, j2))
assert not removed, removed
old_scen, new_scen = scenario_blocks(ob), scenario_blocks(nb)
assert all(b in new_scen for b in old_scen), 'a predecessor scenario block changed'

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

para_groups = []
scen = []
for j1, j2 in inserted_runs:
    paras = [nb[j] for j in range(j1, j2) if nb[j].strip() and not nb[j].startswith('#### Scenario:') and not nb[j].startswith('- **')]
    scen += [nb[j][len('#### Scenario: '):] for j in range(j1, j2) if nb[j].startswith('#### Scenario:')]
    if paras:
        prev = next(nb[k] for k in range(j1 - 1, -1, -1) if nb[k].strip())
        para_groups.append((' '.join(prev.split(' ')[:14]), paras))
sha = lambda b: hashlib.sha256(b).hexdigest()

added = []
for lead, paras in para_groups:
    added.append(f'[Observed] {len(paras)} paragraph{"s" if len(paras) != 1 else ""}, placed immediately after the paragraph beginning "{lead} …":\n')
    added += [f'- "{" ".join(p.split(" ")[:16])} …"' for p in paras]
    added.append('')

out = f'''# Version 2.39 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-60/import_facts_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `{PRED}` (dossier migration parity version 2.38, row A-269, tag `polaris-dossier-migration-parity-v2.38`; sha256 `{sha(pb)}`), the REQ-034 this version is adopted over. [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`{NEW}`, sha256 `{sha(nb_)}`) replaces that text. It was drafted and reviewed over figure plan 2.33 under the placeholder 2.NN (`design.md` D8) and is rebuilt over 2.38 as version 2.39 by re-running the build script with its anchors, which changes the predecessor, its name and number and the label alone. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.33's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's {len(ob)} lines, {kept} appear byte for byte and in order in the new text; {len(changed)} are amended in place (below) and none is removed. All {len(old_scen)} predecessor scenarios are carried with their blocks byte for byte ({len(new_scen)} in the new text). The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-60/import_facts_build_spec.py`, which reproduces the spec byte for byte).

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.39 and this change. In the requirement, each changed line, with the displaced words and the words that replace them:

{chr(10).join(amend)}

## Added

''' + '\n'.join(added) + f'''
[Observed] {len(scen)} scenarios, after the predecessor's scenario "Witnessed edge to a withheld node leaves the migration parity" and before the Form line: {", ".join(f'"{s}"' for s in scen)}.

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As the added paragraph beginning "These are the bytes version 2.39 changes" states and `design.md` D7 explains: every full draft check record written in the operator-agent mode gains `importFacts` before `manifestFacts`, and with it check's report and the record's digest. The structure record, `manifestFacts`, inventory check records, the brief, the draft schemas, every rendered page, `machine.json`, `dossier.json`, the size report, the review packets, the relation witness states and every provider-mode byte are unchanged.
'''
(W / 'openspec/changes/dossier-import-facts/SEMANTIC-DELTA.md').write_text(out, encoding='utf-8')
print('changed', len(changed), 'kept', kept, 'of', len(ob), 'paragraph groups', [len(p) for _, p in para_groups],
      'scenarios added', len(scen), 'carried', len(old_scen), 'new total', len(new_scen))
