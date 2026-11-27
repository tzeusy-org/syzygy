# Version 2.41 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-87/migration_bounds_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). It narrows a claim; it changes no rule, bound, schema, brief, finding or byte. Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-figure-walks/proposed/polaris-generation/spec.md` (dossier figure walks version 2.40, row A-271, tag `polaris-dossier-figure-walks-v2.40`; sha256 `ea18e7d7c1c6281929a974b1e6d0cd7cf935c06851b22efa4e4c167595da75cf`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-migration-bounds/proposed/polaris-generation/spec.md`, sha256 `64869dc96bf377b6d085bb646e0873606e631adb42084eb8723caa3f82e30b4c`) replaces that text, composed after version 2.40. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.40's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 2009 lines, 2003 appear byte for byte and in order in the new text; 6 lines are amended in place and none is removed. Below, each edit is one item, so a line edited in several places gives several items (8 items over 6 lines). All 291 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-87/migration_bounds_build_spec.py`, which reproduces the spec byte for byte).

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.41. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…schema v10 or v11 that check": displaced "passes,"; now "passes and whose migrated model fits the bounds of the v12 model,".
- After "…check passes, check passes the migrated": displaced "draft;"; now "draft, taken as the value the migration returns;".
- After "…and a `view-shape` finding once migrated).": inserted "For a draft of schema v10 or v11 that check passes, the migrated model's elements are its graph nodes and containment groups and its relationships are its graph edges, one for one: every identity of such a draft is unique, so the merge by identity joins none, and a nesting becomes an element's `parent`, never a relationship. So its migrated model fits the bounds of the v12 model exactly where its graph nodes and containment groups number at most 200 in all, across every diagram, and its graph edges at most 400 in all. The v10 and v11 schemas and checks bound each diagram and not the draft (up to 20 diagrams, a graph of up to 40 nodes and 80 edges, a containment of up to 40 groups), so a draft check passes may hold up to 800 nodes and groups and 1,600 edges. A draft check passes whose nodes and groups number more than 200 in all, or whose edges more than 400, migrates to a draft that check refuses with a `schema` finding at `$.model.elements` or `$.model.relationships`, as check refuses any v12 draft whose model exceeds those bounds, and no parity is stated for it; the migration itself is unchanged and still yields that draft, and no bound of either schema changes. The parity is stated over the migrated draft as the value the migration returns, check deriving its findings from that value as it derives them from a draft it has read; the migration states no serialization. Because the migration adds members (`model`, a `view` for each graph or containment diagram, each element's `type` and a nested group's `parent`), a migrated draft written to a file may pass the draft's read bound of 4,194,304 bytes (version 2.14) or 500,000 values, which check refuses before it derives any finding, though the draft it was migrated from was within them; no parity is stated for that file.".
- After "…2.24 is unchanged and yields a": displaced "schema-v13"; now "schema-v12".
- After "…v15 and earlier with and without": displaced "`walk`."; now "`walk`; and, for version 2.41, schema-v10 and v11 drafts that check passes whose graph nodes and containment groups number 200 and 201 in all and whose graph edges number 400 and 401 in all, spread over several diagrams, migrated to schema v12.".
- After "…off, and the brief v24 walk": displaced "paragraph."; now "paragraph; for version 2.41, each migrated draft's element and relationship counts and check's findings on it.".
- After "…the figure carrying the node's claim": displaced "carries."; now "carries; for version 2.41, each fixture's node, group and edge totals counted by hand from the fixture, and the expected `schema` finding written before check runs.".
- After "…one at a walk, or any": displaced "byte."; now "byte; for version 2.41, check derives a finding from the migrated value of a draft whose nodes and groups number at most 200 and edges at most 400, or none from that of a draft past either bound, a nesting is counted as a relationship, or the migration yields no draft for it.".

## Added

[Observed] No paragraph. 1 scenario, after the predecessor's last scenario that precedes the Form line, and before that line: "A migrated model past the v12 bounds keeps no parity".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] None. The migration, the v12 model bounds and every finding are unchanged; the version only stops promising parity for a draft whose migrated model exceeds those bounds, which check already refuses (`design.md` D4).
