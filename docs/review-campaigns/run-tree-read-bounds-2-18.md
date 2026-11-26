# Dossier run-tree read bounds 2.18

## Patterns

- `syzygy-3efd-80/R-RUN-TREE-READ-BOUNDS-SPEC-.*-RAW\.md`
- `syzygy-3efd-80/R-RUN-TREE-READ-BOUNDS-IMPLEMENTATION-.*-RAW\.md`
- `syzygy-3efd-80/R80-IMPL-REVIEW-RAW\.md`
- `syzygy-3efd-83/R83-REVIEW-RAW\.md`

## What was under review

[Observed] The first draft of the candidate MODIFIED REQ-polaris-generation-033, -035 and -048 in `openspec/changes/dossier-run-tree-read-bounds/` (the reader rule of REQ-034 version 2.10 extended to the run-tree files of those three requirements, syzygy-3efd.80), bound by the spec digest in the raw's head. The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Review 1 records `REVISE` (`syzygy-3efd-80/R-RUN-TREE-READ-BOUNDS-SPEC-1-RAW.md:3`) with ten findings, one blocking (finding 1). All ten were repaired in the spec and the package's files (section "Review" of the package's `design.md` gives each disposition); none was overruled and no confirmation round was run (one non-gating review under D10).

[Observed] The implementation review at `dc042d71` returned `REVISE` with three findings. The [recheck at `9a925651`](../reviews/syzygy-3efd-80/R-RUN-TREE-READ-BOUNDS-IMPLEMENTATION-2-RAW.md) returned `CONFIRM` after verifying the repairs. The [delivery checklist](../../openspec/changes/dossier-run-tree-read-bounds/tasks.md) records the review and test evidence.

[Observed] A second, fresh-context implementation review of `c74488a4` returned `NOT READY` (`syzygy-3efd-80/R80-IMPL-REVIEW-RAW.md:7`) with one blocking finding (the design packet's page past what remains of the site's bound was untested) and nine notes. All were repaired in `0673e8c2`, the mutation run was repeated there (65 of 65 killed, `docs/evidence/syzygy-3efd-80/run-tree-bounds-mutation-2026-11-24-r2.json`), and no confirmation round was run (D10).

[Observed] The follow-on implementation (syzygy-3efd.83, finding 3 of review 1: the clone refs, launch refs and `verify --text` read by the 2.10 reader rule under code-stated bounds) was reviewed fresh at `3df966be`: `READY WITH NOTES` (`syzygy-3efd-83/R83-REVIEW-RAW.md:3`), no blocking finding and six notes. Notes 1 to 3 were repaired in `d49aa678` with a literal test and a mutant each (growth within the launch limit refused again, a link loop read by a following reader keeps the open's ELOOP, packed-refs removed after the existence look is absent); note 4 is recorded as pre-existing in the sweep (`docs/evidence/syzygy-3efd-83/unbounded-read-sweep-2026-11-24.json`), note 5 by a class legend there, and note 6 in the PR body. The mutation run at `c0598197` killed 29 of 29 (`docs/evidence/syzygy-3efd-83/clone-ref-bounds-mutation-2026-11-24-r2.json`); no confirmation round was run (D10).
