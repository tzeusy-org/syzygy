# Version 2.NN semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-system-model/proposed/polaris-generation/spec.md` (dossier system model version 2.24, row A-64, tag `polaris-dossier-system-model-v2.24`; sha256 `f06e830deeef03f5d10f522481c8d25c141ff5ebce097c7411361d5bdc358c54`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-derived-base-views/proposed/polaris-generation/spec.md`, sha256 `6c312d49cdf58ddc167f5726f48d53ff7076ec7acadd5c71bdc3c597502e2e14`) replaces that text, composed after version 2.24. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.24's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1442 lines, 1433 appear byte for byte and in order in the new text; 9 are amended in place (below) and none is removed. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.NN, a placeholder label until adoption. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…model that Syzygy so finds witnessed,": inserted "and, since version 2.NN, for a base element a view draws from a computed map whose fact so renders,".
- After "…as `polaris-dossier-brief-v16`, from version 2.23 as": displaced "`polaris-dossier-brief-v17` and"; now "`polaris-dossier-brief-v17`,".
- After "…`polaris-dossier-brief-v17` and from version 2.24 as": displaced "`polaris-dossier-brief-v18`,"; now "`polaris-dossier-brief-v18` and from version 2.NN as `polaris-dossier-brief-v19`,".
- After "…schema v10, brief v17 issues schema": displaced "v11 and"; now "v11,".
- After "…and brief v18 issues schema v12": inserted "and brief v19 issues schema v13".
- After "…v5, v6, v7, v8, v9, v10,": displaced "v11"; now "v11, v12".
- After "…v7, v8, v9, v10, v11 or": displaced "v12"; now "v13".
- After "…draft renders on a map page.": displaced "A"; now "Since version 2.NN a view of a schema-v13 draft MAY start from the directory map or the unit map as an embedded computed visual (RFC7-28): it names the map and paths of its elements, read-only, draws the elements it shows in Syzygy's words with the map's mark, identity and computed provenance, counts on the figure every element it leaves out, and never adds, alters, relabels, re-marks or suppresses a derived fact; the paragraphs of that version state it. Apart from that read-only reading, a".
- After "…relationship that Syzygy so finds witnessed,": inserted "or, since version 2.NN, on a base element a view draws from a computed map whose fact so renders,".
- After "…schema-v12 draft among them (version 2.24),": inserted "or a base element of a schema-v13 view whose fact renders Observed (version 2.NN),".
- After "…draft among them (version 2.24), and": displaced "none"; now "no `<figure>` of a draft".
- After "…them (version 2.24), and none carries": displaced "`data-visual-provenance="computed"`"; now "`data-visual-provenance="computed"`, which only a base element's box, arrow, list item and chip inside one carry".
- After "…earlier with and without `model` and": displaced "`view`."; now "`view`; and, for version 2.NN, schema-v13 drafts whose graph and containment views start from the directory and unit maps with `hide`, with `select` and `restReason`, with neither, and with `group` and `names`, at and past each bound, with paths the map lists and does not list, manifest files declaring one and several packages, groups at each level, display names and draft labels equal to base names, with base ends on cited relationships, over complete, partial, stale and unlistable trees, homed on pages at each depth; and drafts of schema v12 and earlier with and without `base`.".
- After "…and its rendered figures beside the": displaced "original's."; now "original's; for version 2.NN, the `base-reference`, `base-conflict`, `base-root`, `base-group`, `base-size`, `base-label`, `schema` and `field-version` findings with their details, each base view's figure, its chip, legend entry, tally sentence, hidden items and note, each base element's label, mark, double border, identity and provenance attribute, each display name's line and anchor, the notices for an unknown or unresolved base, the `base` member of `machine.json`, and the map pages beside those rendered with no draft.".
- After "…for byte with those its original": displaced "renders."; now "renders; for version 2.NN, each fixture's expected findings, chip text, hidden items and `base` member fixed as literals from the fixture's tree and draft by hand, and each map page compared byte for byte with the same render of the same tree with no draft.".
- After "…`field-version` findings in place of `schema`": inserted "findings; a base element renders the draft's label, mark or identity, lacks its double border, or holds a display name inside its box, or a draft member adds, alters or removes a map element or a map page byte; an element of the draft takes a shown base element's name or double border; a view hides an element without a reason, or a hidden element is missing from the chip's count or the hidden items; the chip's numbers differ from the map's at that render, or a count the map does not list is missing from it; a figure resting on an unknown or unresolved base is drawn, or a path naming no listed element is rendered or carried in `machine.json`; a base element carries a claim anchor or enters the draft's counts; or a draft of schema v12 or earlier, or a provider-mode page, changes a byte other than the `field-version` findings in place of `schema`".

## Added

[Observed] 7 paragraphs, placed immediately before the paragraph of declared manifest facts ("In the operator-agent mode `syzygy dossier check`, for each draft revision it checks and writes a check record for, SHALL also derive declared manifest facts"), in this order:

- "A draft in schema `polaris-dossier-local-draft-v13` (version 2.NN) is a schema-v12 draft in every respect …"
- "For a v13 draft Syzygy SHALL report these repair findings, each with the literal …"
- "Syzygy SHALL draw a view with a `base` from the map as the render …"
- "Every figure of a view with a `base` SHALL keep `data-visual-provenance="curated"` and carry `data-base-map="<map>"` …"
- "This version states the one exception to the rule that a draft cannot name, …"
- "Brief v19 SHALL issue schema v13; it is brief v18 changed only in its …"
- "A draft in schema v12 or earlier SHALL be checked and rendered exactly as …"

[Observed] 17 scenarios, after the predecessor's last scenario and before the Form line: "Pruned view prints its chip", "Hide without a reason refused", "Base element keeps Syzygy's words", "Group places base elements in the draft's element", "Select and group together", "Group into a third-level element refused", "Directory containment keeps the root", "One manifest declaring two packages", "Draft element taking a base element's name refused", "Cited arrow joins two base elements", "Path the map does not list refused", "Base element hidden and grouped refused", "Too many base elements refused", "Unknown base renders a notice", "Chip links from a deeper page", "Schema v12 and earlier keep their bytes under base views", "Brief v19 states the derived base".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D9 states: only the figures, `machine.json` figure entries, findings, check records and brief of a schema-v13 draft whose views carry `base`. No byte of a draft of schema v12 or earlier moves against version 2.24, apart from `field-version` findings in place of `schema` findings where such a draft carries `base` or a base end; no map page, no `computedMaps` member and no byte of the provider mode moves.
