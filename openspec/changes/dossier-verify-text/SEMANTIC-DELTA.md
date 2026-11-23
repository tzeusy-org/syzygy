# Version 2.21 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-033 is the MODIFIED text in `openspec/changes/dossier-run-tree-read-bounds/proposed/polaris-generation/spec.md` (run-tree read bounds version 2.18, row A-53; that file's SHA-256 is `84fc7c71221705b6a2b614e3acf4496d10bb2e3ba4815c1e776ad450b3bc19a5`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject). Version 2.18 composed over raw-read disclosure version 2.17 (A-51), which composed over URL declared-source run version 2.1 (A-14). Versions 2.19 and 2.20 change only REQ-polaris-generation-034. No later version replaces REQ-033.

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-033 replaces that text. Its ID, Source line, Scope line and requirement name are unchanged. The requirement goes from 12 to 16 scenarios; no other requirement changes. Its warrants block is the predecessor's byte for byte, so its dependency union is the predecessor's (version 2.18 added REQ-polaris-generation-048 to `parent_requirements`, and `GOVERNING-DEPENDENCIES.json` carries it). The added paragraph names REQ-polaris-generation-034 in its text as the derivation the command reuses; REQ-034 is a sibling under the same operator-agent mode, not a parent, and is not added to `parent_requirements`. REQ-033's own warrants (SEC-5 primary; SEC-2, SEC-3, VIS-2; RFC5-17 among its contracts) carry the screening and evidence rules the paragraph applies. Nothing is installed under `.syzygy/governance/`.

## Carried unchanged

[Observed] Every line of the predecessor requirement, from `### Requirement: Operator-agent authoring mode` to the end of its warrants block, is carried byte for byte: the proposed block is the predecessor block with insertions only. A script over the two blocks finds all 96 non-empty predecessor lines in the proposed block in their order, all 12 predecessor scenarios, and 14 added non-empty lines and nothing else (96 + 14 = 110 non-empty lines, 16 scenarios).

## Added

1. One paragraph, after the paragraph beginning "Operator-started local dossier commands SHALL serve no route": the `syzygy dossier verify` command (the text is in `proposed/polaris-generation/spec.md`).
2. Four scenarios, after the predecessor's last scenario ("Breach log that cannot be read is not recorded as none") and before `Form: event-response.`: "Verify gives each claim one of six outcomes", "Verify never reads or names a withheld path", "Verify's quotation check is check's", "Verify writes nothing into a run".
3. One line after the Form block's `**Falsifier:**` line: "**Case, oracle and falsifier (verify):**", naming the command's fixture, its literal oracle and what falsifies it (CC-SPEC-4).

## Displaced

None. No sentence of the predecessor is removed or reworded.
