# Version 2.40 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-32/walk_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-import-facts/proposed/polaris-generation/spec.md` (dossier lexical import facts version 2.39, row A-270, tag `polaris-dossier-import-facts-v2.39`; sha256 `9502229052a3b7da3880b4062e54141681a2d01e09163b8df24c2aab20e479fb`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-figure-walks/proposed/polaris-generation/spec.md`, sha256 `ea18e7d7c1c6281929a974b1e6d0cd7cf935c06851b22efa4e4c167595da75cf`) replaces that text, composed after version 2.39. It was drafted and reviewed over figure plan 2.33 with the placeholders `2.NN`, `vSS` and `vBB`, and is rebuilt over 2.39 by the build script as version 2.40, schema v16 and brief v24, with one rule added, the base-element step (`design.md` D1, D10). Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.39's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1920 lines, 1915 appear byte for byte and in order in the new text; 5 are amended in place (below) and none is removed. All 278 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-32/walk_build_spec.py`, which reproduces the spec byte for byte); `walk_survival.py` beside it prints the line and scenario counts and checks each predecessor scenario block.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.40. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…as `polaris-dossier-brief-v21`, from version 2.33 as": displaced "`polaris-dossier-brief-v22` and"; now "`polaris-dossier-brief-v22`,".
- After "…`polaris-dossier-brief-v22` and from version 2.35 as": displaced "`polaris-dossier-brief-v23`,"; now "`polaris-dossier-brief-v23` and from version 2.40 as `polaris-dossier-brief-v24`,".
- After "…schema v13, brief v22 issues schema": displaced "v14 and"; now "v14,".
- After "…and brief v23 issues schema v15": inserted "and brief v24 issues schema v16".
- After "…v8, v9, v10, v11, v12, v13,": displaced "v14"; now "v14, v15".
- After "…v10, v11, v12, v13, v14 or": displaced "v15"; now "v16".
- After "…that draws none, migrated to schema": displaced "v12."; now "v12; and, for version 2.40, schema-v16 drafts with well-formed and malformed walks in sections, subsections and deep dives; walks whose figure is unresolved, homed elsewhere, of a non-graph kind, both, not produced, withheld, rendered as the inertness notice or drawn 1048 px wide; steps naming a node, a view's element, an element a later view shares with an earlier one, an element the view does not show, an element twice, a paragraph of the place, of a subsection, of another place, inside a presentation element, one citing nothing and one whose citations are withheld; nodes that are withheld, cite no file with a source page, or cite several spans; steps naming a base element of a view with a `base`, one it hides, one of another map and one it does not list, over a base map established and not established at check; pages holding several walked figures whose identities share a prefix; and drafts of schema v15 and earlier with and without `walk`.".
- After "…`readerAdvice.choiceFloor` and the check record beside": displaced "it."; now "it; for version 2.40, the walk findings with their paths, details and order, the walked figure's page (its layer, boxes, badges, source links and their accessible names, list and the paragraphs' unchanged ids) beside the same draft rendered without the walk, the uniqueness of every id on each page, the walk's style rules on each page, and the browser's `:target` highlight, focus after a step's link and Tab order with scripts off, and the brief v24 walk paragraph.".
- After "…and understanding record, outside the advice": displaced "code."; now "code; for version 2.40, each fixture's expected walk findings and each box's position, size and `href` written as literals before check and render run, each box's position taken by hand from the layout's literal constants, and each `href` compared with the citation link the list of the figure carrying the node's claim carries.".
- After "…is counted otherwise than a v13": displaced "draft."; now "draft; for version 2.40, a walk whose figure, element or paragraph does not resolve as stated proceeds to review; a box lies off its node; a walk renders over a drawing 1048 px wide; an id is carried twice on a page; a step's link does not highlight its element, or highlights it by script or by colour alone; a box's link lands anywhere but the cited lines its first citation's link lands on; a base element's box takes a link, or a finding's detail holds a base path the draft wrote; a step's item nests a link; a fragment target lies in a collapsible section; a paragraph's bytes, the drawing's bytes, `machine.json`, a check record, the reading ledger or the provider golden move; a page without a walk changes; or a draft of schema v15 or earlier changes any finding but the `field-version` one at a walk, or any byte.".

## Added

[Observed] 5 paragraphs, placed immediately after the paragraph beginning "A draft in schema v14 or earlier SHALL be checked and rendered exactly as …":

- "A draft in schema `polaris-dossier-local-draft-v16` (version 2.40) is a schema-v15 draft in every respect but one: …"
- "For a v16 draft Syzygy SHALL report these repair findings for each walk, each of kind …"
- "A walk renders exactly where its figure renders as a drawing whose width is not 1048 …"
- "Brief v24 SHALL issue schema v16; it is brief v23 changed only in its version line, …"
- "A draft in schema v15 or earlier SHALL be checked and rendered exactly as version 2.39 …"

[Observed] 13 scenarios, after the predecessor's last scenario that precedes the Form line, and before that line: "A walk ties a section's paragraphs to its figure's elements", "Walk ids stay unique on a page of several walked figures", "Choosing a step highlights its element with no script", "Each box links to the lines its first citation cites", "A walk through a later view of a shared element", "A step names a base element", "Malformed walk refused", "A walk's figure is drawn where the walk is", "A walk's steps name the figure's elements and the place's cited paragraphs", "Earlier schema keeps its bytes with a walk added", "A walk moves only its figure's page", "A drawing 1048 px wide is walked nowhere", "Brief v24 offers the walk".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D7 states: a draft of schema v15 or earlier keeps every finding and byte but for a `field-version` finding at a walk; a schema-v16 draft without a walk renders as the same draft in schema v15. A walk moves only the page that draws its figure (a wrapper, an HTML layer, a list and the walk style rules), that page's measures in the size report and the rendered-design packet. No paragraph's bytes, the drawing's bytes, `machine.json`, every check record, the reading ledger and every provider-mode byte move.
