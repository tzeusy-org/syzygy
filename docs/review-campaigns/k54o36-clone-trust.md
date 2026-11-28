# syzygy-k54o.3.6 clone trust

## Patterns

- `R-K54O36-CLONE-TRUST-.*\.md`

## What was under review

`syzygy-k54o.3.6`: each launched session's private Claude Code config trusts the directories it is given by `--add-dir` (the run's clone, for the author and inventory sessions), so Claude Code asks no "Adding a new directory" question.

## Last verdict of record, and where the findings landed

`CONFIRM WITH EXCEPTIONS` (`R-K54O36-CLONE-TRUST-1-RAW.md:2`) over `c7c5646ca`. The pull request body (#1050) records the repair or answer for each finding; the review gates nothing and no confirmation round follows (D10).
