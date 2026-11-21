# dossier-figure-homes-and-fit

[Inferred] Candidate version 2.2 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 that adds draft schema `polaris-dossier-local-draft-v5` (a diagram's `home` is `{"kind": "section" | "deep-dive", "target": <id>}` or `{"kind": "overview"}`; bead syzygy-3efd.18) and figure-fit advice that `syzygy dossier check` writes into its check record as `figureFit` (bead syzygy-3efd.20). It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-figure-homes-and-fit-v2.2`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The schema shape, placement, and what the stylesheet does that the fit rule reads |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective version 2.0 text, with displaced lines quoted |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4) |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.0 (and 2.1 where in force) only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.0's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.0 text as effective again.
