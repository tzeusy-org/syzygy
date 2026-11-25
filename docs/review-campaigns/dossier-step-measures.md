# Dossier close-measures specification

## Patterns

- `syzygy-5dhm-25/5DHM25-STEP-MEASURES-R[12]-RAW\.md`

## What was under review

The REQ-polaris-generation-033 amendment specifies the bounded close record, the timing and review-round projection and the meaning of Unknown. This delivery carries the specification. Implementation verification remains tracked in syzygy-5dhm.25.

## Last verdict of record, and where the findings landed

[Observed] R1 returned `REVISE` on d41250048efd4448e25da51f972152183ceb4369 (`syzygy-5dhm-25/5DHM25-STEP-MEASURES-R1-RAW.md:3`). Derived measures could push a previously readable close record past the reader ceiling and hide the operator's declaration.

[Observed] R2 returned `CONFIRM` on 9fba199ed978dc5480fbf90a34d30aeecab974d4 (`syzygy-5dhm-25/5DHM25-STEP-MEASURES-R2-RAW.md:3`) for the corrected boundary. The exact 16 MiB full and capacity-limited forms preserve the declared usage. The first excess UTF-8 byte in the limited form requires a typed refusal. The replay used the isolated candidate writer and installed status reader. The protected runtime awaits its own delivery.
