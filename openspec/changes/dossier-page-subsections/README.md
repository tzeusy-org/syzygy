# dossier-page-subsections

[Inferred] Candidate version 2.15 of the dossier specification line: one MODIFIED REQ-polaris-generation-034 for bead syzygy-3efd.50. It adds draft schema `polaris-dossier-local-draft-v8`, in which a section may carry answer-led subsections, a mechanical one-sentence rule for each answer, third-level headings and an on-page contents list in the renderer, and brief `polaris-dossier-brief-v13`. Drafts without subsections, stored drafts and the provider mode keep their bytes.

| File | What it holds |
|---|---|
| `proposal.md` | Why, what changes, non-goals |
| `design.md` | The choices made and why, the bytes that move, what the code must change, and the review's dispositions |
| `SEMANTIC-DELTA.md` | Exactly what changes against the version 2.14 text, with displaced text quoted (generated from the bytes) |
| `proposed/polaris-generation/spec.md` | The complete MODIFIED requirement |
| `GOVERNING-DEPENDENCIES.json` | The union of its warrants (checked by `scripts/check_spec_reconciliation.py` R4); version 2.14's, unchanged |
| `tasks.md` | Delivery |

[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.14 only once one seven-column ledger row carries its tag, names the installing commit, links the spec at that commit and gives a revert, and the spec still hashes to the reviewed bytes; until then it is pending and the effective REQ-034 is version 2.14's.

## Rollback after a veto

Keep the adoption row as history, revert the commit the row names (its recorded command), revert the row's own commit's census, status and index changes, and append a new row recording the veto; a vetoed change is not adopted again without the owner. With the veto row in place, the checker reads the version 2.14 text as effective again.
