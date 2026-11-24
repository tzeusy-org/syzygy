# Scenario counter selftest projection

## Patterns

- `syzygy-3efd-82/R82-REVIEW-RAW\.md`

## What was under review

[Observed] The repair of `scripts/count_polaris_effective_scenarios.py --selftest` for syzygy-3efd.82 at `a97ff98b` (fix `3f610a35`, merge base `c8cede97`): its two historical controls, declared source v2.0 and URL declared source v2.1, now project the adoption ledger to their version by removing every later amendment's row, read from the adoption module's row predicates, with the rule-6 record `docs/evidence/syzygy-3efd-82/counter-selftest-mutants-2026-11-24.json`.

## Last verdict of record, and where the findings landed

[Observed] The review records `READY WITH NOTES` (`syzygy-3efd-82/R82-REVIEW-RAW.md:3`) with five notes and no blocking finding.
- Notes 1 and 2 are repaired in `d5501704`: tags and predicates are paired, and each predicate's removal is checked.
- Note 4 is repaired: the first record gains its final newline, and `docs/evidence/syzygy-3efd-82/counter-selftest-mutants-2026-11-24-r2.json` records five mutants at `d5501704` with the control each killed.
- Note 3, wiring the selftest into the battery, is a separate bead.
- Note 5 is answered in the bead's close reason.
- No review has read `d5501704`.
