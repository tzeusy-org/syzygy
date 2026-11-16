# PWB-REQ-011 verbatim route bounded read

## Patterns

- `R-VERBATIM-BOUNDED-READ.*\.md`

## What was under review

PR #729 (`syzygy-bpyt.6.17`): the verbatim route reads its consented body through `readBoundedBlob`, asking Git the object's size first, with the runner's stdout held to the per-source envelope and Git's stderr captured.

## Last verdict of record, and where the findings landed

`CONFIRM WITH EXCEPTIONS` (`R-VERBATIM-BOUNDED-READ-RAW.md:2`): an evidence-record correction (the forged case is reachable through `refs/replace`) and an owner disclosure of the changed not-rendered reasons, both routed to the PR #729 lane.
