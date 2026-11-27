# Design — migration parity bounded by the v12 model (version 2.43)

[Inferred] Version 2.43 of REQ-polaris-generation-034, for syzygy-3efd.87. It was drafted on `agent/syzygy-3efd.87` over the version 2.40 text (`dossier-figure-walks`, row A-271) as 2.41, and is rebuilt over the version 2.42 text (`dossier-test-names`, row A-337, tag `polaris-dossier-test-names-v2.42`), the newest REQ-034 on main.

## D1. The version label and the predecessor

- [Observed] At drafting, 2.38 (migration parity, A-269) is in force on main, 2.39 (import facts, A-270) is in PR #1038 and 2.40 (figure walks, A-271) is on `agent/syzygy-3efd.32`, built on 2.39. This change is built on 2.40 and takes 2.41 and the tag `polaris-dossier-migration-bounds-v2.41`.
- [Observed] Version 2.41 was claimed by this change's first build and never landed; test-name recognizers 2.42 (A-337, PR #1037) reached main over 2.40 first, so this change takes 2.43 and the tag `polaris-dossier-migration-bounds-v2.43`.
- [Observed] The build script (`docs/evidence/syzygy-3efd-87/migration_bounds_build_spec.py`) edits the 2.40 bytes at anchors it asserts occur exactly once: the parity sentence and the sentence ending the migration paragraph (line 142, unchanged since 2.38), and the four Form lines, each extended after its 2.40 sentence. The new scenario precedes the one Form line. If another REQ-034 version lands first, the same script is re-run over it with the predecessor path changed.
- [Observed] The rebuild over 2.42 runs the same script with the predecessor path, the file-head assertions and three Form anchors changed. 2.42 appends one sentence ("For the test-name recognizers, …") to the Observable, Oracle and Falsifier lines, so 2.43's sentence now follows it; the Case line, line 142, line 252 and the place before the Form line are as in 2.40. The spec hashes to `bbc1ab4794a9748de88350b2c7cc9ffbeec5dd6d74231739860789aa724acf02`; REQ-034 goes from 297 to 298 scenarios.

## D2. Narrow the claim, keep the bounds

- [Observed] The defect, found by review R37 F2 of the syzygy-3efd.37 code (the bead's account; the probe was the reviewer's, not re-run here):
  - the parity sentence (2.24, narrowed by 2.38) says check passes the migration of every v10 or v11 draft that check passes;
  - the v12 model (2.24, line 134) holds "zero to 200 elements and zero to 400 relationships";
  - a v11 draft of 222 nodes across six graphs passes check, and its migration fails with `$.model.elements: must hold 0 to 200 items; holds 222`.
- [Observed] Why both hold: the v10 and v11 schemas and checks bound each diagram and not the draft. `packages/polaris-dossier/src/draft-schema.ts` admits up to 20 diagrams (`diagrams: list(diagram, 0, 20)`) and a graph of 1 to 40 nodes and 1 to 80 edges. A containment's 40-group total is a check finding (2.23, line 120: "depth and the total are the findings below alone"), not a schema-document bound. So a draft check passes may hold up to 800 nodes and groups and 1,600 edges.
- [Inferred] The arithmetic of the migration, from line 142: each node and each group becomes one element, each edge one relationship, and a nesting becomes the element's `parent`, not a relationship. Every identity of a v10 or v11 draft is unique, so the merge by identity joins nothing. So the migrated model holds exactly (nodes + groups) elements and (edges) relationships, and fits the v12 bounds exactly where those totals are at most 200 and 400. Sequence and swimlane members never enter the model.
- [Inferred] Two repairs were possible.
  - (a) Narrow the parity to drafts whose totals fit, and say what happens to the rest.
  - (b) Raise the v12 model bounds to 800 elements and 1,600 relationships, the per-graph caps times 20 diagrams.
- [Inferred] This change takes (a), as the lead advised. (b) is not clean:
  - it quadruples the one model every v12 to v16 draft carries, not only migrated ones, so every new draft gains the larger budget;
  - it changes the schema documents of v12 and every later schema, and so their bytes and the drafts' schema digests;
  - every size argument that leans on the model bounds would have to be re-measured.
  The per-graph caps were never meant to sum to a model, so their product is no natural bound.
- [Inferred] Under (a), nothing is lost. The migration still yields the over-bound draft, and check refuses it with the `schema` finding at `$.model.elements` or `$.model.relationships`, the finding any v12 draft past those bounds draws. The author then sees what to cut. The sentence closing the migration paragraph already states no parity for a draft check does not pass; this case is the reverse, a draft check passes whose migration it refuses, so it needs its own sentence.

## D3. Scenario

