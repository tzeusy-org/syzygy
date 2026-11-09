# Polaris dossier P3 notes: RS-13 narrowing, unstroked arrowhead, withheld elements

## Patterns

- `R-PDJA-P3-NOTES-.*\.md`

## What was under review

`syzygy-pdja.18`, `syzygy-pdja.16` and `syzygy-pdja.24` (PR #805), all advice or rendering only:
- `syzygy-pdja.18`: R-PDJA-17-STANDARDS-1 notes 1, 2, 4, 5 and 6. These cover the carried standards' digest subject, the narrowed RS-13 heuristics, the `cli.ts` comment, the mutation-record digests, and the tests showing that inventory-check and parse-fault drafts get no advice.
- `syzygy-pdja.16`: the dossier theme no longer strokes the arrowhead marker, and a test pins the leader end margin's upper bound.
- `syzygy-pdja.24`: `reviewReach` lists understanding items and diagram nodes and edges that are withheld items.

## Last verdict of record, and where the findings landed

`CONFIRM WITH EXCEPTIONS` (`R-PDJA-P3-NOTES-1-RAW.md:4`), over `508832e0`. This was one round under the owner's rule for this epic: land unless blocking, and send other findings to a bead. There was one requires-change finding, which was text only, and five notes.
- Finding 2 (requires change). The `drop-base-side` and `heads-by-index` survivors from `R-PDJA-8-LABELS-5-RAW.md:23-24` are now carried as accepted-equivalent mutants. That is recorded in the `carried` section of `docs/evidence/syzygy-pdja-p3-notes/p3-notes-mutants-2026-11-09.json`, in the PR body and in a comment on the `syzygy-pdja.16` bead.
- Finding 1 (RS-13 classes the narrowing no longer flags) is carried to `syzygy-pdja.25` and disclosed in the PR body. The classes are two-part PascalCase type names, single-slash paths, capitalised `.js` files, and camelCase ending in an initialism.
- Finding 5's optional item is also carried to `syzygy-pdja.25`. It concerns a diagram or section whose whole title renders `Withheld item`.
- Findings 3 (the `past` assertion adds no kill), 4 (the marker rule is pinned as a string, and specificity carries the precedence) and 6 (the brief v6 bump is not read by any gate) need no change.
