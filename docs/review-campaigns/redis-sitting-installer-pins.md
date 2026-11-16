# Redis sitting installer pins

## Patterns

- `R-REDIS-SITTING-INSTALLER-PINS-.*\.md`

## What was under review

Pre-merge review of the sitting installer's tree-conditional real-tree pins, its gate sweep and P-104 resolved in place, `scripts/install_redis_local_agent_sitting.py` (PR #395, `syzygy-s6xo`); implementation, binds nothing

## Last verdict of record, and where the findings landed

Round 1 `CONFIRM WITH EXCEPTIONS` (`R-REDIS-SITTING-INSTALLER-PINS-1-RAW.md:2`) over `24a7ea0f`: no revise findings and six notes, which clears the bytes. #395 merged with the rebase, a test-only timeout and this raw's retention as lead dispositions. Notes 1–3 and 5 (a future act instant refused only after recording; a misleading "stashed" message on a second run; the open P-104 row matched by prefix; overlay digests and flaked-test names missing from rehearsal records) go to `syzygy-tkki`. Notes 4 and 6 need no code change
