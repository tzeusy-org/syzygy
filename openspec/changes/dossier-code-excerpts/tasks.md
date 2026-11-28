## Delivery

- [x] Read the rich elements' code excerpt (its citation, read, Unknown and no-read rules), 2.15 (claim-block ids), 2.40 (walks, a step's paragraph, the list as text alternative, page-conditional style), 2.50 (field-version for earlier schemas, brief v25) and 2.53 (walk errata), and the renderer's excerpt (`render.ts`, `dossier-site.ts`).
- [x] Draft the complete MODIFIED REQ-polaris-generation-034 on the version 2.53 text (walk errata) by an anchored script (`docs/evidence/syzygy-3efd-33/code_excerpts_build_spec.py`), and generate its semantic delta from the bytes (`code_excerpts_delta.py`).
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases (`codeex_cases`).
- [x] Append the agent-adoption row naming the installing commit, with its revert command (A-345).
- [ ] Create the version tag `polaris-dossier-code-excerpts-v2.54` at the installing commit once it is on the default branch.
- [ ] One independent fresh-context review (CC-REV-4), arranged by the lead; raw retained (`docs/reviews/syzygy-3efd-33/`), findings dispositioned in `design.md` and repaired.
- [ ] The code change (`design.md` D8): schema v18 and brief v26, the findings, the frame, gutter, bands, sentence and list with no script, the fallback, literal tests and a browser test, the quote-fidelity tests and the provider golden unchanged, and a rule-6 mutation record.
