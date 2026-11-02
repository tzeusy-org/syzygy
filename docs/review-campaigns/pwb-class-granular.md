# PWB class-granular extraction gate

## Patterns

- `R-PWB-CLASS-GRANULAR-EXTRACTION-.*\.md`

## What was under review

Class-granular extraction PWB-REQ-002 amendment candidate (P-82 (A), M15), `syzygy-dov.15.1` then `syzygy-418x` (binds nothing)

## Last verdict of record, and where the findings landed

Round 1 `REVISE` (`R-PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-1-RAW.md:4`) over the bytes at `14db1a9`: three revise findings and seven notes; findings 1–9 repaired and finding 10 changing nothing, in the package's `ROUND-1-DISPOSITIONS.md`. Round 2 `REVISE` (`R-PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-2-RAW.md:4`) over the repaired bytes at `1701c88`: one revise finding and seven notes, all open in `ROUND-2-DISPOSITIONS.md`. On the owner's 2026-10-14 direction (`decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2026-10-14.md`) they were repaired once. Round 3 `REVISE` (`R-PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-3-RAW.md:4`) over the repaired bytes at `00e24fd`: one revise finding and four notes, all open in `ROUND-3-DISPOSITIONS.md`. The bytes are not cleared and the package is not edited *(marked 2026-10-14, later the same day: superseded; on the owner's second-cycle direction (`decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2-2026-10-14.md`) the round-3 findings were repaired once)*. Round 4 `CONFIRM WITH EXCEPTIONS` (`R-PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-4-RAW.md:4`) over the repaired bytes at `c88a621`: four notes, none revise, which clears the manifest under the notes-only rule. The notes are dispositioned, open, in the sibling `ROUND-4-DISPOSITIONS.md`; the package is not edited. Register row P-86. Implementation review 1 (PR #568, `syzygy-dov.15.2`) `REVISE` (`R-PWB-CLASS-GRANULAR-EXTRACTION-IMPL-1-RAW.md:4`) over the rebased head `b9a8897f`: two revise findings (F1 reason word, F2 whole-file scan fallback) as PR threads, two notes for follow-up. Implementation review 2 `REVISE` (`R-PWB-CLASS-GRANULAR-EXTRACTION-IMPL-2-RAW.md:4`) over `a61e18d1`: F1 and F2 closed; one revise finding (R2-F1, the unenumerated-heading count is unpinned: three miscount mutants survive) as a PR thread. Implementation review 3 `CONFIRM WITH EXCEPTIONS` (`R-PWB-CLASS-GRANULAR-EXTRACTION-IMPL-3-RAW.md:4`) over `c658d454`: R2-F1 closed (the count is pinned per source and summed per class; the three named mutants and 11 more killed on a re-run), two notes, none revise.
