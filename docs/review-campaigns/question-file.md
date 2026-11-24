# Dossier question-file amendment 2.27

## Patterns

- `syzygy-5dhm-21/R-QUESTION-FILE-.*-RAW\.md`

## What was under review

The REQ-polaris-generation-033 amendment gives the run record a question-file binding. Reviews examined its predecessor and proposed bytes, the separation of public regression and blind comparison inputs, and the preserved runtime, provider and run-record behavior.

## Last verdict of record, and where the findings landed

[Observed] Separate reviews bind separate subjects. The original spec review returned `REVISE` (`syzygy-5dhm-21/R-QUESTION-FILE-SPEC-1-RAW.md:2`) on the initial proposal. The hosted review returned `REVISE` on 1f188977656199329d9423857571d4b70981e70d (`syzygy-5dhm-21/R-QUESTION-FILE-HOSTED-R1-RAW.md:1`). It identified the checkout-visible pilot key, the inverse that left the behavior installed, and the protected ledger conflict.

[Observed] The private F1 source review returned `REVISE` on 0a6a28ddbb440e853204fc84988d117d6eff02db (`syzygy-5dhm-21/R-QUESTION-FILE-PRIVATE-R2-RAW.md:1`). Its custody, packet and mount evidence passed. It found a stale task locator for the historical build script. The private follow-up returned `CONFIRM` on 37f1634781397e1680effa29bd52a1ac9643e4fc (`syzygy-5dhm-21/R-QUESTION-FILE-PRIVATE-R3-RAW.md:1`). It independently replayed the delta and confirmed the historical archive and current measurement locator.

The custody correction keeps the public pilot in the historical regression and leaves all three blind Redis lists unwritten. The synthetic role-text and mount controls are bound to the exact product source in `docs/evidence/syzygy-5dhm-21/question-file-custody-controls-2026-11-25.json`. The independent private integration review returned `CONFIRM` on 21f8f3ff3fca770d180122830f5973531b7b4502 (`syzygy-5dhm-21/R-QUESTION-FILE-PRIVATE-R4-RAW.md:1`). It reproduced the complete projected merge tree in both orders, applied the source inverse and independently reconstructed its resulting tree. Its allocation observation belongs to the historical sampled heads.
