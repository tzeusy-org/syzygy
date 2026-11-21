# dossier-ledger-packs-thesis

[Inferred] Candidate version 2.4 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 that adds three things (beads syzygy-3efd.21, syzygy-3efd.43 and the thesis-basis rule of syzygy-3efd.56). `syzygy dossier check` keeps a reading ledger per draft revision in its check record and reports its difference from the previous run of the same repository; the technology dimensions the operator-agent brief asks for come from versioned shape packs selected by the pinned tree's traits, a neutral default pack and a server pack that keeps today's brief; and draft schema `polaris-dossier-local-draft-v6` carries `thesisBasis`, so an introduction written from the code where no maintainer states the project's purpose is checked and rendered as Polaris's reading of the code. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-ledger-packs-thesis-v2.4`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The decisions each bead left open, the names fixed for the implementation, and the review's dispositions |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective version 2.3 text, with displaced lines quoted |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4) |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.3 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.3's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.3 text as effective again.
