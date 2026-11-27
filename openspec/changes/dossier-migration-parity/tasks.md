## Delivery

- [x] Read the 2.19 witness order, the 2.24 withheld case and migration parity, and the 2.23 nesting case (`agent/syzygy-3efd.85` over version 2.34).
- [x] Draft the complete MODIFIED REQ-polaris-generation-034 on the version 2.34 text by an anchored script, and generate its semantic delta from the bytes.
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases (`migpar_cases`).
- [x] One independent fresh-context review (CC-REV-4), raw retained, findings dispositioned (`design.md`, "Review").
- [x] Rebuild over the version then in force (choice floor 2.37; first over source-example advice 2.36, withdrawn when 2.37 landed), set the version label 2.38 in place of 2.NN, then append the agent-adoption row naming the installing commit (A-269).
- [ ] Create the version tag `polaris-dossier-migration-parity-v2.38` at the installing commit once it is on the default branch.
- [ ] Confirm the syzygy-3efd.37 migration parity test pins the withheld-end exception, or add one (`design.md` D5).
