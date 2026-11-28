# Version 2.53 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-90/walk_errata_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). An erratum of the figure walks of version 2.40 in two statements: the brief v24 paragraph is quoted as the brief issues it, with bare quotation marks, and the walk layer's taking the pointer over the drawing's own tooltips is stated as a trade-off. No draft schema, brief version or byte, finding, check record, `machine.json` member, page byte, scenario or migration moves. Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-walk-advice/proposed/polaris-generation/spec.md` (dossier walk advice version 2.51, row A-275, tag `polaris-dossier-walk-advice-v2.51`; sha256 `84ed7449a67e00da17c03ec921e5b419d06f17c1f04df55c0d548abdaa8d62ca`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-walk-errata/proposed/polaris-generation/spec.md`, sha256 `bdbb3ff63653cff507976110c410da493eddd50ae36d75434869d1c5f6015393`) replaces that text, composed after version 2.51. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.51's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 2311 lines, 2309 appear byte for byte and in order in the new text; 2 lines are amended in place and none is removed. Below, each edit is one item, so a line edited in several places gives several items (5 items over 2 lines). All 336 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-90/walk_errata_build_spec.py`, which reproduces the spec byte for byte).

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.53. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…labels the figure's lists already show.": inserted "As the walk style rules of version 2.40 make every box of a walk's layer take the pointer, whether or not it holds a badge or a link, the drawing's own tooltip for a node, the `<title>` the drawing gives it, does not show under the pointer on a walked figure (stated from version 2.53). This is a trade-off, kept for two reasons: a box's `walk-source` link fills the box and takes the pointer to be followed, and the outline under the pointer marks every box of a walked figure alike. What such a tooltip carries is the node's label and marking. The node's box in the drawing shows the marking and the label, or, where the label is longer than the box holds, its first lines ending in an ellipsis; the full label and the marking stay in the figure's list of every component and relationship, behind that list's disclosure. A figure with no walk keeps its tooltips, save over the mark of a zoom link that version 2.50 sets on a box.".
- After "…you may give it one `walk`:": displaced "`{\"figure\":"; now "`{"figure":".
- After "…one `walk`: `{\"figure\": <that diagram's id>,": displaced "\"steps\": [{\"element\":"; now ""steps": [{"element":".
- After "…a base element it shows as": displaced "{\"map\", \"path\"}>, \"block\":"; now "{"map", "path"}>, "block":".
- After "…brief record SHALL name brief v24.": inserted "From version 2.53, the paragraph quoted above is that paragraph's exact text, every quotation mark in it one quotation mark with no backslash before it, the bytes brief v24 issues; version 2.40 and every version until this one wrote a backslash before each of its twelve quotation marks, an escape of this text that no brief issued.".

## Added

[Observed] No paragraph, line or scenario: 0 paragraphs and 0 scenarios are inserted. The two new sentences are appended to existing lines and appear above as insertions.

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D4 states: none. The brief already issues the corrected paragraph (`WALK_PARAGRAPH`, asserted equal by the build script) and the walk layer already takes the pointer over every box (`.walk-node{…pointer-events:auto…}`), so no finding, check record, `machine.json`, `dossier.json`, page, brief, record or provider-mode byte moves.
