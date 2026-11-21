## Delivery

- [x] Draft the complete MODIFIED REQ-polaris-generation-034 and its semantic delta.
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases.
- [x] One independent fresh-reader review (CC-REV-4), raw retained, findings dispositioned.
- [x] Append the agent-adoption row naming the installing commit (A-28).
- [ ] Create the version tag `polaris-dossier-manifest-recognizers-v2.7` at the installing commit once it is on the default branch.
- [ ] syzygy-3efd.25: the five recognizers as pure modules beside `derive.ts`, each with golden fixtures (a workspace, a single package, a malformed file, an empty file) and literal expected facts; the dispositions through the screen and the pinned object reader, one read per file; the `manifestFacts` member in the draft check record; a determinism test and a draft-independence test; a reader double that fails on any read of a withheld, excluded, set-apart or secret-matching path; a recorded mutation run per recognizer under `docs/evidence/`; and the provider, page, `machine.json` and `derived-structure.json` goldens unchanged.
