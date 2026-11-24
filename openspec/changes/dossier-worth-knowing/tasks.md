## Delivery

- [x] Draft schema v11 (`worthKnowing` on the Inferred claim-block forms, `worthKnowingNone` on a Pole), the `worth-knowing` check finding and the `field-version` findings for earlier drafts, the count advice on check's report, brief v17, inventory schema v2 and inventory brief v4, and the callout in the renderer (`apps/three-surface-poc/src/polaris-generation/dossier-site.ts`), with no script and no new style rule (commit `a4289a81`).
- [x] Literal tests in `packages/polaris-dossier/src/` (`draft-schema.test.ts`, `check.test.ts`, `reader-standards.test.ts`, `render.test.ts`, `brief.test.ts`, `inventory.test.ts`); provider golden unchanged.
- [x] Seven stored runs' drafts re-rendered at `main` `e741fa2f` and at `a4289a81`: every file of every site identical, 7 of 7 (`docs/evidence/syzygy-5dhm-41/worth-knowing-rerender-2026-11-24.json`).
- [x] A recorded rule-6 mutation run over the new predicates (`docs/evidence/syzygy-5dhm-41/worth-knowing-mutation-2026-11-24.json`, MUTATION_RESULT).
- [x] Draft the complete MODIFIED REQ-polaris-generation-034 on the version 2.22 text by an anchored script, and generate its semantic delta from the bytes.
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases (`worth_cases`).
- [ ] Append the agent-adoption row naming the installing commit.
- [ ] Create the version tag `polaris-dossier-worth-knowing-v2.23` at the installing commit once it is on the default branch.
- [ ] A run under brief v17, to measure reader share (A-38: [Unknown] until then).
