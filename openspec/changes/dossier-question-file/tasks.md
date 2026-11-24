## Delivery

- [x] Measure the current MODIFIED REQ-polaris-generation-033 against v2.21 with `docs/evidence/syzygy-5dhm-21/question_file_delta.py`. The semantic delta records the resulting digest and line counts.
- [x] Retain the historical generator `docs/evidence/syzygy-5dhm-21/question_file_build_spec.py` for the superseded `ec39365e…` draft. The later evaluator-custody revision is the checked-in current specification.
- [x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases.
- [x] One independent fresh-reader review (CC-REV-4): `docs/reviews/syzygy-5dhm-21/R-QUESTION-FILE-SPEC-1-RAW.md`, REVISE, eight findings, dispositioned in `design.md`.
- [x] Append the agent-adoption row naming the installing commit (`.syzygy/governance/decisions/AGENT-ADOPTIONS.md`).
- [ ] Create the version tag `polaris-dossier-question-file-v2.27` at the installing commit once it is on the default branch.
- [x] syzygy-5dhm.21: `question-file.ts`, its JSON copy, the brief and profile reading it, the run-record binding and `question-file-hold-out.test.ts`.
- [x] Retain the original rule-6 mutation record for its own subject: `docs/evidence/syzygy-5dhm-21/question-file-mutation-2026-11-25.json`.
