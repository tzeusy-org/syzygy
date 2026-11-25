# Located quotation views

## Patterns

- `syzygy-fnry-13/FNRY13-LOCATED-QUOTATION-VIEWS-R[0-9]+-RAW\.md`

## What was under review

[Observed] Two independent reviews covered the quotation-display design for syzygy-fnry.13 against A-217 and REQ-polaris-generation-034. The design distinguishes the source-normalised reading text from the original evidence span and uses the same source identity and integrity anchor. [Candidate](../design/dossier-located-quotation-views.md)

## Last verdict of record, and where the findings landed

[Observed] R1 returned `REVISE` on `c910d05f62779f8e75c38b8c2801898427955a13`. It found an inventory presentation gap, incomplete keyboard coverage for Find by task, an ambiguous name-index input and a conflation of two reading measures. [R1 raw review](../reviews/syzygy-fnry-13/FNRY13-LOCATED-QUOTATION-VIEWS-R1-RAW.md)

[Observed] R2 returned `CONFIRM` on `c6063d326849d319ee575b3688b7ff0c9b082ebe`. The revised candidate binds the existing reader surfaces, private inventory, keyboard and accessibility-tree behavior, and the rendered word count separately from the check ledger. A synthetic replay exercised the effect of the source-derived reading text on existing index matching and separated word count, transport bytes and source-fidelity population. [R2 raw review](../reviews/syzygy-fnry-13/FNRY13-LOCATED-QUOTATION-VIEWS-R2-RAW.md)

[Unknown] The original bead still needs an effective specification successor, runtime delivery and the recorded mutation and historical 24-quotation results. This review settled the candidate design.
