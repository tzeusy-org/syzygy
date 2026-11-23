## Delivery

- [x] Draft the complete MODIFIED REQ-polaris-generation-034 on the version 2.23 text by an anchored script (`docs/evidence/syzygy-3efd-40/figure_plan_build_spec.py`), and generate its semantic delta from the bytes (`figure_plan_delta.py`).
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases (`figplan_cases`).
- [ ] Independent review in fresh context over the spec bytes; retain the raw verbatim and disposition its findings in `design.md`.
- [ ] Choose the version label after a fresh check of tags and agent branches; relabel `2.NN` in the spec, the checker and the index, and re-derive the digest.
- [ ] Append the agent-adoption row naming the installing commit, with its revert command.
- [ ] Create the version tag at the installing commit once it is on the default branch.
- [ ] The code change (`design.md` D8), its tests and its rule-6 mutation record; provider golden unchanged.
