# Version 2.38 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-choice-floor/proposed/polaris-generation/spec.md` (choice floor version 2.37, row A-336, tag `polaris-dossier-choice-floor-v2.37`; sha256 `02f7a314e827682f08e69e4d47a03479ff82c8896ecbddd99315e5f4e55bc380`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-migration-parity/proposed/polaris-generation/spec.md`, sha256 `e37ca0fc3053302a13ccb0c2ad87c990cdb887fe275568eb9a707425396682f4`) replaces that text, composed after version 2.37. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.37's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1829 lines, 1823 appear byte for byte and in order in the new text; 6 are amended in place (below) and none is removed. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.38. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…on every page rendered from it,": inserted "and every figure entry of its `machine.json`, are byte-identical to those of d, except a figure that draws a withheld-end edge (below) and that figure's entry, and, where d holds no withheld-end edge, so are".
- After "…page rendered from it, its figure-fit": displaced "member,"; now "member and".
- After "…the reading ledger of its check": displaced "record and every figure entry of its `machine.json` are byte-identical to those of d;"; now "record;".
- After "…bytes differ only in `machine.json`'s `model`": displaced "member and"; now "member,".
- After "…draft's own bytes or its schema": displaced "version."; now "version, and, where d holds a withheld-end edge, in a byte that renders, lists or counts the relationship it migrates to or its citations. A withheld-end edge (version 2.38) is an edge of a graph diagram of d that the draft does not label Unknown and that is not itself rendered as a withheld item, either of whose end nodes renders as a withheld item. Rule `relation-witness` version 1 decides such an edge of d by the order version 2.19 states, in which only an edge rendered as a withheld item is `unknown` (`edge-not-inferred`), so it may be witnessed; and it decides the relationship the migration gives it by the case version 2.24 states, a relationship either of whose elements renders as a withheld item being `unknown` (`edge-not-inferred`), which rule is kept. So where d holds a withheld-end edge, the figure that draws it, that figure's entry, the figure-fit member and the reading ledger of the migrated draft are the bytes the rules of version 2.24 give it, the relationship carrying `witness` state `unknown` with reason `edge-not-inferred` and rendering as version 2.19 renders an edge that is not witnessed, with the draft's marking, and no parity is stated for them. A nesting of a containment is never such an edge: version 2.23 already decides one either of whose groups renders as a withheld item as `unknown` (`edge-not-inferred`), so its figure keeps the parity.".
- After "…a `top-level-directory` unit and no unit,": inserted "none of them rendering as a withheld item,".
- After "…over drafts with and without base": displaced "views."; now "views; and, for version 2.38, schema-v10 and v11 drafts that check passes with and without a withheld-end edge, witnessed, challenged and not witnessed, beside an edge the draft labels Unknown and a figure that draws none, migrated to schema v12.".
- After "…member of a draft with base": displaced "views."; now "views; for version 2.38, the relationship state and reason a withheld-end edge migrates to, and which `<figure>` elements, figure entries, figure-fit members and reading ledgers of the migrated draft keep the parity.".
- After "…of the same tree with no": displaced "draft."; now "draft; for version 2.38, each migrated fixture's figures and figure entries compared byte for byte with the original's for every figure that draws no withheld-end edge, and the state of each withheld-end edge's relationship fixed by hand as `unknown` (`edge-not-inferred`).".
- After "…`field-version` findings in place of `schema`": displaced "findings."; now "findings; a figure that draws no withheld-end edge loses byte parity under migration, or a withheld-end edge's migrated relationship has a witness state other than `unknown` (`edge-not-inferred`) or renders Observed.".

## Added

[Observed] 0 paragraphs.

[Observed] 1 scenarios, after the predecessor's scenario "Brief v23 states the derived base" and before the Form line: "Witnessed edge to a withheld node leaves the migration parity".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] None. No schema, brief, finding, check record, page or `machine.json` byte moves: the amendment narrows what the requirement promises of the v10 and v11 migration to what version 2.24's own withheld rule already gives (`design.md` D2). The migration's output is unchanged.
