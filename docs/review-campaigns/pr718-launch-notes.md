# Launched-run notes: inventory refusals, limit stop and repair messages

## Patterns

- `R-PR718-LAUNCH-NOTES-.*-RAW\.md`

## What was under review

PR #718 (`syzygy-1z8m.5`): the `syzygy polaris` launched-run prototype's follow-ups G1–G4 and F7 from the PR #709 reviews (inventory guidance on refusals, doc comments, quoting of reviewer reasons, a stop when the last revision was refused at the repair limit); implementation under the one-command run direction, binds nothing

## Last verdict of record, and where the findings landed

First review of `39373a2e` is `CONFIRM WITH EXCEPTIONS` (`R-PR718-LAUNCH-NOTES-3937-1-RAW.md`, verdict line in its head), with no blocking finding. Its notes N1 (the loop's limit-stop call sites untested), N2 (the new inventory sentence also stopped repairable refusals) and N3 (one check record read twice) were repaired in the next commit: the stop moved into a pure, tested `limitStop`, the sentence was narrowed to file or digest mismatches, and the duplicate read was removed.
