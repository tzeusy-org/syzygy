# Version 2.14 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-033 is the MODIFIED text in `openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md` (URL declared-source run version 2.1, row A-14; that file's SHA-256 is `e30836f902361c74943cc0cf69ae907a3e9d678a542b27676677e47c8a5fa865`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject). No later version replaces REQ-033.

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-033 replaces that text. Its ID, Source line, Scope line and requirement name are unchanged. The requirement goes from 6 to 10 scenarios; no other requirement changes. Its warrants block is the predecessor's byte for byte, so its dependency union is the predecessor's. The added paragraph names REQ-polaris-generation-034 in its text as the derivation the command reuses; REQ-034 is a sibling under the same operator-agent mode, not a parent, and is not added to `parent_requirements`. REQ-033's own warrants (SEC-5 primary; SEC-2, SEC-3, VIS-2; RFC5-17 among its contracts) carry the screening and evidence rules the paragraph applies. Nothing is installed under `.syzygy/governance/`.

## Carried unchanged

[Observed] Every line of the predecessor requirement, from `### Requirement: Operator-agent authoring mode` to the end of its warrants block, is carried byte for byte: the proposed block is the predecessor block with insertions only, and a line diff of the two shows only added lines.

## Added

1. One paragraph, after the paragraph beginning "Operator-started local dossier commands SHALL serve no route": the `syzygy dossier verify` command (the text is in `proposed/polaris-generation/spec.md`).
2. Four scenarios, before `Form: event-response.`: "Verify gives each claim one of six outcomes", "Verify never reads or names a withheld path", "Verify's quotation check is check's", "Verify writes nothing into a run".
3. One line after the Form block's `**Falsifier:**` line: "**Case, oracle and falsifier (verify):**", naming the command's fixture, its literal oracle and what falsifies it (CC-SPEC-4).

## Displaced

None. No sentence of the predecessor is removed or reworded.
