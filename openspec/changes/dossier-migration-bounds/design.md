# Design — migration parity bounded by the v12 model (version 2.41)

[Inferred] Version 2.41 of REQ-polaris-generation-034, for syzygy-3efd.87. It is drafted on `agent/syzygy-3efd.87` over the version 2.40 text (`dossier-figure-walks`, row A-271, tag `polaris-dossier-figure-walks-v2.40`), the newest REQ-034 version when it was drafted.

## D1. The version label and the predecessor

- [Observed] At drafting, 2.38 (migration parity, A-269) is in force on main, 2.39 (import facts, A-270) is in PR #1038 and 2.40 (figure walks, A-271) is on `agent/syzygy-3efd.32`, built on 2.39. This change is built on 2.40 and takes 2.41 and the tag `polaris-dossier-migration-bounds-v2.41`.
- [Observed] The build script (`docs/evidence/syzygy-3efd-87/migration_bounds_build_spec.py`) edits the 2.40 bytes at anchors it asserts occur exactly once: the parity sentence and the sentence ending the migration paragraph (line 142, unchanged since 2.38), and the four Form lines, each extended after its 2.40 sentence. The new scenario precedes the one Form line. If another REQ-034 version lands first, the same script is re-run over it with the predecessor path changed.

## D2. Narrow the claim, keep the bounds

- [Observed] The defect, found by review R37 F2 of the syzygy-3efd.37 code (the bead's account; the probe was the reviewer's, not re-run here):
  - the parity sentence (2.24, narrowed by 2.38) says check passes the migration of every v10 or v11 draft that check passes;
  - the v12 model (2.24, line 134) holds "zero to 200 elements and zero to 400 relationships";
  - a v11 draft of 222 nodes across six graphs passes check, and its migration fails with `$.model.elements: must hold 0 to 200 items; holds 222`.
- [Observed] Why both hold: the v10 and v11 schema documents bound each diagram and not the draft. `packages/polaris-dossier/src/draft-schema.ts` admits up to 20 diagrams (`diagrams: list(diagram, 0, 20)`), a graph of 1 to 40 nodes and 1 to 80 edges, and (2.23, line 120) a containment of at most 40 groups. So their schema documents admit up to 800 nodes and groups and 1,600 edges in one draft.
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
- [Inferred] The Form lines name the fixtures, what is observed, the hand-counted oracle and the falsifier for 2.41.

## D4. Bytes that move

- [Inferred] None. The migration's output, the v12 bounds, every finding, every rendered byte and every record are unchanged. The version only stops promising what the rules never gave.

## D5. What the code change must do

- [Observed] The bead says the syzygy-3efd.37 code pins the current behaviour in a test labelled with this bead. [Inferred] The code needs no change. The test should assert the `schema` finding on the migrated draft at both bounds, 200 and 201 elements and 400 and 401 relationships. It should state its totals by hand.

## D6. Composition with versions 2.35 to 2.40

- [Inferred] Version 2.41 adds no finding, no detail and no draft-supplied value that reaches a sink, so the 2.35 screening rules are untouched. The finding it names is check's existing `schema` finding, whose detail names a count, not draft text.
- [Inferred] The edits fall on line 142 and on the Form lines.
  - 2.36 (source-example advice), 2.37 (choice floor), 2.39 (import facts) and 2.40 (figure walks) do not touch line 142.
  - 2.38 narrowed the same parity sentence for withheld-end edges. 2.41 narrows who the sentence covers, at its opening words, and leaves 2.38's exception intact. A draft must fit the bounds to keep the parity, and then the withheld-end exception still applies.
  - 2.40's walks are a v16 member, and a migration yields only v12 drafts, so no walk is involved.

## Review

[Observed] No review has read this version. The lead arranges one; this change dispatches none.
