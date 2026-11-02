# Local agent CLI subprocess runner

## Patterns

- `R-DOSSIER-CLI-SUBPROCESS-.*\.md`

## What was under review

Candidate REQ-polaris-generation-045 in `contracts/candidates/dossier-local-cli-subprocess-runner/SEMANTIC-DELTA.md`, read with the owner direction `decisions/OWNER-DIRECTION-DOSSIER-LOCAL-CLI-SUBPROCESS-2026-10-15.md` (P-111); egress and trust boundary; binds nothing

## Last verdict of record, and where the findings landed

Round 1 `REVISE` (`R-DOSSIER-CLI-SUBPROCESS-1-RAW.md:4`) over `113fe505`: four revise findings (the provider undeclared and the environment unlisted; a no-client falsifier blind to hand-rolled clients; the clone not treated as a settings and instruction source; content-class coverage neither enforced nor disclosed) and seven notes. All eleven repaired once, mapped in the package's `ROUND-1-DISPOSITIONS.md`. Round 2 `REVISE` (`R-DOSSIER-CLI-SUBPROCESS-2-RAW.md:4`) over `b386b433`: 10 of the 11 round-1 findings closed; one new revise finding (administrator-managed settings could still redirect the provider, the remainder of round-1 finding 1) and five notes. Classified in `ROUND-2-DISPOSITIONS.md`, then repaired once on the lead's decision (`ROUND-2-REPAIRS.md`). Round 3 `REVISE` (`R-DOSSIER-CLI-SUBPROCESS-3-RAW.md:4`) over `d0f776d8`: the five repairable round-2 findings are closed; one new revise finding (the declared credential variable is not checked to be authentication-only) and three notes. Classified in `ROUND-3-DISPOSITIONS.md`, then repaired once in a final cycle (`ROUND-3-REPAIRS.md`). Round 4 `REVISE` (`R-DOSSIER-CLI-SUBPROCESS-4-RAW.md:4`) over `7a6ef22c`: round-3 findings 1 and 3 closed, 2 partly; one new revise finding (the bar on provider-selecting options lost its SHALL) and four notes. Classified in `ROUND-4-DISPOSITIONS.md`; on the owner's repair-and-disclose direction it was repaired once, with Q2 set to disclose (`ROUND-4-REPAIRS.md`). Round 5 `CONFIRM WITH EXCEPTIONS` (`R-DOSSIER-CLI-SUBPROCESS-5-RAW.md:4`) over `3fd18377`: 0 revise and 5 notes, recorded in `ROUND-5-NOTES.md` for the fold-in; cleared; Q1 owner-ready (P-111)
