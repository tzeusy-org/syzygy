# Screening scope v8 reading code and recorder

## Patterns

- `R-SCREENING-V8-IMPL.*\.md`

## What was under review

`syzygy-pdja.21`: PR #807, the code that reads public-source screening scope version 8 (variant `pv`, `sourceVisibility`) and its dedicated recorder, under part 3 of `OWNER-DIRECTION-LAUNCH-CONSENT-IMPLEMENTATION-2026-11-09.md`. The recorder has not been run.

## Last verdict of record, and where the findings landed

`CONFIRM WITH EXCEPTIONS` (`R-SCREENING-V8-IMPL-B-4-RAW.md:4`), over `6f5ef978`, round 4. Round 3's required finding is resolved. Two notes, neither requiring a change:
- 1: two clauses of `instantIsReadable` are equivalent mutants;
- 2: one expected message is interpolated from a literal test parameter.

Earlier rounds:
- round 1 `REVISE` (`R-SCREENING-V8-IMPL-B-1-RAW.md:4`) over `0fb18104`;
- round 2 `REVISE` (`R-SCREENING-V8-IMPL-B-2-RAW.md:4`) over `72528d19`;
- round 3 `REVISE` (`R-SCREENING-V8-IMPL-B-3-RAW.md:4`) over `aa658177`. The owner chose one last round after it.

Dispositions are in the PR body.
