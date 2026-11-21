# dossier-coverage-precheck

[Inferred] Candidate version 2.5 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 that adds two things (bead syzygy-5dhm.28, pursuit 2026-11-21b move R4 slice 1). `syzygy dossier check` reports, as advice named `inventoryCoverage`, each entry of the independent inventory of record that no block of the draft covers, by entry identifier and path only, before any reviewer is asked; and a draft in schema `polaris-dossier-local-draft-v5` or later may carry `inventoryOmissions`, the authoring session's justified-omission record, so an entry it leaves out on purpose is not listed. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-coverage-precheck-v2.5`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The decisions the bead left open, the names fixed for the implementation, and the review's dispositions |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective version 2.4 text, with displaced lines quoted |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4) |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` (`coverage_binding`) composes it after version 2.4 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.4's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.4 text as effective again.
