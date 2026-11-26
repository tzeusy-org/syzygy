# Dossier close-measures implementation

## Patterns

- `syzygy-5dhm-25/R-STEP-MEASURES-IMPL-.*-RAW\.md`

## What was under review

[Observed] The implementation of REQ-polaris-generation-033 v2.31 for bead syzygy-5dhm.25 (PR #1005) at commit `54204778eb82fe994a0c79955d480c4491ca9900`: `packages/polaris-dossier/src/step-measures.ts`, the close record's `stepMeasures` member and size fallback in `close.ts`, the status reader change in `status.ts`, their tests, the mutation record under `docs/evidence/syzygy-5dhm-25/` and adoption row A-314. The specification itself was reviewed separately (campaign `dossier-step-measures`).

## Last verdict of record, and where the findings landed

[Observed] Review 1 records `CONFIRM WITH EXCEPTIONS` (`syzygy-5dhm-25/R-STEP-MEASURES-IMPL-1-RAW.md:3`) with two non-blocking test gaps. F1 (an interval or paired round whose ending shares its start instant must measure zero, never Unknown) and F2 (the full measures in compact JSON must win over the capacity Unknown in the formatted form) were repaired with tests in the commit row A-314 names after the implementation; the review's surviving mutants for both, and the paired-round boundary, are killed by them (`docs/evidence/syzygy-5dhm-25/step-measures-review-mutants-2026-11-26.json`). No confirmation round was run (one non-gating review under D10), so no review has read the repaired bytes.
