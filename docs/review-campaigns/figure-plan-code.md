# Dossier figure plan 2.33, code

## Patterns

- `syzygy-3efd-84/R84-CODE-REVIEW-RAW\.md`

## What was under review

[Observed] The code for REQ-polaris-generation-034 version 2.33 (draft schema v14 joining the system model to the worth-knowing mark, the figure plan read by check alone with its `figure-plan` findings, the report-only `figureAdvice` with its three rules, and brief v22; syzygy-3efd.84) on branch `agent/syzygy-3efd.84` at `15440e52c`, diffed against `c68704b74`, against the spec in `openspec/changes/dossier-figure-plan/`. The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Code review 1 records `READY WITH NOTES` (`syzygy-3efd-84/R84-CODE-REVIEW-RAW.md:3`) with no blocking finding: five test gaps (1 to 5) and four notes (6 to 9). Commit `e278bf0ef` adds a test for each of findings 1 to 5 and for finding 7 (through a test seam), renames check's local reader advice and sorts an import (finding 8), and turns the recorded "equivalent" mutant of finding 1 and the reviewer's four survivors into runner mutants. [Mutation runner](../evidence/syzygy-3efd-84/figure_plan_mutation.mjs)

[Observed] Finding 6 (the published `figurePlan` description says "Required." while the member is not in `required`) is consistent with the spec and left as written; finding 9 (the PR text had moved past the reviewed head) is answered by the PR text. No confirmation round was run (one non-gating review under D10).
