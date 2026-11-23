# Dossier run-tree read bounds 2.18

## Patterns

- `syzygy-3efd-80/R-RUN-TREE-READ-BOUNDS-SPEC-.*-RAW\.md`
- `syzygy-3efd-80/R-RUN-TREE-READ-BOUNDS-IMPLEMENTATION-.*-RAW\.md`

## What was under review

[Observed] The first draft of the candidate MODIFIED REQ-polaris-generation-033, -035 and -048 in `openspec/changes/dossier-run-tree-read-bounds/` (the reader rule of REQ-034 version 2.10 extended to the run-tree files of those three requirements, syzygy-3efd.80), bound by the spec digest in the raw's head. The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Review 1 records `REVISE` (`syzygy-3efd-80/R-RUN-TREE-READ-BOUNDS-SPEC-1-RAW.md:3`) with ten findings, one blocking (finding 1). All ten were repaired in the spec and the package's files (section "Review" of the package's `design.md` gives each disposition); none was overruled and no confirmation round was run (one non-gating review under D10).

[Observed] The implementation review at `dc042d71` returned `REVISE` with three findings. The [recheck at `9a925651`](../reviews/syzygy-3efd-80/R-RUN-TREE-READ-BOUNDS-IMPLEMENTATION-2-RAW.md) returned `CONFIRM` after verifying the repairs. The [delivery checklist](../../openspec/changes/dossier-run-tree-read-bounds/tasks.md) records the review and test evidence.
