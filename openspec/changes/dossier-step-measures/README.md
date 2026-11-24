# dossier-step-measures

[Inferred] Candidate version 2.29 of the dossier specification line: one MODIFIED REQ-polaris-generation-033 that adds one paragraph (bead syzygy-5dhm.25, pursuit 2026-11-21b move R3 slice 1). The Execution Record that `syzygy dossier close` writes carries `stepMeasures`, derived at close from the run's step log: wall time to the close instant, the time to the first draft check, passed draft check, passed inventory check and rendered site, draft and inventory revisions, and fidelity and design review rounds. Every measure is Inferred; one whose rows are missing is Unknown with its reason, never zero. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-step-measures-v2.29`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The decisions the bead left open, and what the agent tool reports about usage |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective version 2.21 text of REQ-033 |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement, built by `docs/evidence/syzygy-5dhm-25/step_measures_build_spec.py` |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4) |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` (`stepm_binding`) composes it after the verify text version 2.21, which last replaced REQ-033, only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the bound bytes; until then it is pending and the effective REQ-033 is version 2.21's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.21 text as effective again.
