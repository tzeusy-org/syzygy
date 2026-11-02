# Screening v4 span installation

## Patterns

- `R-P110-.*-RAW\.md`

## What was under review

Owner-authorized P-110 span installation corrections for PR #483 (`syzygy-3sjj`); implementation, binds nothing

## Last verdict of record, and where the findings landed

Preliminary parser/core slices `REVISE` (`R-P110-REDACTION-CORE-F16AB18F-1-RAW.md:2`); parser correction `CONFIRM` (`R-P110-EXPLICIT-SELECTION-EFCBB78F-1-RAW.md:2`). Code/security review at `1cdb7480` is `CONFIRM WITH EXCEPTIONS` (`R-P110-CODE-SECURITY-1CDB-1-RAW.md:5`). The final-doc citation regression is retained as `REVISE` (`R-P110-DOC-POLICY-SWEEP-DA08266A-1-RAW.md:5`); aggregate-route correction at `171e036b` is `CONFIRM WITH EXCEPTIONS` (`R-P110-CITATION-CORRECTION-171E-1-RAW.md:6`), with 149 affected tests and seven refusal/control probes. Failed-run disposition, corrected-head limits and mutation subjects are in `docs/evidence/p110-span-install-corrections-2026-10-21.md`; complete clone/CI and final merge attestation remain required after this evidence retention.
