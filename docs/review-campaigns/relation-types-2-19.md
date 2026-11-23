# Dossier relation types 2.19

## Patterns

- `syzygy-3efd-28/R-RELATION-TYPES-SPEC-.*-RAW\.md`
- `syzygy-3efd-28/R-RELATION-TYPES-RUNTIME-.*-RAW\.md`

## What was under review

[Observed] The first draft of the candidate MODIFIED REQ-polaris-generation-034 in `openspec/changes/dossier-relation-types/` (draft schema v9 with a relation type on every graph arrow and an optional unit on a node, rule `relation-witness` version 1, the `unit-reference` and `relation-challenged` findings, brief v15; syzygy-3efd.28), then numbered 2.18 and since renumbered 2.19, built on page subsections 2.16 and bound by the spec digest in the raw's head. The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Review 1 records `REVISE` (`syzygy-3efd-28/R-RELATION-TYPES-SPEC-1-RAW.md:3`) with two blocking findings (F1, F2) and six notes (N1 to N6). Every one was repaired or recorded in the spec and the package's files (section "Review" of the package's `design.md` gives each disposition); none was overruled and no confirmation round was run (one non-gating review under D10).

[Observed] Runtime review 1 records `REVISE` (`syzygy-3efd-28/R-RELATION-TYPES-RUNTIME-1-RAW.md`). The package's design records the fixes for F1 and N1. The two focused regression cases failed on the reviewed source and passed after the fixes.

[Observed] Runtime review 2 records `ACCEPT` (`syzygy-3efd-28/R-RELATION-TYPES-RUNTIME-2-RAW.md`) at `89158c02`. It confirms F1 and N1 and retains a separate note about generic claims when an SVG is refused.
