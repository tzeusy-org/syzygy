# Version 2.NN semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-40/figure_plan_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-containment-figure/proposed/polaris-generation/spec.md` (dossier containment figure version 2.23, row A-59, tag `polaris-dossier-containment-figure-v2.23`; sha256 `0f6ef5fb8ba2ef4577e2512f54c7e0e7683de7d5466def39fcb1b7b555d92f5d`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md`, sha256 `0b098e9e50673c9436267b6e590e53b4caab84c2e440dc75e3c43a20ef86b36c`) replaces that text, composed after version 2.23, the effective REQ-034 on `main` at this writing. A concurrent candidate of the same requirement, the system model of syzygy-3efd.37, is unadopted and unpushed at this writing and also claims schema v12 and brief v18 over 2.23; whichever of the two is adopted second recomposes over the other and renumbers (`design.md` D1). The version label 2.NN is a placeholder, chosen at adoption. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.23's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1352 lines, 1347 appear byte for byte and in order in the new text; 5 are amended in place (below) and none is removed. All 193 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-40/figure_plan_build_spec.py`, which reproduces the spec byte for byte); `figure_plan_survival.py` beside it prints the line and scenario counts and checks each predecessor scenario block.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.NN. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…as `polaris-dossier-brief-v15`, from version 2.20 as": displaced "`polaris-dossier-brief-v16` and"; now "`polaris-dossier-brief-v16`,".
- After "…`polaris-dossier-brief-v16` and from version 2.23 as": displaced "`polaris-dossier-brief-v17`,"; now "`polaris-dossier-brief-v17` and from version 2.NN as `polaris-dossier-brief-v18`,".
- After "…schema v9, brief v16 issues schema": displaced "v10 and"; now "v10,".
- After "…and brief v17 issues schema v11": inserted "and brief v18 issues schema v12".
- After "…v4, v5, v6, v7, v8, v9,": displaced "v10"; now "v10, v11".
- After "…v6, v7, v8, v9, v10 or": displaced "v11"; now "v12".
- After "…and earlier with and without a": displaced "containment."; now "containment; and, for version 2.NN, schema-v12 drafts with complete, incomplete, repeated and malformed figure plans, planned figures named, unresolved, misplaced and of the wrong kind, and omitted places; figures on each side of each advice rule's boundary (a third and a fourth node, a third edge among three nodes, a third and a fourth step, a second and a third message, a third and a fourth group; equal, contained, extended and reversed keys and another family; a unit enclosing another with and without a `contains` arrow or a nesting, and a directory that is only a prefix of a path); and drafts of schema v11 and earlier with and without `figurePlan`.".
- After "…and `figureStructures` entry, and figure fit's": displaced "entries."; now "entries; for version 2.NN, the plan findings with their paths, details and order, the report's `figureAdvice` member, the check record, `run-advice.json` and reading ledger beside it, the brief v18 figure-plan paragraph, and the rendered bytes of a v12 draft beside the same draft as v11.".
- After "…the bytes version 2.22 renders for": displaced "it."; now "it; for version 2.NN, each fixture's expected plan findings and advisories written as literals before check runs, each label key computed by hand, and a v12 draft's pages compared byte for byte with the same draft rendered as v11.".
- After "…`field-version` findings in place of `schema`": displaced "findings."; now "findings; for version 2.NN, a v12 draft without a plan, with a place unplanned or planned twice, or with a planned figure that is missing, homed elsewhere or of another kind proceeds to review; a plan entry's text reaches a page or a published file; an advisory is a finding, changes an outcome or a record, or is counted by the reading ledger or `run-advice.json`; an advisory fires on a fixture outside its rule or is missing from one inside it; or a draft of schema v11 or earlier changes any finding but the `field-version` one at `$.figurePlan`, or any byte.".

## Added

[Observed] 5 paragraphs, placed immediately after the paragraph beginning "A draft in schema v10 or earlier SHALL be checked and rendered exactly as …":

- "A draft in schema `polaris-dossier-local-draft-v12` (version 2.NN) is a schema-v11 draft in every respect but one: …"
- "For a v12 draft Syzygy SHALL report these repair findings, each of kind `figure-plan` unless another …"
- "For a v12 draft whose check reports no finding of kind `schema`, `syzygy dossier check` SHALL …"
- "Brief v18 SHALL issue schema v12; it is brief v17 changed only in its version line, …"
- "A draft in schema v11 or earlier SHALL be checked and rendered exactly as version 2.23 …"

[Observed] 11 scenarios, after the predecessor's last scenario and before the Form line: "A figure plan names each place's question and figure", "Draft without a figure plan refused", "Every place is planned once", "Malformed plan entry refused", "A planned figure is the one drawn at its place", "Earlier schema keeps its bytes with a figure plan added", "A chain of three or fewer is advised as a sentence", "A figure that draws nothing new is advised as a duplicate", "A figure that mixes levels is advised", "Figure advice gates nothing", "Brief v18 asks for the figure plan".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D7 states: no rendered byte moves. A schema-v12 draft renders as the same draft would as v11 without `figurePlan`; what is new is check's findings on the plan and the report-only `figureAdvice` member. A draft of schema v11 or earlier keeps every finding and byte but for a `field-version` finding at `$.figurePlan`, and no provider-mode byte changes.
