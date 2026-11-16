# Redis v4 re-measure refusal record

## Patterns

- `R-PR491-REDIS-REMEASURE-\d+-RAW\.md`

## What was under review

Review of PR #491 (`syzygy-skpn`): the re-measure script that stops at `openRun`'s deadline refusal and reads no body, and its refusal-and-withdrawal evidence record; implementation and evidence, binds nothing. Round 1 reviewed the first measurement, which was then withdrawn; its raw quotes that measurement's figures verbatim (CC-REV-6) and they are not evidence.

## Last verdict of record, and where the findings landed

Round 1 `REVISE` (`R-PR491-REDIS-REMEASURE-1-RAW.md:74`) over `8f0a558d`: the measurement was withdrawn and the script made fail-closed. Round 2 `CONFIRM WITH EXCEPTIONS` (`R-PR491-REDIS-REMEASURE-2-RAW.md:3`) over `b1cbc101`: one Medium exception (a withdrawn-figure commit message, answered in the PR body), two Low (no selftest or mutant for the gate branch; the root override), the rest Pass. Round 3 `CONFIRM WITH EXCEPTIONS` (`R-PR491-REDIS-REMEASURE-3-RAW.md:3`) over `791800a7`: the three round-2 exceptions repaired, notes only (two caller-site lines on the gate path unmutated; the pre-rebase commit ids in the record resolve only in the owner's object store, explained in the PR body; the round-2 raw quotes some withdrawn figures). The raws name pre-rebase commit ids; the ids in this PR now are mapped in its body.
