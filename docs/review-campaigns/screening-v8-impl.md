# Screening scope v8 reading code and recorder

## Patterns

- `R-SCREENING-V8-IMPL.*\.md`

## What was under review

`syzygy-pdja.21`: PR #807, the code that reads public-source screening scope version 8 (variant `pv`, `sourceVisibility`) and its dedicated recorder, under part 3 of `OWNER-DIRECTION-LAUNCH-CONSENT-IMPLEMENTATION-2026-11-09.md`. The recorder has not been run.

## Last verdict of record, and where the findings landed

`REVISE` (`R-SCREENING-V8-IMPL-B-3-RAW.md:4`), over `aa658177`, round 3. Round 2's required finding is resolved. One new finding requires a change:
- 1: a calendar-invalid grant instant rolls over to a real one, so a private record can drop out of the carriers and its pair read public.

Two notes (2–3). Earlier rounds:
- round 1 `REVISE` (`R-SCREENING-V8-IMPL-B-1-RAW.md:4`) over `0fb18104`;
- round 2 `REVISE` (`R-SCREENING-V8-IMPL-B-2-RAW.md:4`) over `72528d19`.

Dispositions are in the PR body. The stopping rule recorded in `syzygy-pdja.21` applies, so the next step is the owner's.
