# T6 S1 Trajectory what-changed amendment

## Patterns

- `R-T6S1-CHANGES-.*\.md`

## What was under review

Trajectory pursuit move T6, slice S1 (`syzygy-t3jk.21`): the "What changed?" answer becomes counted facts per window (day, week, since-last) between two named Dolt revisions, read from the tracker's history by `dolt_log` and `dolt_diff` over id, status and diff-type columns only, pinned to the observed revision; each changed item listed once by kind; the `changed` parameter joins GET /trajectory's closed set; POC-REQ-044 and POC-REQ-042 amended. Delta: `.syzygy/governance/contracts/candidates/three-surface-poc-changes-amendment/SEMANTIC-DELTA.md`.

## Last verdict of record, and where the findings landed

The original `CONFIRM WITH EXCEPTIONS` (`R-T6S1-CHANGES-1-RAW.md:2`) covers `a12e25991`. The follow-up commit and the delta preserve its three should-fix findings and seven notes and record their dispositions.

The later hosted review returned `REVISE` (`R-T6S1-CHANGES-2-HOSTED-RAW.md:1`) over exact PR #979 head `680245038e6f9ea0ef2f044e33779e854d02950a`. Its SHA-256 is `dc4252e5708a9851987fa0ee4487c0160dfec18426d27d472b1f6eb8e40ba436`. The recovery dispositions identify the repaired time predicates and their exact fixtures, the protected-history reassembly, and the current verification requirements.
