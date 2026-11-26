# Version 2.33 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-40/figure_plan_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-question-kind-floor/proposed/polaris-generation/spec.md` (dossier question-kind floor version 2.32, row A-315, tag `polaris-dossier-question-kind-floor-v2.32`; sha256 `4439371414c716ba52493066bfe9908029c8378e06594454cf8e343939590b32`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md`, sha256 `8ae85a0b259825a13d5628b939cebf46e002fb72a671117f8685fc7c44016a3c`) replaces that text, composed after version 2.32, the effective REQ-034 on `main` at this writing. It was drafted over 2.22, rebuilt over 2.23 and 2.24, and rebuilt a last time over 2.32 when 2.26, 2.29 and 2.32 landed first (`design.md` D1). Schema v13 (2.26) descends from v10, not from v11 or v12, so schema v14 joins the two lines and brief v22 joins briefs v17 and v18 to brief v21. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.32's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1542 lines, 1537 appear byte for byte and in order in the new text; 5 are amended in place (below) and none is removed. All 220 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-40/figure_plan_build_spec.py`, which reproduces the spec byte for byte); `figure_plan_survival.py` beside it prints the line and scenario counts and checks each predecessor scenario block.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.33. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…as `polaris-dossier-brief-v17`, from version 2.24 as": displaced "`polaris-dossier-brief-v18`"; now "`polaris-dossier-brief-v18`,".
- After "…`polaris-dossier-brief-v18` from version 2.26 as `polaris-dossier-brief-v19`,": displaced "and"; now "".
- After "…and from version 2.29 as `polaris-dossier-brief-v20`,": inserted "from version 2.32 as `polaris-dossier-brief-v21` and from version 2.33 as `polaris-dossier-brief-v22`,".
- After "…schema v11, brief v18 issues schema": displaced "v12"; now "v12, briefs v19, v20".
- After "…brief v18 issues schema v12 and": displaced "briefs v19 and v20"; now "v21".
- After "…v19 and v20 issue schema v13": inserted "and brief v22 issues schema v14".
- After "…v6, v7, v8, v9, v10, v11,": displaced "v12"; now "v12, v13".
- After "…v8, v9, v10, v11, v12 or": displaced "v13"; now "v14".
- After "…instruction or restore only the v19": displaced "version."; now "version; and, for version 2.33, schema-v14 drafts with complete, incomplete, repeated and malformed figure plans, planned figures named, unresolved, misplaced and of the wrong kind, and omitted places; figures on each side of each advice rule's boundary (a third and a fourth node, a third edge among three nodes, a third and a fourth step, a second and a third message, a third and a fourth group; equal, contained, extended and reversed keys and another family; a unit enclosing another with and without a `contains` arrow, a chain of them or a nesting, a directory that is only a prefix of a path, and an element beside its model parent or grandparent in a graph view and a containment view); views sharing elements; entries with an unresolved or non-string `target`; the same drafts with their draft layer withheld; schema-v14 drafts joining views, a containment, the worth-knowing mark and `questionKinds`; and drafts of schema v13 and earlier with and without `figurePlan`, `model` and `view`.".
- After "…beside it, and the issued brief": displaced "v21."; now "v21; for version 2.33, the plan findings with their paths, details and order, the report's `figureAdvice` member, the check record, `run-advice.json` and reading ledger beside it, the brief v22 figure-plan paragraph, and the rendered bytes of a v14 draft beside the same draft without `figurePlan`, and a v14 draft's `worthKnowing` advice, callout and `questionKindAdvice` beside the same members' in a v13 draft.".
- After "…and the declarations, outside the advice": displaced "code."; now "code; for version 2.33, each fixture's expected plan findings and advisories written as literals before check runs, each label key computed by hand from each view's expansion, and a v14 draft's pages compared byte for byte with the same draft rendered without `figurePlan`.".
- After "…the brief's paragraph names a regression": displaced "question."; now "question; for version 2.33, a v14 draft without a plan, with a place unplanned or planned twice, or with a planned figure that is missing, homed elsewhere or of another kind proceeds to review; a plan entry's text reaches a page or a published file; an advisory is a finding, changes an outcome or a record, or is counted by the reading ledger or `run-advice.json`; an advisory fires on a fixture outside its rule or is missing from one inside it; or a draft of schema v13 or earlier changes any finding but the `field-version` one at `$.figurePlan`, or any byte; a v14 draft loses the worth-knowing mark, its callout or its advice, or the question-kind advice; or the question-kind floor counts a diagram or a plan entry.".

## Added

[Observed] 5 paragraphs, placed immediately after the paragraph beginning "Brief v21 SHALL issue schema `polaris-dossier-local-draft-v13`. For the same run it SHALL equal brief …":

- "A draft in schema `polaris-dossier-local-draft-v14` (version 2.33) joins the two schemas that descend from schema v10. …"
- "For a v14 draft Syzygy SHALL report these repair findings, each of kind `figure-plan` unless another …"
- "For a v14 draft whose check reports no finding of kind `schema`, `syzygy dossier check` SHALL …"
- "Brief v22 SHALL issue schema v14; it is brief v21 changed only in its version line, …"
- "A draft in schema v13 or earlier SHALL be checked and rendered exactly as version 2.32 …"

[Observed] 12 scenarios, after the predecessor's last scenario and before the Form line: "A figure plan names each place's question and figure", "Draft without a figure plan refused", "Every place is planned once", "Malformed plan entry refused", "A planned figure is the one drawn at its place", "Earlier schema keeps its bytes with a figure plan added", "A chain of three or fewer is advised as a sentence", "A figure that draws nothing new is advised as a duplicate", "A figure that mixes levels is advised", "Figure advice gates nothing", "Schema v14 joins the system model to the worth-knowing mark", "Brief v22 asks for the figure plan".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D7 states: no rendered byte moves. A schema-v14 draft renders as the same draft would without `figurePlan`, under the rules for schemas v12 and v13; what is new is check's findings on the plan, the report-only `figureAdvice` member, and that one draft may now carry both the system model and the worth-knowing mark. A draft of schema v13 or earlier keeps every finding and byte but for a `field-version` finding at `$.figurePlan`, and no provider-mode byte changes.
