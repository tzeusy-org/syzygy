## Delivery

- [x] Draft schema v13 (`worthKnowing` on the Inferred claim-block forms, `worthKnowingNone` on a Pole), the `worth-knowing` check finding and the `field-version` findings for earlier drafts, the count advice on check's report, brief v19, inventory schema v2 and inventory brief v4, and the callout in the renderer (`apps/three-surface-poc/src/polaris-generation/dossier-site.ts`), with no script and no new style rule (commit `a4289a81`, written as v11 and brief v17, relabelled v13 and brief v19 over main's v10 and brief v16 by the merge `7162dbca`; reverting the implementation is reverting both).
- [x] Schemas v11 and v12, which this code does not implement, are refused as unknown versions, never read as v10 or v13 (`check.test.ts`, `draft-schema.test.ts`).
- [x] Literal tests in `packages/polaris-dossier/src/` (`draft-schema.test.ts`, `check.test.ts`, `reader-standards.test.ts`, `render.test.ts`, `brief.test.ts`, `inventory.test.ts`); provider golden unchanged.
- [x] Seven stored runs' drafts re-rendered at `main` `fb635704` and at `2f00edee`: every file of every site identical, 7 of 7 (`docs/evidence/syzygy-5dhm-41/worth-knowing-rerender-2026-11-24.json`).
- [x] A recorded rule-6 mutation run over the new predicates and the v13 chain (`docs/evidence/syzygy-5dhm-41/worth-knowing-mutation-2026-11-24.json`, at `2f00edee`, 28 mutants: 27 killed, 1 survived. The survivor, `chain-v10-marked` (check reads a v10 draft against a schema whose Inferred forms admit the mark), changes no finding: [Inferred] every `worthKnowing` and `worthKnowingNone` member in a draft before v13 is a `field-version` finding whatever the schema says, and the schema fault at that path is suppressed either way, so the mutant is equivalent in check's output; the v10 schema branch keeps the published v10 form exact and is not otherwise observable).
- [x] Draft the complete MODIFIED REQ-polaris-generation-034 on the version 2.23 text by an anchored script, and generate its semantic delta from the bytes.
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases (`worth_cases`).
- [ ] Append the agent-adoption row naming the installing commit.
- [ ] Create the version tag `polaris-dossier-worth-knowing-v2.25` at the installing commit once it is on the default branch.
- [ ] When 2.23's containment kind is implemented, it joins schema v13 and its paragraph joins brief v19 (`design.md` D2).
- [ ] A run under brief v19, to measure reader share (A-38: [Unknown] until then).
