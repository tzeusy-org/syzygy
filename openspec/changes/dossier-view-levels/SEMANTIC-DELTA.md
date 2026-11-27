# Version 2.45 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-39/view_levels_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). It adds draft schema v17 (a view's `level` and `scope`), brief v25, the findings `view-scope`, `view-level` and `view-scope-outside`, and zoom links on rendered pages; no check record, `machine.json` member or migration. Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-imports-corroboration/proposed/polaris-generation/spec.md` (dossier imports corroboration version 2.44, row A-273, tag `polaris-dossier-imports-corroboration-v2.44`; sha256 `d60afad88bc72dde63ad597d2b9a5fa646143e4b68f89202ffcaff8742068c4d`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-view-levels/proposed/polaris-generation/spec.md`, sha256 `208252fd2094fd5ad725c6d03b0c51884d2017a7fdb5f8217ffeb53720ab45f4`) replaces that text, composed after version 2.44. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.44's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 2086 lines, 2081 appear byte for byte and in order in the new text; 5 lines are amended in place and none is removed. Below, each edit is one item, so a line edited in several places gives several items (5 items over 5 lines). All 302 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-39/view_levels_build_spec.py`, which reproduces the spec byte for byte).

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.45. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…its figure links to no other": displaced "figure."; now "figure; from schema v17 (version 2.45) a view may also name its abstraction level and the element it is about, and a figure may carry zoom links to other figures, as version 2.45 states, and "one level" here means only that a view is flat, selecting from the one model and nesting no other view.".
- After "…listed, and check records without the": displaced "member."; now "member; and, for version 2.45, views carrying each `level` and `scope`, selecting elements and base elements of each type, inside and outside the scope, with zoom targets on the same page and on others, in a notice, and with and without a walk.".
- After "…evidence text, and its `machine.json` `witness`": displaced "member."; now "member; for version 2.45, each `view-scope`, `view-level`, `view-scope-outside` and `field-version` finding, each zoom link's place, address and text, the layer, the order of the page's links, and the keyboard focus moving through them.".
- After "…fixture's import facts before the rule": displaced "runs."; now "runs; for version 2.45, each view's expected findings written from the type table and the model's parents, and each zoom link's expected address written as a literal from the fixture's pages, before check and render run.".
- After "…names an import fact's path or": displaced "operand."; now "operand; for version 2.45, a view shows an element of a type its level does not admit, or a part outside its scope, with no finding; a box whose element has its own view carries no zoom link or one to another figure; a zoom link needs a script or is unreachable by keyboard; or a v17 draft without `level` and `scope` renders other bytes than in schema v16.".

## Added

[Observed] 6 paragraphs, placed immediately after the paragraph ending "…the rendered bytes the provider golden pins do not change. No migration yields a v16 draft.":

- "A draft in schema `polaris-dossier-local-draft-v17` (version 2.45) is a schema-v16 draft in every respect but one: …"
- "The word "level" has carried two meanings in this requirement, and from version 2.45 they are …"
- "For a v17 draft Syzygy SHALL report these repair findings, each with the literal detail given, …"
- "An element has its own view where the view of a graph or containment diagram of …"
- "Brief v25 SHALL issue schema v17; it is brief v24 changed only in its version line, …"
- "A draft in schema v16 or earlier SHALL be checked and rendered exactly as version 2.44 …"

[Observed] 9 scenarios, after the predecessor's last scenario that precedes the Form line, and before that line: "A view's level refuses an element of another level", "A view's scope is of its level and bounds what it shows", "A base view's level types its base elements", "A box whose element has its own view links to it", "Zoom links and a walk share one layer", "No zoom target, no zoom link", "A view's level and the mixed-levels advice read different things", "Earlier schemas take level and scope as a field-version", "Brief v25 offers levels and zoom".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D6 states: drafts of schema v16 or earlier, and v17 drafts with no `level` or `scope`, keep their bytes but those naming the schema or digest. A view with `level` and `scope` adds two attributes to its figure; a figure drawing an element whose own view renders gains zoom links (a list-item link, the layer and its style rules), moving that page and its size-report measures. No check record, `machine.json`, `dossier.json`, reading ledger, figure-fit entry, figure advice or provider-mode byte moves.
