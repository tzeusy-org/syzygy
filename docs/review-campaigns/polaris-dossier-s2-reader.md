# Polaris dossier S2 object reader

## Patterns

- `R-POLARIS-DOSSIER-S2-READER-.*\.md`

## What was under review

In-process pinned Git object reader, `packages/polaris-dossier/src/git-object-reader.ts` (PR #367; implementation, binds nothing)

## Last verdict of record, and where the findings landed

Round 1 `REVISE` (`R-POLARIS-DOSSIER-S2-READER-1-RAW.md:3`) over `3a84d4a4`: five revise findings (untyped refusals, links and special files followed under `objects/`, ambiguous tree names, unbounded work per call, untested refusal predicates) and six notes, repaired in the same PR. Round 2 `REVISE` (`R-POLARIS-DOSSIER-S2-READER-2-RAW.md:3`) over `f3743f51`: two revise findings (padded zlib streams escape the per-call budget; a large subtree's listing overflows a spread) and seven notes, repaired in the same PR with notes 3–7 and 9. Round 3 `APPROVE WITH NOTES` (`R-POLARIS-DOSSIER-S2-READER-3-RAW.md:3`) over `ff481704`, six notes and nothing blocking, which clears the bytes; note 1 (path depth) goes to `syzygy-qkea.20` before S3 reads listed paths
