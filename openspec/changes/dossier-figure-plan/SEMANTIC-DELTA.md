# Version 2.NN semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-40/figure_plan_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-system-model/proposed/polaris-generation/spec.md` (dossier system model version 2.24, row A-64, tag `polaris-dossier-system-model-v2.24`; sha256 `f06e830deeef03f5d10f522481c8d25c141ff5ebce097c7411361d5bdc358c54`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md`, sha256 `8263755ca3bb9e079599f6f7f8c672f5aedeecd806c33fdfc3dd9fee505e15db`) replaces that text, composed after version 2.24, the effective REQ-034 on `main` at this writing. The system model of syzygy-3efd.37, drafted in parallel over 2.23, was adopted first as 2.24, so this version recomposes over it and takes schema v13 and brief v19 (`design.md` D1). The version label 2.NN is a placeholder, chosen at adoption. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.24's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1443 lines, 1438 appear byte for byte and in order in the new text; 5 are amended in place (below) and none is removed. All 207 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-40/figure_plan_build_spec.py`, which reproduces the spec byte for byte); `figure_plan_survival.py` beside it prints the line and scenario counts and checks each predecessor scenario block.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.NN. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…as `polaris-dossier-brief-v16`, from version 2.23 as": displaced "`polaris-dossier-brief-v17` and"; now "`polaris-dossier-brief-v17`,".
- After "…`polaris-dossier-brief-v17` and from version 2.24 as": displaced "`polaris-dossier-brief-v18`,"; now "`polaris-dossier-brief-v18` and from version 2.NN as `polaris-dossier-brief-v19`,".
- After "…schema v10, brief v17 issues schema": displaced "v11 and"; now "v11,".
- After "…and brief v18 issues schema v12": inserted "and brief v19 issues schema v13".
- After "…v5, v6, v7, v8, v9, v10,": displaced "v11"; now "v11, v12".
- After "…v7, v8, v9, v10, v11 or": displaced "v12"; now "v13".
- After "…earlier with and without `model` and": displaced "`view`."; now "`view`; and, for version 2.NN, schema-v13 drafts with complete, incomplete, repeated and malformed figure plans, planned figures named, unresolved, misplaced and of the wrong kind, and omitted places; figures on each side of each advice rule's boundary (a third and a fourth node, a third edge among three nodes, a third and a fourth step, a second and a third message, a third and a fourth group; equal, contained, extended and reversed keys and another family; a unit enclosing another with and without a `contains` arrow, a chain of them or a nesting, a directory that is only a prefix of a path, and an element beside its model parent or grandparent in a graph view and a containment view); views sharing elements; entries with an unresolved or non-string `target`; the same drafts with their draft layer withheld; and drafts of schema v12 and earlier with and without `figurePlan`.".
- After "…and its rendered figures beside the": displaced "original's."; now "original's; for version 2.NN, the plan findings with their paths, details and order, the report's `figureAdvice` member, the check record, `run-advice.json` and reading ledger beside it, the brief v19 figure-plan paragraph, and the rendered bytes of a v13 draft beside the same draft as v12.".
- After "…for byte with those its original": displaced "renders."; now "renders; for version 2.NN, each fixture's expected plan findings and advisories written as literals before check runs, each label key computed by hand from each view's expansion, and a v13 draft's pages compared byte for byte with the same draft rendered as v12.".
- After "…`field-version` findings in place of `schema`": displaced "findings."; now "findings; for version 2.NN, a v13 draft without a plan, with a place unplanned or planned twice, or with a planned figure that is missing, homed elsewhere or of another kind proceeds to review; a plan entry's text reaches a page or a published file; an advisory is a finding, changes an outcome or a record, or is counted by the reading ledger or `run-advice.json`; an advisory fires on a fixture outside its rule or is missing from one inside it; or a draft of schema v12 or earlier changes any finding but the `field-version` one at `$.figurePlan`, or any byte.".

## Added

[Observed] 5 paragraphs, placed immediately after the paragraph beginning "A draft in schema v11 or earlier SHALL be checked and rendered exactly as …":

- "A draft in schema `polaris-dossier-local-draft-v13` (version 2.NN) is a schema-v12 draft in every respect but one: …"
- "For a v13 draft Syzygy SHALL report these repair findings, each of kind `figure-plan` unless another …"
- "For a v13 draft whose check reports no finding of kind `schema`, `syzygy dossier check` SHALL …"
- "Brief v19 SHALL issue schema v13; it is brief v18 changed only in its version line, …"
- "A draft in schema v12 or earlier SHALL be checked and rendered exactly as version 2.24 …"

[Observed] 11 scenarios, after the predecessor's last scenario and before the Form line: "A figure plan names each place's question and figure", "Draft without a figure plan refused", "Every place is planned once", "Malformed plan entry refused", "A planned figure is the one drawn at its place", "Earlier schema keeps its bytes with a figure plan added", "A chain of three or fewer is advised as a sentence", "A figure that draws nothing new is advised as a duplicate", "A figure that mixes levels is advised", "Figure advice gates nothing", "Brief v19 asks for the figure plan".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D7 states: no rendered byte moves. A schema-v13 draft renders as the same draft would as v12 without `figurePlan`; what is new is check's findings on the plan and the report-only `figureAdvice` member. A draft of schema v12 or earlier keeps every finding and byte but for a `field-version` finding at `$.figurePlan`, and no provider-mode byte changes.
