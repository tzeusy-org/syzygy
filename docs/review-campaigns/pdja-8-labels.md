# Dossier diagram labels and entry pointer path

## Patterns

- `R-PDJA-8-LABELS.*\.md`

## What was under review

`syzygy-pdja.8`: PR #784, the renderer repairs from the `syzygy-pdja.1` reviews.

## Last verdict of record, and where the findings landed

`CONFIRM WITH EXCEPTIONS` (`R-PDJA-8-LABELS-4-RAW.md:1`), over `170b306e`, the round the owner asked for on 2026-11-07 (questionnaire answer 5B: one more round, then land unless a finding is blocking). Round 3's two revise findings are closed. One revise finding, graded not blocking: a leader's end is tested against other lines' centres, not their drawn strokes or arrowheads, so it can still end inside another edge's arrowhead. Three notes: the test pins a weaker bound than the code and leaves parts of the run search unpinned, the leader search costs about ten times round 3's at the schema cap, and the PR body and one test title describe the old end rule. The revise finding and the notes are filed as beads for the owner to dispose of after seeing real diagrams. Rounds 1 to 3 were `REVISE`.
