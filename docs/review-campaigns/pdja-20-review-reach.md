# Polaris dossier check: blocks no review can confirm

## Patterns

- `R-PDJA-20-.*\.md`

## What was under review

`syzygy-pdja.20` (PR #802): `syzygy dossier check` reports `reviewReach`, the claim blocks whose cited spans the fidelity review is never given (`withheld-item` and `unconfirmable`), counted, on the report only; the authoring brief (v5) states the rule and the launched author prompt warns before a repair cycle is spent.

## Last verdict of record, and where the findings landed

`CONFIRM WITH EXCEPTIONS` (`R-PDJA-20-REVIEW-REACH-1-RAW.md:4`), over `f29203c1`, one round under the owner's rule for this epic (land unless blocking; other findings to a bead). Five notes, none blocking or revise. Findings 1 (an absent path listed as a withheld item), 2 (the brief rule's "A block" made "An Inferred block") and 3 (the report note now covers a withheld item that quotes a withheld span) are fixed in the commit after this one. Finding 4 (understanding items and diagram nodes and edges not listed) is carried to `syzygy-pdja.24`. Finding 5 (the commit message orders the class gate last) is fixed in the PR body, since the commit cannot be repaired.
