# Dossier hero figure 2.20

## Patterns

- `syzygy-3efd-29/R-HERO-FIGURE-RUNTIME-.*-RAW\.md`
- `syzygy-3efd-29/R-HERO-FIGURE-SPEC-.*-RAW\.md`

## What was under review

[Observed] The first draft of the candidate MODIFIED REQ-polaris-generation-034 in `openspec/changes/dossier-hero-figure/` (draft schema v10 with a required `hero`, a graph-kind overview figure or a declared omission with a reason, the `hero` finding, the hero first in the overview region, brief v16; syzygy-3efd.29), built on relation types 2.19 and bound by the spec digest in the raw's head. The review establishes no adoption.

[Observed] Runtime review covered the schema v10 check, overview layout, separately reviewed omission, withheld draft view, machine projection, and brief v16 implementing the A-54 specification.

## Last verdict of record, and where the findings landed

[Observed] Review 1 records `REVISE` (`syzygy-3efd-29/R-HERO-FIGURE-SPEC-1-RAW.md:3`) with one blocking finding (F1) and six notes (F2 to F7). Every one was repaired or recorded in the spec and the package's files (section "Review" of the package's `design.md` gives each disposition); none was overruled and no confirmation round was run (one non-gating review under D10).

[Observed] Runtime review 1 records `REVISE` (`syzygy-3efd-29/R-HERO-FIGURE-RUNTIME-1-RAW.md:3`) at `ad0b0e16`. A v9 draft carrying `hero` could report an extra relation challenge. The repair keeps the v9 schema finding through relation derivation and replaces it in place before reporting. The regression failed at the earlier source and passed after the repair.

[Observed] Runtime review 2 records `CONFIRM` (`syzygy-3efd-29/R-HERO-FIGURE-RUNTIME-2-RAW.md:3`) at `c41c166f`. It verified the repair with 452 integration tests in a separate locked checkout.

[Observed] The repaired source's Rule 6 run caught 24 injected changes by assertion, including both v9 compatibility predicates. The evidence records the exact source and each injected change. [Mutation record](../evidence/syzygy-3efd-29/hero-mutation-2026-11-23.json)
