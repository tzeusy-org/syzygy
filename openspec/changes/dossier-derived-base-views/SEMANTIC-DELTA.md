# Version 2.34 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md` (dossier figure plan version 2.33, row A-65, tag `polaris-dossier-figure-plan-v2.33`; sha256 `8ae85a0b259825a13d5628b939cebf46e002fb72a671117f8685fc7c44016a3c`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-derived-base-views/proposed/polaris-generation/spec.md`, sha256 `a404fa70e788f7ca20761f5a30f1d840604706cb811fcf50664f3e2942592c45`) replaces that text, composed after version 2.33. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.33's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1622 lines, 1613 appear byte for byte and in order in the new text; 9 are amended in place (below) and none is removed. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.34. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…model that Syzygy so finds witnessed,": inserted "and, since version 2.34, for a base element a view draws from a computed map whose fact so renders,".
- After "…as `polaris-dossier-brief-v20`, from version 2.32 as": displaced "`polaris-dossier-brief-v21` and"; now "`polaris-dossier-brief-v21`,".
- After "…`polaris-dossier-brief-v21` and from version 2.33 as": displaced "`polaris-dossier-brief-v22`,"; now "`polaris-dossier-brief-v22` and from version 2.34 as `polaris-dossier-brief-v23`,".
- After "…v19, v20 and v21 issue schema": displaced "v13 and"; now "v13,".
- After "…and brief v22 issues schema v14": inserted "and brief v23 issues schema v15".
- After "…v7, v8, v9, v10, v11, v12,": displaced "v13"; now "v13, v14".
- After "…v9, v10, v11, v12, v13 or": displaced "v14"; now "v15".
- After "…draft renders on a map page.": displaced "A"; now "Since version 2.34 a view of a schema-v15 draft MAY start from the directory map or the unit map as an embedded computed visual (RFC7-28): it names the map and paths of its elements, read-only, draws the elements it shows in Syzygy's words with the map's mark, identity and computed provenance, counts on the figure every element it leaves out, and never adds, alters, relabels, re-marks or suppresses a derived fact; the paragraphs of that version state it. Apart from that read-only reading, a".
- After "…relationship that Syzygy so finds witnessed,": inserted "or, since version 2.34, on a base element a view draws from a computed map whose fact so renders,".
- After "…schema-v12 draft among them (version 2.24),": inserted "or a base element of a schema-v15 view whose fact renders Observed (version 2.34),".
- After "…draft among them (version 2.24), and": displaced "none"; now "no `<figure>` of a draft".
- After "…them (version 2.24), and none carries": displaced "`data-visual-provenance="computed"`"; now "`data-visual-provenance="computed"`, which only a base element's box, arrow, list item and chip inside one carry".
- After "…with and without `figurePlan`, `model` and": displaced "`view`."; now "`view`; and, for version 2.34, schema-v15 drafts whose graph and containment views start from the directory and unit maps with `hide`, with `select` and `restReason`, with neither, and with `group` and `names`, at and past each bound, with paths the map lists and does not list, manifest files declaring one and several packages, groups at each level, display names and draft labels equal to base names, with base ends on cited relationships, over complete, partial, stale and unlistable trees, homed on pages at each depth; drafts of schema v14 and earlier with and without `base`; and plans and figure advice over drafts with and without base views.".
- After "…the same members' in a v13": displaced "draft."; now "draft; for version 2.34, the `base-reference`, `base-conflict`, `base-root`, `base-group`, `base-size`, `base-label`, `schema` and `field-version` findings with their details, each base view's figure, its chip, legend entry, tally sentence, hidden items and note, each base element's label, mark, double border, identity and provenance attribute, each display name's line and anchor, the notices for an unknown or unresolved base, the `base` member of `machine.json`, the map pages beside those rendered with no draft, and each `figure-plan` finding and `figureAdvice` member of a draft with base views.".
- After "…with the same draft rendered without": displaced "`figurePlan`."; now "`figurePlan`; for version 2.34, each fixture's expected findings, chip text, hidden items and `base` member fixed as literals from the fixture's tree and draft by hand, and each map page compared byte for byte with the same render of the same tree with no draft.".
- After "…counts a diagram or a plan": displaced "entry."; now "entry; a base element renders the draft's label, mark or identity, lacks its double border, or holds a display name inside its box, or a draft member adds, alters or removes a map element or a map page byte; an element of the draft takes a shown base element's name or double border; a view hides an element without a reason, or a hidden element is missing from the chip's count or the hidden items; the chip's numbers differ from the map's at that render, or a count the map does not list is missing from it; a figure resting on an unknown or unresolved base is drawn, or a path naming no listed element is rendered or carried in `machine.json`; a base element carries a claim anchor or enters the draft's counts; figure advice reads, counts or compares a figure with a base; or a draft of schema v14 or earlier, or a provider-mode page, changes a byte other than the `field-version` findings in place of `schema` findings.".

## Added

[Observed] 8 paragraphs, placed immediately after version 2.33's last paragraph and before the task-routes paragraph ("From version 2.15 a draft in schema `polaris-dossier-local-draft-v5` or later MAY carry a top-level member `taskRoutes`"), in this order:

- "A draft in schema `polaris-dossier-local-draft-v15` (version 2.34) is a schema-v14 draft in every respect …"
- "For a v15 draft Syzygy SHALL report these repair findings, each with the literal …"
- "Syzygy SHALL draw a view with a `base` from the map as the render …"
- "Every figure of a view with a `base` SHALL keep `data-visual-provenance="curated"` and carry `data-base-map="<map>"` …"
- "This version states the one exception to the rule that a draft cannot name, …"
- "A v15 draft's `figurePlan` is checked as version 2.33 checks a v14 draft's: a …"
- "Brief v23 SHALL issue schema v15; it is brief v22 changed only in its …"
- "A draft in schema v14 or earlier SHALL be checked and rendered exactly as …"

[Observed] 18 scenarios, after the predecessor's last scenario and before the Form line: "Pruned view prints its chip", "Hide without a reason refused", "Base element keeps Syzygy's words", "Group places base elements in the draft's element", "Select and group together", "Group into a third-level element refused", "Directory containment keeps the root", "One manifest declaring two packages", "Draft element taking a base element's name refused", "Cited arrow joins two base elements", "Path the map does not list refused", "Base element hidden and grouped refused", "Too many base elements refused", "Unknown base renders a notice", "Chip links from a deeper page", "Schema v14 and earlier keep their bytes under base views", "Figure advice reads no base view", "Brief v23 states the derived base".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D9 states: only the figures, `machine.json` figure entries, findings, check records and brief of a schema-v15 draft whose views carry `base`. No byte of a draft of schema v14 or earlier moves against version 2.33, nor its `figureAdvice`, apart from `field-version` findings in place of `schema` findings where such a draft carries `base` or a base end; no map page, no `computedMaps` member and no byte of the provider mode moves.
