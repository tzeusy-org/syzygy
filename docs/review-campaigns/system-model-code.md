# Dossier system model 2.24, code

## Patterns

- `syzygy-3efd-37/R37-CODE-REVIEW-RAW\.md`

## What was under review

[Observed] The code for REQ-polaris-generation-034 version 2.24 (draft schema v12 with one system model of elements and cited or derived relationships, graph and containment figures as views over it, the model and view findings, the shared-element rule, `machine.json` `model`, a pure migration from schema v10 and v11, and brief v18's paragraph as a pinned constant; syzygy-3efd.37) on branch `agent/syzygy-3efd.37-code` at `db980e4cb`, diffed against slice 1 at `4812826d4`, against the spec in `openspec/changes/dossier-system-model/`. The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Code review 1 records `NOT READY` (`syzygy-3efd-37/R37-CODE-REVIEW-RAW.md:3`) with one blocking finding (1: `view-shape` and `containment-flat` at a view produced by no test) and eight notes (2 to 9) beside an informational section (10). Commit `d4c78ee1f` adds literal tests for finding 1, for finding 3 (v13 keeps its schema findings) and for each scenario and bound of finding 4. It pins finding 2's parity exception with a test labelled with spec bead syzygy-3efd.87, deletes the uncalled `migratedPath` (finding 5), compares the parity members as bytes (finding 7), and moves `LocalModel` above `LocalEdgeRelation`'s docstring (finding 8). The reviewer's three mutants joined the runner. [Mutation record](../evidence/syzygy-3efd-37/system-model-mutation-2026-11-28-r37.json)

[Observed] Findings 6 (the first figure is chosen before drawing, so an inert-render notice would still count as the first) and 9 (a relationship's end check is skipped when any of its members has a schema finding) are stated in the PR text and left in the code. No confirmation round was run (one non-gating review under D10).
