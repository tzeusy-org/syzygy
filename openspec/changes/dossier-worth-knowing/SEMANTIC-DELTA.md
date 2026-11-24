# Version 2.26 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-5dhm-41/worth_knowing_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-system-model/proposed/polaris-generation/spec.md` (dossier system model version 2.24, row A-64, tag `polaris-dossier-system-model-v2.24`; sha256 `f06e830deeef03f5d10f522481c8d25c141ff5ebce097c7411361d5bdc358c54`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-worth-knowing/proposed/polaris-generation/spec.md`, sha256 `127e4a8f809211fbff47b118212f94e47d204ef6aaad75a0f357906b9a975928`) replaces that text, composed after version 2.24. Version 2.25 (edit and repair accounting, row A-208) replaces REQ-polaris-generation-006 alone and does not touch this requirement, so this change takes the next free number. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.24's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1443 lines, 1442 appear byte for byte and in order in the new text; 1 is amended in place (below) and none is removed. All 207 predecessor scenarios are carried with their blocks byte for byte (the survival script compares 206 distinct titles, since two predecessor scenarios share one). The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-5dhm-41/worth_knowing_build_spec.py`, which reproduces the spec byte for byte); `docs/evidence/syzygy-5dhm-136/readers_edition_survival.py` prints the line and scenario counts and checks each predecessor scenario block.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.26. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…as `polaris-dossier-brief-v16`, from version 2.23 as": displaced "`polaris-dossier-brief-v17` and"; now "`polaris-dossier-brief-v17`,".
- After "…`polaris-dossier-brief-v17` and from version 2.24 as": displaced "`polaris-dossier-brief-v18`,"; now "`polaris-dossier-brief-v18` and from version 2.26 as `polaris-dossier-brief-v19`,".
- After "…schema v10, brief v17 issues schema": displaced "v11 and"; now "v11,".
- After "…and brief v18 issues schema v12": inserted "and brief v19 issues schema v13".
- After "…v5, v6, v7, v8, v9, v10,": displaced "v11"; now "v11, v12".
- After "…v7, v8, v9, v10, v11 or": displaced "v12"; now "v13".

## Added

[Observed] 5 paragraphs, placed immediately after the paragraph beginning "A draft in schema v11 or earlier SHALL be checked and rendered exactly as …":

- "A draft in schema `polaris-dossier-local-draft-v13` (version 2.26) is a schema-v10 draft in every respect but two …"
- "For a v13 draft, and for no draft of an earlier schema, check's report SHALL carry …"
- "On each page of a v13 draft that draws sections, the blocks carrying `worthKnowing: true` among …"
- "Brief v19 SHALL issue schema v13; it is brief v16 changed only in its version line, …"
- "A draft in schema v12 or earlier SHALL be checked and rendered exactly as version 2.24 …"

[Observed] 7 scenarios, after the predecessor's last scenario and before the Form line: "A worth-knowing block leads its page", "A marked block that does not render Inferred stays in its section", "A Pole with none found", "A misplaced, uncited or judged mark refused", "Count advice without a quota", "A pre-v13 draft keeps its bytes", "Brief v19 and inventory brief v4 ask for the facts".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` states: only a draft in schema v13 changes any rendered byte (its callouts, and the marked blocks moving into them), and only the issued brief and inventory brief change for a new run (their version lines, schema lines, one brief paragraph and one inventory gloss line). A draft of schema v12 or earlier keeps its findings and bytes apart from the `field-version` finding for a member it cannot carry; the seven stored runs re-render byte for byte (`docs/evidence/syzygy-5dhm-41/worth-knowing-rerender-2026-11-24.json`). No provider-mode byte changes.
