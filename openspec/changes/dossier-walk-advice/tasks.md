## Delivery

- [x] Read 2.33 (figure advice), 2.35 (base elements and screening of details), 2.37 (`choiceFloor` on the report for existing schemas), 2.40 (walks, steps, labels) and 2.50 (view levels and zoom links).
- [x] Draft the complete MODIFIED REQ-polaris-generation-034 on the version 2.50 text (view levels) by an anchored script (`docs/evidence/syzygy-3efd-35/walk_advice_build_spec.py`), and generate its semantic delta from the bytes (`walk_advice_delta.py`); check each scenario's verdict by a reference reading of the rule (`restates_reference.py`).
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases (`walkadv_cases`).
- [ ] Append the agent-adoption row naming the installing commit, with its revert command (A-275).
- [ ] Create the version tag `polaris-dossier-walk-advice-v2.51` at the installing commit once it is on the default branch.
- [x] One independent fresh-context review (CC-REV-4), arranged by the lead; raw retained (`docs/reviews/syzygy-3efd-35/`), findings dispositioned in `design.md` and repaired.
- [ ] The code change (`design.md` D7): the normalisation, filler list, match and walk traversal, `walkAdvice` on check's report, literal tests with the near miss, the provider golden unchanged, and a rule-6 mutation record.
