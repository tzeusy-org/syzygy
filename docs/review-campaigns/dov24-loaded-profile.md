# P-74 loaded-profile registry gate

## Patterns

- `R-DOV24-.*\.md`

## What was under review

Loaded-profile registry-entry amendment candidate package, `syzygy-dov.24` (PR #123; binds nothing)

## Last verdict of record, and where the findings landed

Round 1 `REVISE` (`R-DOV24-LOADED-PROFILE-AMENDMENT-RAW.md:2`); round 2 `REVISE` (`R-DOV24-LOADED-PROFILE-AMENDMENT-2-RAW.md:2`); round 3 `REVISE` (`R-DOV24-LOADED-PROFILE-AMENDMENT-3-RAW.md:2`), two revise findings (byte-level reformatting outside the permitted hunks; the second heading of a two-heading row unprobed) and five notes. Every finding of all three rounds is dispositioned in the package's owner-decision packet, "Review record", and the repairs landed in the same branch. Round 4 `CONFIRM WITH EXCEPTIONS` (`R-DOV24-LOADED-PROFILE-AMENDMENT-4-RAW.md:2`), notes only (N-A–N-F), clearing the bytes at `1d5966c` under the 2026-09-26 sitting rule; every note routed to `syzygy-dov.32` (`R-DOV24-LOADED-PROFILE-AMENDMENT-4-DISPOSITIONS.md`). On 2026-10-15 the package was rebased over the performed `.18` and behaviour-contract re-pin acts: the builder learned the performed-successor base state and the manifest row was re-minted, so round 4 does not cover the current bytes. Round 5 `REVISE` (`R-DOV24-LOADED-PROFILE-AMENDMENT-5-RAW.md:2`) over `239c098f`: four revise findings, all in prose currency (the delta named the superseded act as the act in force; unmarked stale sentences in the packet and ledger; the tree-framing-first path needs a builder edit, not only `--write`), and four notes. All eight were repaired once on 2026-10-15 (packet "Review record", round 5). Under the stopping rule no round 6 was dispatched, so the bytes are **unconfirmed**. Round 6 `REVISE` (`R-DOV24-LOADED-PROFILE-AMENDMENT-6-RAW.md:2`) over `fa9bc47e`: every round-5 repair resolved; one revise finding (register row P-112 miscounts the packet's open questions) and three notes; classified (`R-DOV24-LOADED-PROFILE-AMENDMENT-6-DISPOSITIONS.md`). Lead disposition the same day: the revise finding was repaired in P-112, outside the package, and the package bytes at `fa9bc47e` are cleared notes-only under the 2026-09-26 rule; the raw's verdict stays `REVISE`
