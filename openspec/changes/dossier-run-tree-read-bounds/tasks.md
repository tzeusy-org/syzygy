# Delivery

- [x] Sweep every whole-file read of the dossier package and the polaris-generation app at `c900e871` (89 sites, two methods), classify each, and record it (`docs/evidence/syzygy-3efd-80/run-tree-read-sweep-2026-11-23.json`).
- [x] Find the requirement that states each in-scope file, and the bound and words of each read.
- [x] Build the three complete MODIFIED requirements from the predecessor bytes at asserted anchors, and the semantic delta.
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row; `treeread_cases` in the selftest) and `scripts/count_polaris_effective_scenarios.py`.
- [x] One independent fresh-reader review (CC-REV-4), raw retained (`docs/reviews/syzygy-3efd-80/R-RUN-TREE-READ-BOUNDS-SPEC-1-RAW.md`, REVISE), all ten findings repaired and dispositioned (`design.md`, "Review").
- [x] Append the agent-adoption row (A-53) naming the installing commit, with the census, `PROJECT-STATUS.md` route and `openspec/README.md` row.
- [ ] Create the version tag `polaris-dossier-run-tree-read-bounds-v2.18` at the installing commit once it is on the default branch.
- [ ] The 40 reads through `readBoundedFile` or `readFileAsSized` under the stated bounds, with outcome tests (FIFO, `/dev/zero` link, directory, at bound, bound + 1, grown after `fstat`) and a recorded rule-6 mutation run (`docs/evidence/syzygy-3efd-80/`).
