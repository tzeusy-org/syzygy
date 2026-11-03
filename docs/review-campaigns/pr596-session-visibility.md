# PR #596 dossier session visibility

## Patterns

- `R-PR596-SESSION-VISIBILITY-\d+-RAW\.md`

## What was under review

Independent fresh-context code reviews of PR #596 (bead `syzygy-mea.3`, with `syzygy-ts8u`), implementing item 1 of `decisions/OWNER-DIRECTION-REDIS-SCREENING-NEXT-2026-11-03.md`: a path-only withheld-source census in the inventory brief and on `check` output, the review-visibility warning on `inventory-check`, and redacted-span provenance and wording. Round 1 reviewed `034b76ec`.

## Last verdict of record, and where the findings landed

Round 1 `R-PR596-SESSION-VISIBILITY-1-RAW.md:2` is REVISE: one revise finding (the waiting/launched `await --submit` path never carries `reviewVisibility`) and eight notes; repairs land on the same PR before a second round.
