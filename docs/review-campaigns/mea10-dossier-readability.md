# Dossier readability: theme, citations, inline code, guidance

## Patterns

- `R-MEA10-.*-RAW\.md`

## What was under review

PR #732 (`syzygy-mea.10.1`, `syzygy-mea.10.2`) and its stacked successor (`syzygy-mea.10.4`): operator-agent dossier pages after the owner's feedback on the Redis run-3 dossier (soft dark theme with callouts, numbered citations, inline code, diagram-led sections, newcomer readability guidance); implementation against the signed DESIGN-ACCEPTANCE bar, binds nothing

## Last verdict of record, and where the findings landed

First review of `9070f7a0` is `REVISE` (`R-MEA10-RENDER-READABILITY-9070-1-RAW.md:2`). Its blocking P1 (table cells kept the shared dark background under the light variant) and notes P2 (two light-variant colours under AA), P3 (focus ring equal to a claim colour) and P6 (no scanner test for `data-source-id`) were repaired in the next commit; P4 (no visible per-page source key; the path is in the link's accessible name and title) and P6's note on backticks leaving `claim.text` stay on record; P5 and P7 confirmed criteria 1 and 3.
