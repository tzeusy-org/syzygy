# CI concurrency groups (syzygy-9alf)

## Patterns

- `R-CI-CONCURRENCY-\d+-RAW\.md`

## What was under review

PR #577 (`syzygy-9alf`): a `concurrency:` block on `node-ci.yml` and `governance-docs.yml` so a newer `pull_request` head cancels the older run, while `push` and `merge_group` runs get a per-run group and are never cancelled or displaced; CI configuration, binds nothing

## Last verdict of record, and where the findings landed

Round 1 `CONFIRM WITH EXCEPTIONS` (`R-CI-CONCURRENCY-1-RAW.md:2`) over `8dd061ec`, two low notes and no blocking finding. N1 (a manual re-run of an old pull_request run can cancel a newer head's run) is accepted; the `merge_group` isolation has no observed run until the first queued PR after merge.
