## Delivery

- [x] Read the schema, check, render and brief code each rule is grounded in (`agent/syzygy-3efd.26` at `8c311e17`).
- [x] Draft the complete MODIFIED REQ-polaris-generation-034 on the version 2.14 text, and generate its semantic delta from the bytes.
- [x] Rebuild it as version 2.16 on main's version 2.15 text (index and task routes, A-48), renumbering brief v13 to v14 (`design.md`, "Rebuilt on index and task routes 2.15 as 2.16").
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases (`subsec_cases`).
- [x] One independent fresh-context review (CC-REV-4), raw retained, findings dispositioned (`design.md`, "Review").
- [x] Append the agent-adoption row naming the installing commit (A-50).
- [x] Create the version tag `polaris-dossier-page-subsections-v2.16` at the installing commit once it is on the default branch.
- [x] Schema v8, the `subsection-answer` and `field-version` findings, and the figure-kind version predicate at every site `design.md` D8 names (`packages/polaris-dossier/src/`), with literal-case tests of rule `one-sentence-answer`.
- [x] Subsections, `h3` headings, the on-page contents list and their page-scoped style rules (`apps/three-surface-poc/src/polaris-generation/dossier-site.ts`), with render tests on literal ids, every stored draft re-rendered byte-identical and the provider golden unchanged.
- [x] Brief v14 (`packages/polaris-dossier/src/brief.ts`) and a recorded rule-6 mutation run (`docs/evidence/syzygy-3efd-50/`: 62 of 62 killed at `4c354faf`, 3 equivalents recorded; byte comparison of 18 synthetic v2-v7 variants, 321 files, check records included; every other stored fixture is covered only by the unchanged literal suites and the provider golden's own test, not by that comparison).
