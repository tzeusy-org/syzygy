# Version 2.NN semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-40/figure_plan_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-readers-edition/proposed/polaris-generation/spec.md` (dossier reader's edition version 2.22, row A-56, tag `polaris-dossier-readers-edition-v2.22`; sha256 `cfc6ce3caf18fcae7a1007e3763378e63c96108dc0d45fb8414007f1ff6c83c1`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md`, sha256 `61f679833862e6c948073fd46487172a4aa2615d5e8dc85204d33abb2da4541b`) replaces that text, composed after version 2.22, the effective REQ-034 on `main` at this writing. A concurrent candidate of the same requirement, `dossier-containment-figure` (syzygy-3efd.31, labelled 2.23 on its branch, schema v11 and brief v17), is not adopted at this writing and claims the same schema and brief numbers; whichever of the two lands second recomposes over the other and renumbers (`design.md` D1). The version label 2.NN is a placeholder, chosen at adoption. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.22's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1284 lines, 1279 appear byte for byte and in order in the new text; 5 are amended in place (below) and none is removed. All 183 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-40/figure_plan_build_spec.py`, which reproduces the spec byte for byte); `figure_plan_survival.py` beside it prints the line and scenario counts and checks each predecessor scenario block.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.NN. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…as `polaris-dossier-brief-v14`, from version 2.19 as": displaced "`polaris-dossier-brief-v15` and"; now "`polaris-dossier-brief-v15`,".
- After "…`polaris-dossier-brief-v15` and from version 2.20 as": displaced "`polaris-dossier-brief-v16`,"; now "`polaris-dossier-brief-v16` and from version 2.NN as `polaris-dossier-brief-v17`,".
- After "…schema v8, brief v15 issues schema": displaced "v9 and"; now "v9,".
- After "…and brief v16 issues schema v10": inserted "and brief v17 issues schema v11".
- After "…v3, v4, v5, v6, v7, v8,": displaced "v9"; now "v9, v10".
- After "…v5, v6, v7, v8, v9 or": displaced "v10"; now "v11".
- After "…draft drawn again, and a provider-mode": displaced "render."; now "render; and, for version 2.NN, schema-v11 drafts with complete, incomplete, repeated and malformed figure plans, planned figures named, unresolved, misplaced and of the wrong kind, and omitted places; figures on each side of each advice rule's boundary (a third and a fourth node, a third edge among three nodes, a third and a fourth step, a second and a third message; equal, contained, extended and reversed keys and another family; a unit enclosing another with and without a `contains` arrow, and a directory that is only a prefix of a path); and drafts of schema v10 and earlier with and without `figurePlan`.".
- After "…on the page `machine.json` names for": displaced "it."; now "it; for version 2.NN, the plan findings with their paths, details and order, the report's `figureAdvice` member, the check record, `run-advice.json` and reading ledger beside it, the brief v17 figure-plan paragraph, and the rendered bytes of a v11 draft beside the same draft as v10.".
- After "…the element's own text, not its": displaced "attributes."; now "attributes; for version 2.NN, each fixture's expected plan findings and advisories written as literals before check runs, each label key computed by hand, and a v11 draft's pages compared byte for byte with the same draft rendered as v10.".
- After "…or page, or a provider-mode byte": displaced "changes."; now "changes; for version 2.NN, a v11 draft without a plan, with a place unplanned or planned twice, or with a planned figure that is missing, homed elsewhere or of another kind proceeds to review; a plan entry's text reaches a page or a published file; an advisory is a finding, changes an outcome or a record, or is counted by the reading ledger or `run-advice.json`; an advisory fires on a fixture outside its rule or is missing from one inside it; or a draft of schema v10 or earlier changes any finding but the `field-version` one at `$.figurePlan`, or any byte.".

## Added

[Observed] 5 paragraphs, placed immediately after the paragraph beginning "From version 2.22 (the reader's edition) every operator-agent rendering, whatever its draft's schema, puts …":

- "A draft in schema `polaris-dossier-local-draft-v11` (version 2.NN) is a schema-v10 draft in every respect but one: …"
- "For a v11 draft Syzygy SHALL report these repair findings, each of kind `figure-plan` unless another …"
- "For a v11 draft whose check reports no finding of kind `schema`, `syzygy dossier check` SHALL …"
- "Brief v17 SHALL issue schema v11; it is brief v16 changed only in its version line, …"
- "A draft in schema v10 or earlier SHALL be checked and rendered exactly as version 2.22 …"

[Observed] 11 scenarios, after the predecessor's last scenario and before the Form line: "A figure plan names each place's question and figure", "Draft without a figure plan refused", "Every place is planned once", "Malformed plan entry refused", "A planned figure is the one drawn at its place", "Earlier schema keeps its bytes with a figure plan added", "A chain of three or fewer is advised as a sentence", "A figure that draws nothing new is advised as a duplicate", "A figure that mixes levels is advised", "Figure advice gates nothing", "Brief v17 asks for the figure plan".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D7 states: no rendered byte moves. A schema-v11 draft renders as the same draft would as v10 without `figurePlan`; what is new is check's findings on the plan and the report-only `figureAdvice` member. A draft of schema v10 or earlier keeps every finding and byte but for a `field-version` finding at `$.figurePlan`, and no provider-mode byte changes.
