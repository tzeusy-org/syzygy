# Version 2.23 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-5dhm-41/worth_knowing_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-readers-edition/proposed/polaris-generation/spec.md` (dossier reader's edition version 2.22, row A-56, tag `polaris-dossier-readers-edition-v2.22`; sha256 `cfc6ce3caf18fcae7a1007e3763378e63c96108dc0d45fb8414007f1ff6c83c1`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-worth-knowing/proposed/polaris-generation/spec.md`, sha256 `9db5bba9dcd15b433ca6d1476ac0e7cc5987e711b04a7b457af887fd6415cb4b`) replaces that text, composed after version 2.22. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.22's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1284 lines, 1283 appear byte for byte and in order in the new text; 1 is amended in place (below) and none is removed. All 183 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-5dhm-41/worth_knowing_build_spec.py`, which reproduces the spec byte for byte); `docs/evidence/syzygy-5dhm-136/readers_edition_survival.py` prints the line and scenario counts and checks each predecessor scenario block.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.23. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…as `polaris-dossier-brief-v14`, from version 2.19 as": displaced "`polaris-dossier-brief-v15` and"; now "`polaris-dossier-brief-v15`,".
- After "…`polaris-dossier-brief-v15` and from version 2.20 as": displaced "`polaris-dossier-brief-v16`,"; now "`polaris-dossier-brief-v16` and from version 2.23 as `polaris-dossier-brief-v17`,".
- After "…schema v8, brief v15 issues schema": displaced "v9 and"; now "v9,".
- After "…and brief v16 issues schema v10": inserted "and brief v17 issues schema v11".
- After "…v3, v4, v5, v6, v7, v8,": displaced "v9"; now "v9, v10".
- After "…v5, v6, v7, v8, v9 or": displaced "v10"; now "v11".

## Added

[Observed] 5 paragraphs, placed immediately after the paragraph beginning "A draft in schema v9 or earlier SHALL be checked and rendered exactly as …":

- "A draft in schema `polaris-dossier-local-draft-v11` (version 2.23) is a schema-v10 draft in every respect but two …"
- "For a v11 draft, and for no draft of an earlier schema, check's report SHALL carry …"
- "On each page of a v11 draft that draws sections, the blocks carrying `worthKnowing: true` among …"
- "Brief v17 SHALL issue schema v11; it is brief v16 changed only in its version line, …"
- "A draft in schema v10 or earlier SHALL be checked and rendered exactly as version 2.22 …"

[Observed] 6 scenarios, after the predecessor's last scenario and before the Form line: "A worth-knowing block leads its page", "A Pole with none found", "A misplaced, uncited or judged mark refused", "Count advice without a quota", "A pre-v11 draft keeps its bytes", "Brief v17 and inventory brief v4 ask for the facts".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` states: only a draft in schema v11 changes any rendered byte (its callouts, and the marked blocks moving into them), and only the issued brief and inventory brief change for a new run (their version lines, schema lines, one brief paragraph and one inventory gloss line). A draft of schema v10 or earlier keeps its findings and bytes apart from the `field-version` finding for a member it cannot carry; the seven stored runs re-render byte for byte (`docs/evidence/syzygy-5dhm-41/worth-knowing-rerender-2026-11-24.json`). No provider-mode byte changes.
