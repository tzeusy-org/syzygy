## Delivery

- [x] Draft the complete MODIFIED REQ-polaris-generation-034 on the version 2.33 text (figure plan) by an anchored script (`docs/evidence/syzygy-3efd-32/walk_build_spec.py`), and generate its semantic delta from the bytes (`walk_delta.py`).
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases (`walk_cases`).
- [x] Independent review in fresh context; raw retained verbatim, findings dispositioned in `design.md`.
- [x] Rebuild over the newest REQ-034 (import facts 2.39), fix the label and the schema and brief numbers in the build script (2.40, v16, v24), add the base-element step, and regenerate the delta; the checker, index and digest follow (`walk_rebuild_diff.py` lists every difference from the reviewed edits).
- [ ] Append the agent-adoption row naming the installing commit, with its revert command.
- [ ] Create the version tag at the installing commit once it is on the default branch.
- [ ] The code change (`design.md` D8), its tests and its rule-6 mutation record; `svg-inert` tests and the provider golden unchanged.
