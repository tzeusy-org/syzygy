# RS-13 advice classes and the zero-bytes oracle

## Patterns

- `R-PDJA-25-28.*\.md`

## What was under review

`syzygy-pdja.25` and `syzygy-pdja.28`, in PR #814:
- the four RS-13 code-symbol classes in `reader-advice.ts`, with the withheld-title detail in `review-reach.ts`;
- the anchored zero-bytes oracle in `waiting-sessions.test.ts`.

The advice change alters no outcome.

## Last verdict of record, and where the findings landed

Round 1 returned `CONFIRM WITH EXCEPTIONS` (`R-PDJA-25-28-1-RAW.md:4`) over `d316d170`.
- Finding 7 is tagged revise: hosted governance was still pending. It is met by merging only after every hosted check passes.
- Notes 1–6 need no change. Note 3 records advice-only false positives on unlisted brands; note 5 records the Pole-label consequence. Both are dispositioned in the PR body.
