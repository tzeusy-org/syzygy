# T6 S1 Trajectory what-changed amendment

## Patterns

- `R-T6S1-CHANGES-.*\.md`

## What was under review

Trajectory pursuit move T6, slice S1 (`syzygy-t3jk.21`): the "What changed?" answer becomes counted facts per window (day, week, since-last) between two named Dolt revisions, read from the tracker's history by `dolt_log` and `dolt_diff` over id, status and diff-type columns only, pinned to the observed revision; each changed item listed once by kind; the `changed` parameter joins GET /trajectory's closed set; POC-REQ-044 and POC-REQ-042 amended. Delta: `.syzygy/governance/contracts/candidates/three-surface-poc-changes-amendment/SEMANTIC-DELTA.md`.

## Last verdict of record, and where the findings landed

Round 1 `CONFIRM WITH EXCEPTIONS` (`R-T6S1-CHANGES-1-RAW.md:2`) over commit `a12e25991`: three should-fix and seven notes, repaired or answered once in the following commit and dispositioned in the delta's §"Dispositions". One review, not gating; no confirmation round.
