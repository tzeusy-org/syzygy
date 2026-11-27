# Dossier containment figure 2.23, code

## Patterns

- `syzygy-3efd-31/R31-CODE-REVIEW-RAW\.md`

## What was under review

[Observed] The code for REQ-polaris-generation-034 version 2.23 (draft schema v11 with the `containment` figure kind, the `containment-depth`, `containment-size` and `containment-flat` findings, nestings decided by rule `relation-witness`, the boxes-within-boxes drawing and its outline; syzygy-3efd.31) on branch `agent/syzygy-3efd.31-code` at `4812826d45d4cbd0624bd32dd1e647b4c301525a`, against the spec in `openspec/changes/dossier-containment-figure/`. The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Code review 1 records `NOT READY` (`syzygy-3efd-31/R31-CODE-REVIEW-RAW.md:3`) with three blocking findings (1 to 3), each a rule with no test shown by a surviving mutant, and five low notes (4 to 8). Commit `31d50bd7` adds a literal test for each blocking finding: a withheld child group's nesting (1), a schema finding at a `children` list gating the structural findings (2), and `containment-size` leaving the nestings undecided (3). The reviewer's three mutants joined the runner, and the re-run at `31d50bd7` killed 64 of 64, each reviewer mutant by its new test. [Mutation record](../evidence/syzygy-3efd-31/containment-mutation-2026-11-28.json)

[Observed] Note 4 (field-version findings move to the structure stage's position as well as changing kind) is stated in the PR text; no code change. Notes 5, 6 and 8 are left as the review allows: 5 follows the spec's literal list-fault gate, 6 stays in the PR's "Not done here", and 8's craft nits change no behaviour. Note 7 (the unknown-version refusal does not name v11, nor v12 once it is known) follows the scope decision that the published schema keeps its bytes; brief v22 or syzygy-3efd.84 closes it. No confirmation round was run (one non-gating review under D10).
