# dossier-coverage-hold

[Inferred] Candidate version 2.27 of the dossier specification line, for bead syzygy-5dhm.29 (pursuit 2026-11-21b, move R4 slice 2): one MODIFIED requirement, REQ-polaris-generation-035, after its version 2.18 text. The fidelity review waits until every listed inventory entry has an outcome: Syzygy issues no fidelity packet while an entry of the inventory of record is neither covered by the draft (the coverage rule of version 2.12) nor recorded in its `inventoryOmissions` with a reason. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-coverage-hold-v2.27`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | Decisions, what the code changes, residuals |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective 035 (version 2.18) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4), the predecessor's 035 warrants unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.18 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, while run-tree read bounds 2.18 is effective and the spec still hashes to the reviewed bytes; until then it is pending.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.18 text of 035 as effective again.
