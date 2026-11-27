# syzygy-5dhm.43: the choice floor (REQ-polaris-generation-034 version 2.33)

Evidence for check's advice on a Pole with fewer than three choices or trade-offs on record. The specification is
`openspec/changes/dossier-choice-floor/`.

- `choice_floor_build_spec.py` builds the 2.33 text from the 2.32 text (A-315); `choice_floor_inverse.py` removes the builder's
  additions and compares the result with 2.32, and the 220 predecessor scenario headings with the first 220 of 2.33. It shares the
  builder's literals, so it checks the builder's arithmetic.
- `choice_floor_mutation.mjs` mutates each new predicate (the v13 gate, the Inferred label, both record items, the threshold, a section
  counted once, attribution by cited file, the no-Pole group, excerpt and nested citations, both detail variants and the wiring). Each
  record stores every mutant's `old` and `new` fragment, the commit and the subject digest.
  - `choice-floor-mutation-2026-11-26.json`: 14 mutants, 13 killed; the survivor (any label counted) got a test.
  - `choice-floor-mutation-survivor-2026-11-26.json`: that mutant re-run over the added test, killed.
  - `choice-floor-mutation-repairs-2026-11-26.json`: four mutants for the R-CHOICE-FLOOR-1 repairs (deep dives ignored, a deep dive of
    any Pole counted, the first citation only, nesting ignored), three killed; the survivor got a test.
  - `choice-floor-mutation-repairs-survivor-2026-11-26.json`: that mutant re-run, killed.
- The rebuild as 2.37 over the source-example advice 2.36 (2026-11-27):
  - `choice_floor_build_spec.py` and `choice_floor_inverse.py` now build from and invert to the 2.36 bytes; the two scenarios are appended
    after the last one, and the 263 predecessor scenarios keep their bytes and order.
  - `choice_floor_reconcile_mutation.py` and `choice-floor-reconcile-mutation-2026-11-27.json`: ten mutants of the reconciler and counter
    wiring and of the routes, spec and row they read, each run with `--check` (or the counter) on the delivered tree, ten killed. The
    selftest base is projected before the 2.36 advice, whose effectiveness needs its protected tag, so the selftest's `choice_cases`
    witness only the pending and refused states; these mutants witness the effective one.
- [Observed] The comprehension-regression rule of `CONTRIBUTING.md` applies to the brief, the draft schema and the renderers; this
  change touches none of them, and no rendered byte changes.
