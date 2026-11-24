# Version 2.25 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-5dhm-41/worth_knowing_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-containment-figure/proposed/polaris-generation/spec.md` (dossier containment figure version 2.23, row A-59, tag `polaris-dossier-containment-figure-v2.23`; sha256 `0f6ef5fb8ba2ef4577e2512f54c7e0e7683de7d5466def39fcb1b7b555d92f5d`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-worth-knowing/proposed/polaris-generation/spec.md`, sha256 `e6b4d22cab359c9fff2c5fcde811d00aba71c000821dededfedd1fbe622a9942`) replaces that text, composed after version 2.23. Version 2.24 (the system model, open pull request #932) is not adopted and is not composed here; its numbers, schema `polaris-dossier-local-draft-v12` and brief `polaris-dossier-brief-v18`, are left to it. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.23's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1352 lines, 1351 appear byte for byte and in order in the new text; 1 is amended in place (below) and none is removed. All 193 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-5dhm-41/worth_knowing_build_spec.py`, which reproduces the spec byte for byte); `docs/evidence/syzygy-5dhm-136/readers_edition_survival.py` prints the line and scenario counts and checks each predecessor scenario block.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.25. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…as `polaris-dossier-brief-v15`, from version 2.20 as": displaced "`polaris-dossier-brief-v16` and"; now "`polaris-dossier-brief-v16`,".
- After "…`polaris-dossier-brief-v16` and from version 2.23 as": displaced "`polaris-dossier-brief-v17`,"; now "`polaris-dossier-brief-v17` and from version 2.25 as `polaris-dossier-brief-v19`,".
- After "…schema v9, brief v16 issues schema": displaced "v10 and"; now "v10,".
- After "…and brief v17 issues schema v11": inserted "and brief v19 issues schema v13".
- After "…v4, v5, v6, v7, v8, v9,": displaced "v10"; now "v10, v11".
- After "…v6, v7, v8, v9, v10 or": displaced "v11"; now "v13".

## Added

[Observed] 5 paragraphs, placed immediately after the paragraph beginning "A draft in schema v10 or earlier SHALL be checked and rendered exactly as …":

- "A draft in schema `polaris-dossier-local-draft-v13` (version 2.25) is a schema-v11 draft in every respect but two …"
- "For a v13 draft, and for no draft of an earlier schema, check's report SHALL carry …"
- "On each page of a v13 draft that draws sections, the blocks carrying `worthKnowing: true` among …"
- "Brief v19 SHALL issue schema v13; it is brief v17 changed only in its version line, …"
- "A draft in schema v11 or earlier SHALL be checked and rendered exactly as version 2.23 …"

[Observed] 6 scenarios, after the predecessor's last scenario and before the Form line: "A worth-knowing block leads its page", "A Pole with none found", "A misplaced, uncited or judged mark refused", "Count advice without a quota", "A pre-v13 draft keeps its bytes", "Brief v19 and inventory brief v4 ask for the facts".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` states: only a draft in schema v13 changes any rendered byte (its callouts, and the marked blocks moving into them), and only the issued brief and inventory brief change for a new run (their version lines, schema lines, one brief paragraph and one inventory gloss line). A draft of schema v11 or earlier keeps its findings and bytes apart from the `field-version` finding for a member it cannot carry; the seven stored runs re-render byte for byte (`docs/evidence/syzygy-5dhm-41/worth-knowing-rerender-2026-11-24.json`). No provider-mode byte changes.
