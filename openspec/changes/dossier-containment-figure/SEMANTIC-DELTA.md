# Version 2.21 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-hero-figure/proposed/polaris-generation/spec.md` (dossier hero figure version 2.20, row A-54, tag `polaris-dossier-hero-figure-v2.20`; sha256 `fcf271f84c03570cfbb8447d3370ae26c4ea75a54211b1677148b607e940d36b`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-containment-figure/proposed/polaris-generation/spec.md`, sha256 `9c8b919de56f92b09658df81c147e88129b147793d7e9e719be5373ff70970fb`) replaces that text, composed after version 2.20. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.20's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1253 lines, 1245 appear byte for byte and in order in the new text; 8 are amended in place (below) and none is removed. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.21. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…a fact under rule `relation-witness` below,": inserted "and, since version 2.21, for a nesting of a containment figure that Syzygy so finds witnessed,".
- After "…`polaris-dossier-brief-v15` and from version 2.20 as": displaced "`polaris-dossier-brief-v16`,"; now "`polaris-dossier-brief-v16` and from version 2.21 as `polaris-dossier-brief-v17`,".
- After "…and brief v16 issues schema v10": inserted "and brief v17 issues schema v11".
- After "…v3, v4, v5, v6, v7, v8,": displaced "v9"; now "v9, v10".
- After "…v5, v6, v7, v8, v9 or": displaced "v10"; now "v11".
- After "…earlier schema keeps the draft's marking.": inserted "Since version 2.21 the nesting of a containment figure of a schema-v11 draft is read by the same rule, and a witnessed nesting is stated in Syzygy's words in the figure's list and machine form alone, its two boxes keeping the draft's marking.".
- After "…finds witnessed by such a fact,": inserted "or, since version 2.21, on the list item of a containment figure's nesting that Syzygy so finds witnessed,".
- After "…v9 and earlier with and without": displaced "`hero`."; now "`hero`; and, for version 2.21, schema-v11 containment figures of one to five top-level groups and one to three levels, at and past each bound (depth, 40 groups, eight children, five top-level groups), with no nesting, with members of another kind, with Unknown and withheld groups, with and without units on each pair of nested groups and with complete and partial structure records, each rendered at 1440 and 390, and drafts of schema v10 and earlier with and without a containment.".
- After "…entry and the brief v16 hero": displaced "paragraph."; now "paragraph; for version 2.21, the `figure-kind`, `containment-depth`, `containment-size`, `containment-flat`, `unit-reference`, `relation-challenged`, `schema` and `field-version` findings with their details, each containment's laid-out boxes, its two forms and which the stylesheet displays at each width, its tally, list, witnessed-nesting items, declarative source and `figureStructures` entry, and figure fit's entries.".
- After "…the bytes version 2.19 renders for": inserted "it; for version 2.21, each fixture tree's box coordinates, W and H computed by hand from the stated constants and fixed as literals, the findings' details, the brief v17 paragraph and the declarative source fixed as literals, and, for every draft of schema v10 or earlier, the bytes version 2.20 renders for".
- After "…place of the `schema` finding at": displaced "`$.hero`."; now "`$.hero`; a containment deeper than three levels, over 40 groups or with no nesting passes, or is refused only by a `schema` finding; a box's coordinates, W or H differ from the stated layout or depend on a label's width; a line, arrow or connector is drawn between groups; a box of a draft is drawn solid or labelled Observed; a nesting is witnessed by a fact of another kind, across other unit kinds, or by a recognizer outside the eligibility table, or challenged where coverage is partial; an unknown nesting raises a finding; a containment fails figure fit at 1440 or 390, or both forms, or neither, display at a width; the phone form carries an identity, citation, anchor or label token, or a script is needed; or a draft of schema v10 or earlier, or a provider-mode page, changes a byte other than the `field-version` findings in place of `schema` findings.".

## Added

[Observed] 7 paragraphs, placed immediately before the paragraph of declared manifest facts ("In the operator-agent mode `syzygy dossier check`, for each draft revision it checks and writes a check record for, SHALL also derive declared manifest facts"), in this order:

- "A draft in schema `polaris-dossier-local-draft-v11` (version 2.21) is a schema-v10 draft in every respect …"
- "For a v11 draft the `figure-kind` rule of version 2.5 SHALL read a `containment` …"
- "Rule `relation-witness` version 1 SHALL decide, for each produced containment figure of a v11 …"
- "A containment has its own pure layout, deterministic for the same record, that reads …"
- "Syzygy SHALL render a produced containment figure on the page and in the place …"
- "Brief v17 SHALL issue schema v11; it is brief v16 changed only in its …"
- "A draft in schema v10 or earlier SHALL be checked and rendered exactly as …"

[Observed] 10 scenarios, after the predecessor's last scenario and before the Form line: "Three-level containment laid out as boxes within boxes", "Containment fits at both widths", "Containment deeper than three levels refused", "Containment over its size or with no nesting refused", "Containment with members of another kind", "Nesting witnessed by a contains fact", "Nesting challenged where coverage is complete", "Nesting of other units is Unknown, never a finding", "Earlier schema keeps its bytes", "Brief v17 states the containment kind".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D8 states: only the pages, `machine.json`, findings and check records of a schema-v11 draft that holds a containment figure. No byte of a draft of schema v10 or earlier moves against version 2.20, apart from `field-version` findings in place of `schema` findings where such a draft carries a containment, and no byte of the provider mode moves.
