# Screening scope v8 reading code and recorder

## Patterns

- `R-SCREENING-V8-IMPL.*\.md`

## What was under review

`syzygy-pdja.21`: PR #807, the code that reads public-source screening scope version 8 (variant `pv`, `sourceVisibility`) and its dedicated recorder, under part 3 of `OWNER-DIRECTION-LAUNCH-CONSENT-IMPLEMENTATION-2026-11-09.md`. The recorder has not been run.

## Last verdict of record, and where the findings landed

`REVISE` (`R-SCREENING-V8-IMPL-B-2-RAW.md:4`), over `72528d19`, round 2. Round 1's three required findings are resolved. One new finding requires a change:
- 1: an unreadable grant instant refuses only reads of its own pair, where the held text refuses every read.

Two notes (2–3). Round 1: `REVISE` (`R-SCREENING-V8-IMPL-B-1-RAW.md:4`), over `0fb18104`, with dispositions in the PR body. Repairs are tracked on the PR and in `syzygy-pdja.21`.
