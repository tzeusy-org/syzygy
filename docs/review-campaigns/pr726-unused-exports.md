# Unused-export check script

## Patterns

- `R-UNUSED-EXPORTS(-.*)?-RAW\.md`

## What was under review

PR #726 (`syzygy-bpyt.4.9`): `scripts/check_unused_exports.mjs`, a TypeScript-compiler-API census of dead, self-only and uncommented test-only exports, with a `--selftest` of 22 fixture expectations and 15 mutants; not wired into CI, binds nothing

## Last verdict of record, and where the findings landed

Review of head `a7f2991b` is `REVISE` (`R-UNUSED-EXPORTS-RAW.md:2`): subpath modules listed in a package `exports` map are skipped as users, so 18 of the 29 reported dead exports are used (F1), and ten predicates can be mutated without failing the selftest (F2), with two notes on re-export-only exports (F3) and the file count (F4).

Review of head `fe6a1919` is `CONFIRM WITH EXCEPTIONS` (`R-UNUSED-EXPORTS-2-RAW.md:2`): the 11 dead findings and five self-only were hand-checked, the removed guards are redundant, and CI is green; one exception, the `SEAM` regex mutated to `/Test/` survives the fixtures (F1).
