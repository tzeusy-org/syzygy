# Source-acquisition sign-off gate moved to v1.1

## Patterns

- `R-PDJA-29-GATE-.*\.md`

## What was under review

`syzygy-pdja.29`, items 1 and 1a of the `public-git-source-acquisition-local-agent-v1-1` impact ledger: the code the signing commit of registry entry v1.1 needs. `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM` moves to the v1.1 record and the tests pinning v1.0 follow. The work is on branch `agent/syzygy-pdja-29-gate-v1-1`, which has no pull request.

## Last verdict of record, and where the findings landed

`CONFIRM WITH EXCEPTIONS` (`R-PDJA-29-GATE-2-RAW.md:4`), over `3e1b215f`, round 2, notes only. Round 1's Finding 1 and Finding 2 are resolved. Its three new notes are not repaired on this branch:
- Finding 1 says every probe refuses as intended. It needs no change.
- Finding 2 says two pin mutants survive. Each one only widens admission to bytes equal to the recorded record, so neither can mask a withdrawal. They are carried to a follow-up bead with the two `it.each` rows the raw names.
- Finding 3 says the mutation record names no test-file digest. It goes to the same follow-up as a successor record.

Round 1 returned `REVISE` (`R-PDJA-29-GATE-1-RAW.md:4`) over `58f890e8`:
- Finding 1 was repaired by pinning the v1.0 record to its SHA-256 and sweeping the slots of every remaining template exemption.
- Finding 2 was repaired by tests that put the v1.0 record at another decisions path.
- Findings 3 and 4 needed no change. The battery's v1.1 `--check` line lands with the signing commit.

The rule-6 record is `docs/evidence/syzygy-pdja-29/gate-v1-1-r1-repair-mutation-2026-11-11.json`.
