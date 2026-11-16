# Launched-run gate refusals and the loop's check reads

## Patterns

- `R-PR722-LAUNCH-GATES-.*-RAW\.md`

## What was under review

PR #722 (`syzygy-1z8m.6`): the `syzygy polaris` launched-run prototype's repairs of R-PR718-LAUNCH-NOTES-A44D-2 P1 (the inventory session retried gate refusals it cannot repair) and P2 (the loop's check-record reads untested); implementation under the one-command run direction, binds nothing

## Last verdict of record, and where the findings landed

The review of `052f2365` is `CONFIRM WITH EXCEPTIONS` (`R-PR722-LAUNCH-GATES-052F-1-RAW.md:2`), with no blocking finding; it found both notes repaired. Its residual notes are accepted as recorded, not filed: P1 (rare unrepairable refusals, such as a missing brief record or a superseded inventory session, still read as "repair and try again"; no check record is written and the supervisor still ends the run) and P2 (the argument order of the one `limitStop` call is reachable only by a loop-level test). By the stopping rule no second round was dispatched. The raw is the reviewing subagent's final message, taken from its transcript.
