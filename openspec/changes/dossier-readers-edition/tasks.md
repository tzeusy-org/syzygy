## Delivery

- [x] The renderer change (`apps/three-surface-poc/src/polaris-generation/dossier-site.ts`): the fold labelled "About this run", the index after find-by-task in the navigation, the contents page and the reading order, the landing order (commits `3d4a72b0`, `41c4c155`, `f4e04733`).
- [x] One page-class definition, `scripts/dossier_page_classes.json`, read by `scripts/dossier_site_to_text.py` (`--reader`, `other` pages counted apart) and through it `scripts/dossier_pilot_runs.py`, and tied to the fold by `dossier-reader-edition.test.ts` and `render.test.ts`.
- [x] Literal-order tests, the link census (432 of 432 in the fixture) and the disclosure predicate with in-test mutations (`dossier-reader-edition.test.ts`); provider golden unchanged.
- [x] Seven stored runs re-rendered against `main` and measured (`docs/evidence/syzygy-5dhm-136/reader-edition-measurement-2026-11-23.json`), and a recorded rule-6 mutation run (`reader-edition-mutation-2026-11-23.json`).
- [x] Draft the complete MODIFIED REQ-polaris-generation-034 on the version 2.20 text by an anchored script, and generate its semantic delta from the bytes.
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases (`readers_cases`).
- [ ] Append the agent-adoption row naming the installing commit.
- [ ] Create the version tag `polaris-dossier-readers-edition-v2.22` at the installing commit once it is on the default branch.
- [ ] Reader sessions over the reader-form text, to measure reader share (coordinator).
