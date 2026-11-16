# Recorder selftest wording

## Patterns

- `R-RECORDER-SELFTEST-WORDING-.*\.md`

## What was under review

Three recorder selftests that asserted Python's own date-error wording

## Last verdict of record, and where the findings landed

`R-RECORDER-SELFTEST-WORDING-1-RAW.md:2` records `Verdict: CONFIRM` with no finding. The
three recorders now refuse a non-date instant in their own words, so the fixtures no
longer depend on the interpreter's text.