- [Inferred] One scenario, "A migrated model past the v12 bounds keeps no parity". It states the reviewer's case (six graphs, 222 nodes; 37 per graph is one layout of it) and the two edges of the bound: 200 nodes and groups with 400 edges keeps parity, and 401 edges draws the finding at `$.model.relationships`.
- [Inferred] The Form lines name the fixtures, what is observed, the hand-counted oracle and the falsifier for 2.43.

## D3a. The parity is over the migrated value (review finding 1)

- [Inferred] The migration adds members: `model`, a `view` per graph or containment diagram, each element's `type`, and a nested group's `parent`. So a migrated draft is larger than its source, and one written to a file may pass the draft's read bound (4,194,304 bytes, version 2.14) or its 500,000 values, which check refuses before any finding.
- [Inferred] The parity is a claim about the rules, so it is stated over the value the migration returns: check derives findings from it as from a draft it has read. The migration states no serialization, and no parity is stated for a file past the read bound. The Falsifier says the same.

## D3b. The schema the migration yields (from the code lane)

- [Observed] Versions 2.33 to 2.42 said, in the figure-plan paragraph (line 252 in 2.40), "The migration of version 2.24 is unchanged and yields a schema-v13 draft". The 2.24 migration paragraph (line 142) and the code (`migrateDraft`) yield schema v12.
- [Inferred] This version corrects that one sentence to v12. Line 142 governs, so the correction moves no rule. A sweep of this version's text for "yields a" finds no other schema claim about this migration.

## D4. Bytes that move

- [Inferred] None. The migration's output, the v12 bounds, every finding, every rendered byte and every record are unchanged. The version only stops promising what the rules never gave.

## D5. What the code change must do

- [Observed] The bead says the syzygy-3efd.37 code pins the current behaviour in a test labelled with this bead. [Inferred] The code needs no change. The test should assert the `schema` finding on the migrated draft at both bounds, 200 and 201 elements and 400 and 401 relationships. It should state its totals by hand.

## D6. Composition with versions 2.35 to 2.42

- [Inferred] Version 2.43 adds no finding, no detail and no draft-supplied value that reaches a sink, so the 2.35 screening rules are untouched. The finding it names is check's existing `schema` finding, whose detail names a count, not draft text.
- [Inferred] The edits fall on line 142 and on the Form lines.
  - 2.36 (source-example advice), 2.37 (choice floor), 2.39 (import facts) and 2.40 (figure walks) do not touch line 142.
  - 2.38 narrowed the same parity sentence for withheld-end edges. 2.43 narrows who the sentence covers, at its opening words, and leaves 2.38's exception intact. A draft must fit the bounds to keep the parity, and then the withheld-end exception still applies.
  - 2.40's walks are a v16 member, and a migration yields only v12 drafts, so no walk is involved.
  - 2.42 (test-name recognizers) reads test files at render into a member of its own and touches no figure, migration or model; its only shared lines are the Form lines, which 2.43 extends after 2.42's sentences.

## Review

[Observed] Review 1, `docs/reviews/syzygy-3efd-87/R-MIGRATION-BOUNDS-SPEC-1-RAW.md`, records `REVISE` (line 2) over spec sha256 `87d64cdd7ded843aed556c1749f280079e9428221589f52daec6033524748e93` at commit `617a1081b`, with one blocking finding (1) and five notes (2 to 6). The repaired spec hashes to `64869dc96bf377b6d085bb646e0873606e631adb42084eb8723caa3f82e30b4c`; no review has read the repairs.

| Finding | Kind | Disposition |
|---|---|---|
| 1. Migration grows the draft past the read bounds | Blocking | Repaired: the parity is stated over the value the migration returns, and the read bound's case is named with no parity for it; the Falsifier matches (D3a) |
| 2. Scenario lacks a 201-element case and a containment | Note | Repaired: the 200/400 draft holds a 40-group containment (35 nested groups carry `parent`, no relationship for a nesting); 201 nodes and groups with 400 edges and 200 with 401 edges each draw exactly one finding |
| 3. "schema documents admit … 800" | Note | Repaired: "a draft check passes may hold up to 800 nodes and groups and 1,600 edges"; D2 likewise |
| 4. `d` reused outside its binding | Note | Repaired: the passage opens "For a draft of schema v10 or v11 that check passes" and says "its" |
| 5. SEMANTIC-DELTA counts lines, lists items | Note | Repaired in `migration_bounds_delta.py`: it states the lines and the items separately |
| 6. The .37 test does not assert the migrated boundaries | Note (code) | No spec change; the follow-up is on syzygy-3efd.37 (D5) |

[Observed] Also folded in: the v13 wording of line 252 (D3b), reported by the code lane, which no review has read.
