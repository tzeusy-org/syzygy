# Version 2.NN semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-containment-figure/proposed/polaris-generation/spec.md` (dossier containment figure version 2.23, row A-59, tag `polaris-dossier-containment-figure-v2.23`; sha256 `0f6ef5fb8ba2ef4577e2512f54c7e0e7683de7d5466def39fcb1b7b555d92f5d`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-system-model/proposed/polaris-generation/spec.md`, sha256 `21c4b0835116a41407b227c748a96a2e8468feb8343d9b07692101f4494ed47c`) replaces that text, composed after version 2.23. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.23's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1351 lines, 1342 appear byte for byte and in order in the new text; 9 are amended in place (below) and none is removed. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.NN, a placeholder label until adoption. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…a nesting of a containment figure": inserted "that Syzygy so finds witnessed, and, since version 2.NN, for a derived relationship of a draft's system model".
- After "…as `polaris-dossier-brief-v15`, from version 2.20 as": displaced "`polaris-dossier-brief-v16` and"; now "`polaris-dossier-brief-v16`,".
- After "…`polaris-dossier-brief-v16` and from version 2.23 as": displaced "`polaris-dossier-brief-v17`,"; now "`polaris-dossier-brief-v17` and from version 2.NN as `polaris-dossier-brief-v18`,".
- After "…schema v9, brief v16 issues schema": displaced "v10 and"; now "v10,".
- After "…and brief v17 issues schema v11": inserted "and brief v18 issues schema v12".
- After "…v4, v5, v6, v7, v8, v9,": displaced "v10"; now "v10, v11".
- After "…v6, v7, v8, v9, v10 or": displaced "v11"; now "v12".
- After "…two boxes keeping the draft's marking.": inserted "Since version 2.NN a derived relationship of a schema-v12 draft's model is no claim of the draft but its request that Syzygy state a relation: it renders Observed, in Syzygy's words, only where the same rule witnesses it, and Unknown, in Syzygy's words, otherwise, and no element of the model is upgraded.".
- After "…nesting that Syzygy so finds witnessed,": inserted "or, since version 2.NN, on the arrow and list item of a derived relationship that Syzygy so finds witnessed,".
- After "…than an arrow of a schema-v9": inserted "or later".
- After "…that Syzygy finds witnessed (version 2.19),": inserted "a derived relationship's arrow of a schema-v12 draft among them (version 2.NN),".
- After "…and earlier with and without a": displaced "containment."; now "containment; and, for version 2.NN, schema-v12 drafts whose models hold elements of every type, with and without parents and units, cited and derived relationships, and views that share elements, that name missing elements or relationships, that show a relationship without its ends, that repeat an entry, and containment views at and past each bound; elements and relationships no view shows; parent chains of one to four and cycles; derived relationships over each pair of unit kinds with complete and partial structure records; withheld elements; every stored draft of schema v10 and v11 migrated; and drafts of schema v11 and earlier with and without `model` and `view`.".
- After "…and `figureStructures` entry, and figure fit's": displaced "entries."; now "entries; for version 2.NN, the `unresolved-reference`, `element-type`, `unit-reference`, `element-parent`, `relationship-not-derivable`, `view-duplicate`, `view-relationship`, `view-shape`, `model-unviewed`, containment, `relation-challenged`, `schema` and `field-version` findings with their details, each view's figure, each shared element's boxes, list items and single claim anchor, each derived relationship's arrow and item, `machine.json`'s `model` member, and the migrated draft and its rendered figures beside the original's.".
- After "…the bytes version 2.22 renders for": displaced "it."; now "it; for version 2.NN, each fixture's expected findings, list items and `model` member fixed as literals from the fixture by hand, each migrated fixture written by hand from its original and compared with the migration's output, and each migrated draft's figures, figure-fit member and `machine.json` figure entries compared byte for byte with those its original renders.".
- After "…`field-version` findings in place of `schema`": inserted "findings; a view names an element the model lacks, or a relationship without its ends, and passes; a shared element renders two labels, two markings or two claim anchors; an element or relationship no view shows passes; a derived relationship renders as the draft's claim, renders Observed without a witnessing fact, or passes where no eligibility row can derive it; a parent cycle, or a chain that runs into one, passes; a finding is computed beside a `schema` finding on the members it reads; a migrated draft of a draft check passes fails check, gains an advisory, or renders a figure byte its original does not; a shared element's later item links to a notice or to no `id`, or a witnessed relationship renders the draft's label; a view links to another view or a level; or a draft of schema v11 or earlier, or a provider-mode page, changes a byte other than the `field-version` findings in place of `schema`".

## Added

[Observed] 7 paragraphs, placed immediately before the paragraph of declared manifest facts ("In the operator-agent mode `syzygy dossier check`, for each draft revision it checks and writes a check record for, SHALL also derive declared manifest facts"), in this order:

- "A draft in schema `polaris-dossier-local-draft-v12` (version 2.NN) is a schema-v11 draft in every respect …"
- "For a v12 draft Syzygy SHALL report these repair findings, each with the literal …"
- "Rule `relation-witness` version 1 SHALL decide, for a v12 draft with no `schema`, `unresolved-reference`, …"
- "Syzygy SHALL render a diagram of a v12 draft that carries a `view` exactly …"
- "Syzygy SHALL provide the migration of a draft of schema v10 or v11 to …"
- "Brief v18 SHALL issue schema v12; it is brief v17 changed only in its …"
- "A draft in schema v11 or earlier SHALL be checked and rendered exactly as …"

[Observed] 14 scenarios, after the predecessor's last scenario and before the Form line: "Two views share one element", "Migration renders the same figures", "View naming a missing element refused", "View showing a relationship without its ends refused", "Element parents that loop refused", "Element type disagreeing with its unit refused", "Derived relationship stated by Syzygy", "Derived relationship with nothing to derive it refused", "Element no view shows refused", "Schema v11 and earlier keep their bytes", "Derived relationship Syzygy cannot derive drawn Unknown", "Findings beside a schema finding not computed", "Shared element in a later containment and a witnessed relationship", "Brief v18 states the system model".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D9 states: only the pages, `machine.json`, findings, check records and brief of a schema-v12 draft. No byte of a draft of schema v11 or earlier moves against version 2.23, apart from `field-version` findings in place of `schema` findings where such a draft carries `model` or `view`, and no byte of the provider mode moves.
