# Restart drain race and authority-sweep timeout

## Patterns

- `R-FLAKY-EXJ7-.*-RAW\.md`

## What was under review

PR #719 (`syzygy-exj7`, folding `syzygy-ijij`): the `restart.test.ts` drain returning while a fixture process was still exiting, with a new deterministic test, and a 25 s timeout on the PWB-REQ-014 field sweep in `polaris-authority-sweep.test.ts`; test-only changes, binds nothing

## Last verdict of record, and where the findings landed

Review of head `6b7cbcf2` is `CONFIRM` (`R-FLAKY-EXJ7-RAW.md:2`), with three low notes and no blocking finding: the evidence record names the base commit but not the fixed tree (N1), the restart race reproduces only under an amplified harness (N2) and the new test pins exact scan and read counts (N3).
