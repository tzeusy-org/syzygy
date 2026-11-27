## Delivery

- [x] Read the migration paragraph (2.24, as 2.38 narrowed it), the v12 model bounds and the v10 and v11 diagram bounds.
- [x] Draft the complete MODIFIED REQ-polaris-generation-034 on the version 2.40 text (figure walks) by an anchored script (`docs/evidence/syzygy-3efd-87/migration_bounds_build_spec.py`), and generate its semantic delta from the bytes (`migration_bounds_delta.py`).
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases (`migbound_cases`).
- [x] Append the agent-adoption row naming the installing commit, with its revert command (A-272).
- [ ] Create the version tag `polaris-dossier-migration-bounds-v2.41` at the installing commit once it is on the default branch.
- [ ] One independent fresh-context review (CC-REV-4), arranged by the lead; raw retained, findings dispositioned in `design.md`.
- [ ] Confirm the syzygy-3efd.37 test labelled with this bead asserts the `schema` finding at both bounds (`design.md` D5).
