# Screening scope v8 reading code and recorder

## Patterns

- `R-SCREENING-V8-IMPL.*\.md`

## What was under review

`syzygy-pdja.21`: PR #807, the code that reads public-source screening scope version 8 (variant `pv`, `sourceVisibility`) and its dedicated recorder, under part 3 of `OWNER-DIRECTION-LAUNCH-CONSENT-IMPLEMENTATION-2026-11-09.md`. The recorder has not been run.

## Last verdict of record, and where the findings landed

`REVISE` (`R-SCREENING-V8-IMPL-B-1-RAW.md:4`), over `0fb18104`, round 1. Three findings require a change:
- 1: the supervisor fetches a private repository from its host;
- 2: the act-forms-match refusal has no killing test;
- 3: the provider-mode reader's unreadable-`sourceVisibility` refusal has no killing test.

Four notes (4–7). Repairs are tracked on the PR and in `syzygy-pdja.21`.
