# dossier-figure-kinds

[Inferred] Candidate version 2.5 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 that adds two figure kinds with records and layouts of their own (bead syzygy-3efd.30, pursuit 2026-11-21 Q6 slice 2). Draft schema `polaris-dossier-local-draft-v7` lets a diagram be a `sequence` (participants and the messages they exchange in order) or a `swimlane` (lanes and the steps they do in order); each has its own pure layout that fits the 1440 px column by construction, and shows, where its box is narrower than its drawing, a numbered list in its place by CSS alone, so a swimlane reads as a numbered stepper on a phone. Brief `polaris-dossier-brief-v12` issues the schema. Graph diagrams and the provider mode keep their findings and bytes, and so do drafts of schema v6 or earlier except for `field-version` findings for the new kinds and members. It binds nothing until its row in [AGENT-ADOPTIONS.md](../../../.syzygy/governance/decisions/AGENT-ADOPTIONS.md) and the tag `polaris-dossier-figure-kinds-v2.5`; adoption state is read from that ledger and from `PROJECT-STATUS.md`, never from this page.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The decisions the bead left open, the names fixed for the implementation, and the review's dispositions |
| `SEMANTIC-DELTA.md` | Exactly what changes against the effective version 2.4 text, with displaced lines quoted |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); unchanged from version 2.4 |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.4 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.4's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.4 text as effective again.
