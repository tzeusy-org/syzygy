# M8 consent locator and portability

## Patterns

- `syzygy-dov-8-2/M8-CONSENT-LOCATOR-R[12]-RAW\.md`

## What was under review

`syzygy-dov.8.2` implements P-74 M8 slices 1, 3 and 4 under the recorded
2026-10-21 confirmation, and records the synthetic measurement design for
slice 6.

## Last verdict of record, and where the findings landed

`REVISE` (`syzygy-dov-8-2/M8-CONSENT-LOCATOR-R1-RAW.md:1`) identified an
overlap between the observer checkout and the configured target, and a source
route that could still read fresh bytes after a refused re-observation.
`CONFIRM` (`syzygy-dov-8-2/M8-CONSENT-LOCATOR-R2-RAW.md:1`) verified the
two repairs at `a95a5f0c6a9eaed04edd475b67e574881142f619`.
