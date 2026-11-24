# Dossier relation types 2.19

## Patterns

- `syzygy-3efd-28/R-RELATION-TYPES-SPEC-.*-RAW\.md`
- `syzygy-3efd-28/R-RELATION-TYPES-RUNTIME-.*-RAW\.md`
- `syzygy-3efd-28/R28-IMPL-REVIEW-RAW\.md`

## What was under review

[Observed] The first draft of the candidate MODIFIED REQ-polaris-generation-034 in `openspec/changes/dossier-relation-types/` (draft schema v9 with a relation type on every graph arrow and an optional unit on a node, rule `relation-witness` version 1, the `unit-reference` and `relation-challenged` findings, brief v15; syzygy-3efd.28), then numbered 2.18 and since renumbered 2.19, built on page subsections 2.16 and bound by the spec digest in the raw's head. The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Review 1 records `REVISE` (`syzygy-3efd-28/R-RELATION-TYPES-SPEC-1-RAW.md:3`) with two blocking findings (F1, F2) and six notes (N1 to N6). Every one was repaired or recorded in the spec and the package's files (section "Review" of the package's `design.md` gives each disposition); none was overruled and no confirmation round was run (one non-gating review under D10).

[Observed] Runtime review 1 records `REVISE` (`syzygy-3efd-28/R-RELATION-TYPES-RUNTIME-1-RAW.md`). The package's design records the fixes for F1 and N1. The two focused regression cases failed on the reviewed source and passed after the fixes.

[Observed] Runtime review 2 records `ACCEPT` (`syzygy-3efd-28/R-RELATION-TYPES-RUNTIME-2-RAW.md`) at `89158c02`. It confirms F1 and N1 and retains a separate note about generic claims when an SVG is refused.

[Observed] The final source's Rule 6 run caught 75 injected changes by assertions, with eight passing module baselines. The record binds the subject commit, module digests, exact replacements and outcomes. [Mutation record](../evidence/syzygy-3efd-28/relation-types-mutation-2026-11-23.json)

[Observed] A separate implementation review of the worker branch at `cccac263` records `NOT READY` (`syzygy-3efd-28/R28-IMPL-REVIEW-RAW.md:5`) with one blocking finding and four notes; it read bytes #919 later carried with fixes of its own. Its blocking finding 1 (a malformed unit's `schema` finding below the node's `unit`) and notes 2 (`contains` coverage reading the hidden-path test), 3 (one named withheld-edge predicate) and 5 (`LocalEdgeRelation` as a union) still stood on `main` at `3266b734` and are repaired on `agent/syzygy-3efd.28-r28`; note 4 concerned a report's count, not the code.
