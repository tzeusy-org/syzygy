# Dossier diagram labels and entry pointer path

## Patterns

- `R-PDJA-8-LABELS.*\.md`

## What was under review

`syzygy-pdja.8`: PR #784, the renderer repairs from the `syzygy-pdja.1` reviews.

## Last verdict of record, and where the findings landed

`REVISE` (`R-PDJA-8-LABELS-3-RAW.md:1`), over `f65fe8b2`, with two revise findings: a label on another line could draw no leader because its run started at the label's centre, and a leader could end on a stretch shared with another line. Rounds 1 and 2 were also `REVISE`. The branch carries an unreviewed repair of both; no further round is dispatched without the owner.
