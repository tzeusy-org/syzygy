# Finding-detail screening, code

## Patterns

- `syzygy-3efd-93/R93-CODE-REVIEW-RAW\.md`
- `syzygy-3efd-93/R93-CODE-REVIEW-DISPOSITIONS\.md`

## What was under review

[Observed] The code that makes check's finding details name a draft identity only where it is a handle and screens every detail before it is reported or recorded (`finding-names.ts`, the builders in `check-derive.ts`, `system-model.ts`, `containment.ts` and `figure-plan.ts`, and the backstop in `check.ts`; syzygy-3efd.93) on branch `agent/syzygy-3efd.93` at `a696e0a2a`. The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Code review 1 records `REVISE` (`syzygy-3efd-93/R93-CODE-REVIEW-RAW.md:2`) with three blocking findings (1 to 3) and eight notes (4 to 11). Each finding's repair or answer is in [the dispositions](../reviews/syzygy-3efd-93/R93-CODE-REVIEW-DISPOSITIONS.md); the spec delta rides in REQ-034 version 2.56 (syzygy-3efd.94), and the pre-existing leaks of notes 6 and 7 are syzygy-3efd.95, and no confirmation round is run (one non-gating review under D10).
