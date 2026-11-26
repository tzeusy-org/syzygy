## Delivery

- [x] Draft the complete MODIFIED REQ-polaris-generation-034 on the version 2.32 text (question-kind floor) by an anchored script (`docs/evidence/syzygy-3efd-40/figure_plan_build_spec.py`), and generate its semantic delta from the bytes (`figure_plan_delta.py`).
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases (`figplan_cases`).
- [x] Independent review in fresh context (review 1, REVISE, over the 2.23-based bytes); raw retained verbatim, findings dispositioned in `design.md`. No review has read the 2.24 or 2.33 rebuilds.
- [x] Label it 2.33 after a fresh check of tags and agent branches (2.25 and 2.26 to 2.32 were taken); the build script writes the label, and the checker, index and digest follow.
- [x] Append the agent-adoption row naming the installing commit, with its revert command.
- [ ] Create the version tag at the installing commit once it is on the default branch.
- [ ] The code change (`design.md` D8), its tests and its rule-6 mutation record; provider golden unchanged.
