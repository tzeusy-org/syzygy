# Dossier diagram labels and entry pointer path

## Patterns

- `R-PDJA-8-LABELS.*\.md`

## What was under review

`syzygy-pdja.8`: PR #784, the renderer repairs from the `syzygy-pdja.1` reviews.

## Last verdict of record, and where the findings landed

`REVISE` (`R-PDJA-8-LABELS-1-RAW.md:1`), over `e2813e7d`, with two revise findings: a moved label could read as another line's, and "least distance" had no test. A moved label now draws a leader to its own line, a literal fixture pins the search order, and two comments and a docstring were corrected. Notes 3, 4, 5, 8, 9 and 10 stand and are named in the PR.
