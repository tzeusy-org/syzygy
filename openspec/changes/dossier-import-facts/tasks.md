## Delivery

- [x] Draft the complete MODIFIED REQ-polaris-generation-034 on the version 2.33 text (figure plan) by an anchored script (`docs/evidence/syzygy-3efd-60/import_facts_build_spec.py`), and generate its semantic delta from the bytes (`import_facts_delta.py`).
- [x] Mark the superseded candidate `polaris-lexical-import-report` with a banner pointing here, leaving its files in place.
- [x] Independent review in fresh context; retain the raw verbatim and disposition its findings in `design.md` (`R-IMPORT-FACTS-SPEC-1`, `REVISE`, all thirteen findings repaired).
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row, placeholder tag) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases (`impfacts_cases`).
- [x] Rebuild over the newest effective REQ-034 and take the next free version number; replace `2.NN` in the spec, the tag and the status prefix, and move the bound digest; record the diff against the reviewed bytes in the adoption evidence (2.39 over migration parity 2.38; `docs/evidence/syzygy-3efd-60/import_facts_rebuild_diff.py`).
- [ ] Append the agent-adoption row naming the installing commit, with its revert command; create the version tag once it is on the default branch.
- [ ] Code, after adoption: a pure TypeScript scanner and an import-facts module beside `packages/polaris-dossier/src/manifest-facts.ts`, wired into the check record and report. Literal golden unit graphs over synthetic workspaces, the comment, string, template and regular-expression non-matches, every disposition and outcome, both read limits and the listing budget. A rule-6 mutation record per predicate. Provider golden unchanged; `npm run check:all`.
- [ ] Measure the scan's time and the member's size on a large synthetic tree and on this repository.
- [ ] Later beads, outside this change: Python as a second language; an `imports` witness row in version 2.19's table reading this member.
