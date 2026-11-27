# Version 2.44 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-86/imports_witness_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). It changes rule `relation-witness` (version 2) and the rendered bytes of `imports` edges; no schema, brief, finding or check record. Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-migration-bounds/proposed/polaris-generation/spec.md` (dossier migration bounds version 2.43, row A-272, tag `polaris-dossier-migration-bounds-v2.43`; sha256 `bbc1ab4794a9748de88350b2c7cc9ffbeec5dd6d74231739860789aa724acf02`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-imports-corroboration/proposed/polaris-generation/spec.md`, sha256 `5b13a3998bfa9b2b05361ef5f7523b8a7ae58a3d074a440b22e870571d933955`) replaces that text, composed after version 2.43. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.43's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 2056 lines, 2050 appear byte for byte and in order in the new text; 6 lines are amended in place and none is removed. Below, each edit is one item, so a line edited in several places gives several items (10 items over 6 lines). All 298 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-86/imports_witness_build_spec.py`, which reproduces the spec byte for byte).

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.44. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…rest of the check record. At": displaced "this"; now "".
- After "…the check record. At this version": inserted "2.39".
- After "…the witness state that version gives": inserted "it. From version 2.44 rule `relation-witness` version 2 reads it, and a page and `machine.json` carry a corroborating import fact's identity and rule, as that version states; still no draft element is upgraded to Observed by".
- After "…finding for any of them; `e1`": inserted "carrying `relates-to` or `calls`,".
- After "…for any of them; `e1` and": displaced "`e2`"; now "`e2`,".
- After "…and `e2` are `unknown` with `no-witness-rule`,": inserted "`e1` carrying `imports` is `unknown` with `endpoint-kind-mismatch` (version 2.44),".
- After "…over several diagrams, migrated to schema": displaced "v12."; now "v12; and, for version 2.44, graph figures holding `imports` edges between `package-manifest` units, over `importFacts` members with and without a joining `edge` fact, with `complete`, `partial` and `unknown` coverage, with facts not listed, and check records without the member.".
- After "…relationship counts and check's findings on": displaced "it."; now "it; for version 2.44, each `imports` edge's witness state and reason at check and at render, its attributes and evidence text, and its `machine.json` `witness` member.".
- After "…expected `schema` finding written before check": inserted "runs; for version 2.44, each `imports` edge's expected state, reason and fact written as literals from the fixture's import facts before the rule".
- After "…the migration yields no draft for": displaced "it."; now "it; for version 2.44, an `imports` edge renders Observed or solid, is `challenged` or draws a `relation-challenged` finding, is corroborated by a fact whose outcome is not `edge` or that joins other units, or a page or `machine.json` names an import fact's path or operand.".

## Added

[Observed] 2 paragraphs, placed immediately after the paragraph ending "…keeps the draft's marking on the page and is carried in `machine.json` as it is.":

- "Version 2.44 makes rule `relation-witness` version 2: version 1 with one row more, for `imports`, and …"
- "A `corroborated` edge is the draft's claim and renders as version 2.16 renders an edge, with …"

[Observed] 3 scenarios, after the predecessor's last scenario that precedes the Form line, and before that line: "An import statement corroborates an imports arrow", "No import fact is never read as no import", "Import facts that cannot be read leave the arrow Unknown".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D5 states: in the operator-agent mode, a page drawing an `imports` edge that version 1 left `unknown` (`no-witness-rule`) changes that edge's attributes and evidence text where an import fact corroborates it, and its `machine.json` `witness` member; no check record, finding, schema, brief or provider-mode byte moves.
