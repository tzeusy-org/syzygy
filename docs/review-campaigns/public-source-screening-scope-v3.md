# Screening scope version 3

## Patterns

- `R-PUBLIC-SOURCE-SCREENING-SCOPE-V3-.*\.md`

## What was under review

Candidate policy successor `contracts/candidates/public-source-screening-scope-v3/` and `scripts/build_public_source_screening_scope_v3.py` (PR #404, `syzygy-wsev`); binds nothing

## Last verdict of record, and where the findings landed

Round 1 `REVISE` (`R-PUBLIC-SOURCE-SCREENING-SCOPE-V3-1-RAW.md:4`) over `897910fc`: two revise findings and four notes. The revise findings: `renderCondition` defined no sink and, read literally, withdrew the exemption from every non-page sink; the bytes lifted the whole base `activeContentClassification`, `renderRule` included. The notes: three CSP readings, `non-web`'s reason, the closable REQ-012 [Unknown], and install omissions found by simulating the act. All are repaired in the same PR. The bytes now define a page sink and route every other place to `egress`, keep `renderRule` binding, and require an enforced, early, exactly-`'none'` CSP; the builder selftest holds 33 of 33. Round 2 `CONFIRM WITH EXCEPTIONS` (`R-PUBLIC-SOURCE-SCREENING-SCOPE-V3-2-RAW.md:4`) over `5db1dd72`: every round-1 finding repaired; three notes, no revise, which clears the package at its manifest under the notes-only rule. The notes are dispositioned in the package's `ROUND-2-DISPOSITIONS.md`: note 1, an install requirement (the Redis sitting installer and simulator know only versions 1 and 2, so they refuse after a version-3 act until taught it); note 2, the parser-defined page residual (XHTML and rendered Markdown fall to `egress`); and note 3, two attribution and wording slips
