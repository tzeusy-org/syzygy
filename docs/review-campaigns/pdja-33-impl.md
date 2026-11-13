# Polaris launch-consent v1.2 and source-acquisition entry v1.1, implementation

## Patterns

- `R-PDJA-33-.*\.md`

## What was under review

`syzygy-pdja.33`: the implementation of REQ-polaris-generation-046 and 047 (launch-consent spec v1.2) and registry entry v1.1's ledger items 1b and 3, in slices on `agent/syzygy-pdja-33-impl`, under `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-IMPLEMENTATION-2026-11-12.md`. Slice A narrows the launch reads of the operator's clone to the closed list; slice B adds the copy step.

## Last verdict of record, and where the findings landed

`REVISE` (`R-PDJA-33-SLICE-A-1-RAW.md:4`), over `db109c54`, slice A round 1. Each finding is repaired by its own commit on the same branch:

- Finding 1 (revise), the read oracle saw only `openSync`: the fixtures make every non-admitted file unreadable (mode 000) and the oracle also patches the other read entry points; mutants R1 and R3 recorded killed in `docs/evidence/syzygy-pdja-33/slice-A-repair-mutation-2026-11-13.json`.
- Finding 2 (revise), every remote's HEAD read: `refs/remotes/origin/HEAD` admitted first, the others only when it is absent or not symbolic; the FULL fixture re-pinned.
- Finding 3 (note), the `.git/reftable` probe: dropped; the HEAD placeholder is the detection.
- Finding 4 (note), `--revision HEAD` refused: HEAD admitted as a candidate.
- Finding 5 (note), M10: recorded as surviving with the race unstaged, and killed where the oracle can report a link as a regular file.
- Finding 6 (note), the alternates refusal: wired to `snapshot.alternates` with the copy step in slice B (`fd48132a`).
