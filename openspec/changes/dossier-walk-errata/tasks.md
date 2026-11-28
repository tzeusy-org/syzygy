## Delivery

- [x] Read 2.40 (walks, the brief v24 paragraph, the walk layer's style rules), 2.50 (zoom-only pass-through) and 2.51 (walk advice), and the R88 dispositions (notes 3 and 10).
- [x] Draft the complete MODIFIED REQ-polaris-generation-034 on the version 2.51 text (walk advice) by an anchored script (`docs/evidence/syzygy-3efd-90/walk_errata_build_spec.py`), which asserts the corrected quotation equals `WALK_PARAGRAPH`, and generate its semantic delta from the bytes (`walk_errata_delta.py`).
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases (`walkerr_cases`).
- [x] Append the agent-adoption row naming the installing commit, with its revert command (A-344).
- [ ] Create the version tag `polaris-dossier-walk-errata-v2.53` at the installing commit once it is on the default branch.
- [ ] One independent fresh-context review (CC-REV-4), arranged by the lead; raw retained (`docs/reviews/syzygy-3efd-90/`), findings dispositioned in `design.md` and repaired.
