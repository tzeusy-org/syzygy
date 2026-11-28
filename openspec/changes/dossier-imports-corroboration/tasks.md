## Delivery

- [x] Read rule `relation-witness` (2.19: rows, eligibility, order, render), the 2.39 `importFacts` member, and the carried scenarios that name `imports`.
- [x] Draft the complete MODIFIED REQ-polaris-generation-034 on the version 2.41 text (migration bounds) as 2.42, rebuilt on the version 2.43 text as 2.44 and on the version 2.44 text (rough-edge markers) as 2.45, by an anchored script (`docs/evidence/syzygy-3efd-86/imports_witness_build_spec.py`), and generate its semantic delta from the bytes (`imports_witness_delta.py`).
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases (`impwit_cases`).
- [x] Append the agent-adoption row naming the installing commit, with its revert command (A-273).
- [ ] Create the version tag `polaris-dossier-imports-corroboration-v2.45` at the installing commit once it is on the default branch.
- [x] One independent fresh-context review (CC-REV-4), arranged by the lead; raw retained (`docs/reviews/syzygy-3efd-86/`), findings dispositioned in `design.md` and repaired.
- [ ] The code change (`design.md` D6), after the 2.39 `importFacts` derivation lands (syzygy-3efd.60 code): `relation-witness.ts`, the renderer and `machine.json`, literal conformance tests and a rule-6 mutation record.
