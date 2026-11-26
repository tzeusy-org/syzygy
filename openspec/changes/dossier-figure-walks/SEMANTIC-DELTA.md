# Version 2.NN semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-32/walk_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor at drafting is the MODIFIED text in `openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md` (dossier figure plan version 2.33; sha256 `8ae85a0b259825a13d5628b939cebf46e002fb72a671117f8685fc7c44016a3c`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-figure-walks/proposed/polaris-generation/spec.md`, sha256 `43351085eb605afa3ef9ded77490656b0389a0a16f604d2fc8b3cc75467b30a7`) replaces the effective text. Derived-base views (syzygy-3efd.38) is to be adopted first; this text is then rebuilt over that version by the build script, and its schema and brief numbers, written here as the placeholders `vSS` and `vBB`, and its label `2.NN` are fixed then (`design.md` D1). Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.33's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1623 lines, 1618 appear byte for byte and in order in the new text; 5 are amended in place (below) and none is removed. All 232 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-32/walk_build_spec.py`, which reproduces the spec byte for byte); `walk_survival.py` beside it prints the line and scenario counts and checks each predecessor scenario block.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.NN. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…as `polaris-dossier-brief-v20`, from version 2.32 as": displaced "`polaris-dossier-brief-v21` and"; now "`polaris-dossier-brief-v21`,".
- After "…`polaris-dossier-brief-v21` and from version 2.33 as": displaced "`polaris-dossier-brief-v22`,"; now "`polaris-dossier-brief-v22` and from version 2.NN as `polaris-dossier-brief-vBB`,".
- After "…v19, v20 and v21 issue schema": displaced "v13 and"; now "v13,".
- After "…and brief v22 issues schema v14": inserted "and brief vBB issues schema vSS".
- After "…v7, v8, v9, v10, v11, v12,": displaced "v13"; now "v13, v14".
- After "…v9, v10, v11, v12, v13 or": displaced "v14"; now "vSS".
- After "…with and without `figurePlan`, `model` and": displaced "`view`."; now "`view`; and, for version 2.NN, schema-vSS drafts with well-formed and malformed walks in sections, subsections and deep dives; walks whose figure is unresolved, homed elsewhere, of a non-graph kind, walked twice, not produced, withheld or rendered as the inertness notice; steps naming a node, a view's element, an element the view does not show, an element twice, a paragraph of the place, of a subsection, of another place, inside a presentation element, and one citing nothing; nodes that are withheld, cite no file with a source page, or cite several spans; and drafts of schema v14 and earlier with and without `walk`.".
- After "…the same members' in a v13": displaced "draft."; now "draft; for version 2.NN, the walk findings with their paths, details and order, the walked figure's page (its layer, boxes, badges, source links, list and paragraph ids) beside the same draft rendered without the walk, the walk's style rules on each page, the browser's `:target` highlight and Tab order with scripts off, and the brief vBB walk paragraph.".
- After "…with the same draft rendered without": displaced "`figurePlan`."; now "`figurePlan`; for version 2.NN, each fixture's expected walk findings and each box's position, size and `href` written as literals before check and render run, each box's position taken by hand from the layout's literal constants, and each `href` compared with the citation link the figure's list carries.".
- After "…counts a diagram or a plan": displaced "entry."; now "entry; for version 2.NN, a walk whose figure, element or paragraph does not resolve as stated proceeds to review; a box lies off its node; a step's link does not highlight its element, or highlights it by script or by colour alone; a box's link lands anywhere but the cited lines its first citation's link lands on; a fragment target lies in a collapsible section; the drawing's bytes, `machine.json`, a check record, the reading ledger or the provider golden move; a page without a walk changes; or a draft of schema v14 or earlier changes any finding but the `field-version` one at a walk, or any byte.".

## Added

[Observed] 5 paragraphs, placed immediately after the paragraph beginning "A draft in schema v13 or earlier SHALL be checked and rendered exactly as …":

- "A draft in schema `polaris-dossier-local-draft-vSS` (version 2.NN) is a schema-v14 draft in every respect but one: …"
- "For a vSS draft Syzygy SHALL report these repair findings for each walk, each of kind …"
- "A walk renders exactly where its figure renders as a drawing: the figure is produced, its …"
- "Brief vBB SHALL issue schema vSS; it is brief v22 changed only in its version line, …"
- "A draft in schema v14 or earlier SHALL be checked and rendered exactly as version 2.33 …"

[Observed] 9 scenarios, after the predecessor's last scenario and before the Form line: "A walk ties a section's paragraphs to its figure's elements", "Choosing a step highlights its element with no script", "Each box links to the lines its first citation cites", "Malformed walk refused", "A walk's figure is drawn where the walk is", "A walk's steps name the figure's elements and the place's cited paragraphs", "Earlier schema keeps its bytes with a walk added", "A walk moves only its figure's page", "Brief vBB offers the walk".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D7 states: a draft of schema v14 or earlier keeps every finding and byte but for a `field-version` finding at a walk; a schema-vSS draft without a walk renders as the same draft in schema v14. A walk moves only the page that draws its figure (a wrapper, an HTML layer, a list, paragraph ids and the walk style rules), that page's measures in the size report and the rendered-design packet. The drawing's bytes, `machine.json`, every check record, the reading ledger and every provider-mode byte are unchanged.
