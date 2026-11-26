# dossier-coverage-hold

[Inferred] Candidate version 2.28 of the dossier specification line, for bead syzygy-5dhm.29 (pursuit 2026-11-21b, move R4 slice 2): one MODIFIED requirement, REQ-polaris-generation-035, after its version 2.18 text. The fidelity review waits until every listed inventory entry has an outcome: Syzygy issues no fidelity packet while an entry of the inventory of record is neither covered by the draft (the coverage rule of version 2.12) nor recorded in its `inventoryOmissions` with a reason. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-coverage-hold-v2.28`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

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

Keep the adoption row as history and apply its recorded revert. The source contribution includes the census, status and index changes. Append a new row recording the veto. With that row in place, version 2.18 supplies the effective REQ-polaris-generation-035. A new adoption after a veto requires the owner.
