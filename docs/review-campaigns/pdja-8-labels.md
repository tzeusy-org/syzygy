# Dossier diagram labels and entry pointer path

## Patterns

- `R-PDJA-8-LABELS.*\.md`

## What was under review

`syzygy-pdja.8`: PR #784, the renderer repairs from the `syzygy-pdja.1` reviews.

## Last verdict of record, and where the findings landed

`REVISE` (`R-PDJA-8-LABELS-2-RAW.md:1`), over `49e36777`, with three revise findings: a leader often ran under the label that had displaced it, its "own line" had no test, and the search test claimed more than it pinned. A leader now ends at the nearest point of its own line it can see, along a run clear of other labels and nodes, or is not drawn; tests pin its end and the search's step and order. Round 1 was also `REVISE`; its notes and these stand in the PR.
