# One-command Polaris dossier run

## Patterns

- `R-POLARIS-DOSSIER-ONE-COMMAND-RUN-.*\.md`

## What was under review

The candidate change `openspec/changes/polaris-dossier-one-command-run/` (REQ-polaris-generation-040 to 045, with REQ-045 folded in from the cleared CLI-runner candidate), read with `decisions/POLARIS-DOSSIER-ONE-COMMAND-RUN-DIRECTION.md` and the two 2026-10-15 CLI-runner directions (P-111); egress and trust boundary; binds nothing

## Last verdict of record, and where the findings landed

Round 1 `REVISE` (`R-POLARIS-DOSSIER-ONE-COMMAND-RUN-1-RAW.md:4`) over `8afadc55`: 11 revise findings and 10 notes. The revise findings were a Syzygy-made fetch with no act; stored launch records labelled Observed; incomplete REQ-035 displacements; no tool limit on launched sessions; SEC-3 binding only the brief; non-provider network sends; automatic-approval modes admitted; disagreeing views; and prose drift. All repaired once, in the change's `ROUND-1-REPAIRS.md`. Round 2 `REVISE` (`R-POLARIS-DOSSIER-ONE-COMMAND-RUN-2-RAW.md:4`) over `5f026d9c`: 16 of the 21 round-1 findings closed, 4 partly closed and 1 closed with no change; 7 new revise findings (the Syzygy checkout readable in every view; residual Observed labels in 042 and 045; the tool's own non-provider connections; prose still describing the fetch; the author's missing tool limit not disclosed; resume skipping the binary and version checks; helper start against resume) and 10 notes. Classified and not repaired, in `ROUND-2-DISPOSITIONS.md`; the lane stopped; not cleared (P-111) *(Marked 2026-10-20, resumed lead: the round-2 findings were repaired once by the lead's restrictive source-design choices, recorded in `ROUND-3-REPAIRS.md`; round 3 is `CONFIRM WITH EXCEPTIONS` (`R-POLARIS-DOSSIER-ONE-COMMAND-RUN-3-RAW.md:4`), two notes only. The exact bounded repair clears; notes remain in `ROUND-3-DISPOSITIONS.md`. The full sign-off offering still needs its visible design, impact/coverage/dependency and version-preparation gates; no owner act or implementation is performed.)*
