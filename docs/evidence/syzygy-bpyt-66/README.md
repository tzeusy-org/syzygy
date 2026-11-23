# POC test support and compiler coverage

[Observed] At source commit `26447bfa76de26a7a4311b104b8bba9b3b3cfb65`,
the five test-only modules moved to `.testkit.ts` with identical bodies.
The app and shared model each exclude that suffix by glob. The guarded
workspace build and import census, including the two existing built kits,
passed 27 checks. The fixture-directory suite passed 16 checks and used the
renamed Vitest setup. Removing either suffix exclusion or reaching a test
kit from the product entry failed the intended assertions.
In clean predecessor and successor builds, all 1,292 distribution artifacts
other than TypeScript's incremental build metadata matched byte for byte.

[Observed] The compiler census enumerated 747 tracked TypeScript files,
including declaration and module variants. The root program covers all 698
paths under its configured source and test-support globs and reaches
`vitest.tiers.ts` through an import. Across the root and ten workspace product
programs, the other 48 paths appear in no program. They comprise 44 retained
evidence files and four Vitest configuration or setup files. The compiler API
and CLI inventories agree on tracked membership for each program. The
[evidence](verification.json) lists the 48 paths and the exact build and
counterfactual subjects.

## Historical evidence tools

- [Observed] The retained [closure probe](../syzygy-bpyt-6-15/closure.mjs)
  imports the built workspace-reach test kit. Its two recorded subjects are
  `bb05df7ea409039c5a6465e7179f9d0c66931ad3` and
  `f207d758eb11830eda2831caa911011e84a966b7`, named in
  [the predecessor record](../syzygy-bpyt-6-15/closure-base.json) and
  [the successor record](../syzygy-bpyt-6-15/closure-head.json). The current
  product build excludes its prerequisite, so replay pertains to those
  recorded commits.
- [Observed] The retained [round-1 mutation tool](../syzygy-bpyt-4-2/tools/mutants_r1.py)
  belongs to the [record at `8fcf409c`](../syzygy-bpyt-4-2/mutants-8fcf409c.json).
  The [round-2 raw review](../../reviews/R-GP-IMPL-SOURCE-RESOLUTION-2-RAW.md)
  records the M5 fragment mismatch at `a607bb62`. The separately captured
  [round-2 census](../source-resolution-review-2026-10-28/r2/mutants-r2-a607bb62.jsonl)
  covers that exact head, with 98 passing control tests and 32 of 32 targeted
  counterfactuals rejected.
